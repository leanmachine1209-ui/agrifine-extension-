// AGRITAIRE rules engine (v4) — seasons, mini-decks & operating loans.
//
// Cards arrive in MINI-DECKS (a season's hand). The first mini-deck is free;
// each later one is an OPERATING LOAN paid in 🌱 SEEDS. You either PLACE a card
// on a row (build ascending runs → fold for points) or SELL it for seeds.
//
// When your hand empties:
//   • deck also empty  → the run is over, you're done (season complete).
//   • can't afford the next mini-deck → BANKRUPT (sell earlier next time!).
// Otherwise take the loan to draw the next mini-deck.
//
// Rows build strictly ascending consecutive runs (rank +1); ⭐ wild fills any
// slot. A run of >=3 folds as 🌾 Harvest (grain bank, +seeds) or 🐄 Cattle
// (points ×2, capped by preservation capacity). Grain raises cattle capacity.

import { Card, Suit, createDeck, shuffle, mulberry32, isWild } from './cards';

export const ROW_COUNT = 4;
export const MIN_RUN = 3;
export const BASE_HERD = 2;
export const GRAIN_PER_CATTLE = 2;
export const CATTLE_POINTS = 2;
export const HERD_END_BONUS = 3;

// Seasons & the seed economy.
export const MINI_DECK_SIZE = 5; // cards drawn per season
export const SEEDS_START = 5; // starting operating capital
export const MINI_DECK_COST = 2; // seed loan to draw the next mini-deck
export const SELL_VALUE = 1; // seeds gained selling a ranked card
export const WILD_SELL_VALUE = 2; // wilds are worth more when sold
export const HARVEST_SEED_YIELD = 2; // grain harvest also returns seeds

export type FoldMode = 'grain' | 'cattle';

export interface Row {
  cards: Card[];
  base: number;
}

export interface GameState {
  deck: Card[];
  hand: Card[];
  seeds: number;
  rows: Row[];
  grain: number;
  herd: number;
  score: number;
  season: number;
  sold: number;
  cattleLost: number;
  over: boolean;
  failed: boolean; // ended by bankruptcy rather than finishing the deck
}

function emptyRows(): Row[] {
  return Array.from({ length: ROW_COUNT }, () => ({ cards: [], base: 0 }));
}

function drawInto(state: GameState, n: number): void {
  for (let i = 0; i < n && state.deck.length > 0; i++) {
    state.hand.push(state.deck.pop()!);
  }
}

export function newGame(seed?: number): GameState {
  const rng = seed === undefined ? Math.random : mulberry32(seed);
  const state: GameState = {
    deck: shuffle(createDeck(), rng),
    hand: [],
    seeds: SEEDS_START,
    rows: emptyRows(),
    grain: 0,
    herd: 0,
    score: 0,
    season: 1,
    sold: 0,
    cattleLost: 0,
    over: false,
    failed: false,
  };
  drawInto(state, MINI_DECK_SIZE); // first mini-deck is free
  return state;
}

export function cloneState(state: GameState): GameState {
  return structuredClone(state);
}

// ── Capacity & placement ────────────────────────────────────────────────────

export function capacity(state: GameState): number {
  return BASE_HERD + Math.floor(state.grain / GRAIN_PER_CATTLE);
}

export function effectiveTop(row: Row): number | null {
  return row.cards.length === 0 ? null : row.base + row.cards.length - 1;
}

export function canPlace(card: Card, row: Row): boolean {
  if (row.cards.length === 0) return true;
  if (isWild(card)) return true;
  return card.rank === effectiveTop(row)! + 1;
}

export function anyValidPlacement(state: GameState): boolean {
  return state.hand.some((card) => state.rows.some((r) => canPlace(card, r)));
}

// ── Season / mini-deck economy ────────────────────────────────────────────────

export function sellValue(card: Card): number {
  return isWild(card) ? WILD_SELL_VALUE : SELL_VALUE;
}

export function canDrawMiniDeck(state: GameState): boolean {
  return (
    !state.over &&
    state.hand.length === 0 &&
    state.deck.length > 0 &&
    state.seeds >= MINI_DECK_COST
  );
}

/** Take the operating loan and draw the next mini-deck. */
export function drawMiniDeck(state: GameState): boolean {
  if (!canDrawMiniDeck(state)) return false;
  state.seeds -= MINI_DECK_COST;
  state.season++;
  drawInto(state, MINI_DECK_SIZE);
  return true;
}

function finish(state: GameState, failed: boolean): void {
  if (state.over) return;
  state.over = true;
  state.failed = failed;
  if (!failed) state.score += state.herd * HERD_END_BONUS;
}

/** After the hand changes, settle end-of-season outcomes. */
function settleHand(state: GameState): void {
  if (state.over || state.hand.length > 0) return;
  if (state.deck.length === 0) {
    finish(state, false); // worked the whole deck
  } else if (state.seeds < MINI_DECK_COST) {
    finish(state, true); // can't fund the next season
  }
  // else: wait for the player to take the loan (drawMiniDeck).
}

function handIndex(state: GameState, cardId: string): number {
  return state.hand.findIndex((c) => c.id === cardId);
}

export function placeFromHand(state: GameState, cardId: string, rowIndex: number): boolean {
  if (state.over) return false;
  const idx = handIndex(state, cardId);
  if (idx < 0) return false;
  const row = state.rows[rowIndex];
  if (!row) return false;
  const card = state.hand[idx];
  if (!canPlace(card, row)) return false;
  if (row.cards.length === 0) row.base = isWild(card) ? 1 : card.rank;
  row.cards.push(card);
  state.hand.splice(idx, 1);
  settleHand(state);
  return true;
}

/** Sell a held card for seeds — funds the next operating loan. */
export function sellCard(state: GameState, cardId: string): boolean {
  if (state.over) return false;
  const idx = handIndex(state, cardId);
  if (idx < 0) return false;
  state.seeds += sellValue(state.hand[idx]);
  state.sold++;
  state.hand.splice(idx, 1);
  settleHand(state);
  return true;
}

// ── Folding ──────────────────────────────────────────────────────────────────

export function canFold(row: Row): boolean {
  return row.cards.length >= MIN_RUN;
}

function countSuit(cards: Card[], suit: Suit): number {
  return cards.filter((c) => c.suit === suit).length;
}

export function foldRow(state: GameState, rowIndex: number, mode: FoldMode): boolean {
  if (state.over) return false;
  const row = state.rows[rowIndex];
  if (!row || !canFold(row)) return false;

  const len = row.cards.length;
  const fieldBonus = countSuit(row.cards, 'field');

  if (mode === 'grain') {
    const grainBonus = countSuit(row.cards, 'grain');
    state.grain += len + grainBonus;
    state.seeds += HARVEST_SEED_YIELD; // sell grain for operating capital
    state.score += len + fieldBonus;
  } else {
    const liveBonus = countSuit(row.cards, 'livestock');
    const want = len + liveBonus;
    const room = Math.max(0, capacity(state) - state.herd);
    const added = Math.min(want, room);
    state.herd += added;
    state.cattleLost += want - added;
    state.score += added * CATTLE_POINTS + fieldBonus;
  }

  row.cards = [];
  row.base = 0;
  return true;
}

// ── Queries ──────────────────────────────────────────────────────────────────

export function isWon(state: GameState): boolean {
  return state.over && !state.failed;
}

export function cardsRemaining(state: GameState): number {
  return state.deck.length + state.hand.length;
}
