// AGRITAIRE rules engine (v3) — turn-based sequential stacking with a seed economy.
//
// SEEDS are a numerical resource: you start with a few, they GROW by one every
// turn, and they are SPENT to draw more cards into your hand. So banking seeds
// lets you pull several cards at once for more placement options.
//
// Each card you hold must be placed on one of four rows, which build strictly
// ascending consecutive runs (rank +1); a ⭐ wild fills any slot. Discarding (or
// being unable to place) SPOILS a card — too many spoils and the farm fails.
//
// A row of >=3 cards can be folded:
//   🌾 Harvest → grain bank (grain raises cattle capacity)
//   🐄 Cattle  → cattle for points (2×), capped by preservation capacity
//
// Suit bonuses on fold: grain cards boost harvests, livestock cards boost the
// herd, field cards add bonus points, wilds are flexible filler.

import { Card, Suit, createDeck, shuffle, mulberry32, isWild } from './cards';

export const ROW_COUNT = 4;
export const MIN_RUN = 3;
export const BASE_HERD = 2;
export const GRAIN_PER_CATTLE = 2;
export const SPOIL_LIMIT = 12;
export const HERD_END_BONUS = 3;
export const CATTLE_POINTS = 2;

// Seed economy.
export const SEEDS_START = 3;
export const SEEDS_PER_TURN = 1; // seeds grow each turn
export const DRAW_COST = 1; // seeds spent to draw a card
export const SEEDS_MAX = 12; // cap so seeds don't run away
export const HAND_MAX = 5; // most cards you can hold

export type FoldMode = 'grain' | 'cattle';

export interface Row {
  cards: Card[];
  base: number; // rank of the first card (1 if a wild started the row)
}

export interface GameState {
  deck: Card[]; // face-down draw pile; next card is popped from the end
  hand: Card[]; // cards you hold, drawn by spending seeds
  seeds: number; // draw currency: grows each turn, spent to draw
  rows: Row[];
  grain: number; // preserves cattle (raises capacity)
  herd: number; // preserved cattle
  score: number;
  spoiled: number;
  cattleLost: number; // cattle that could not be preserved (over capacity)
  turn: number;
  over: boolean;
  failed: boolean;
}

function emptyRows(): Row[] {
  return Array.from({ length: ROW_COUNT }, () => ({ cards: [], base: 0 }));
}

export function newGame(seed?: number): GameState {
  const rng = seed === undefined ? Math.random : mulberry32(seed);
  const deck = shuffle(createDeck(), rng);
  const first = deck.pop(); // one free starter card
  return {
    deck,
    hand: first ? [first] : [],
    seeds: SEEDS_START,
    rows: emptyRows(),
    grain: 0,
    herd: 0,
    score: 0,
    spoiled: 0,
    cattleLost: 0,
    turn: 1,
    over: false,
    failed: false,
  };
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

// ── Seed economy / drawing ────────────────────────────────────────────────────

export function canDraw(state: GameState): boolean {
  return (
    !state.over &&
    state.deck.length > 0 &&
    state.hand.length < HAND_MAX &&
    state.seeds >= DRAW_COST
  );
}

/** Spend seeds to draw a card into the hand. */
export function drawCard(state: GameState): boolean {
  if (!canDraw(state)) return false;
  state.seeds -= DRAW_COST;
  state.hand.push(state.deck.pop()!);
  return true;
}

// ── Turn flow ────────────────────────────────────────────────────────────────

function finish(state: GameState, failed: boolean): void {
  if (state.over) return;
  state.over = true;
  state.failed = failed;
  if (!failed) state.score += state.herd * HERD_END_BONUS;
}

/** Advance the turn: seeds grow, and the game ends when nothing is left to play. */
function tickTurn(state: GameState): void {
  state.turn++;
  state.seeds = Math.min(SEEDS_MAX, state.seeds + SEEDS_PER_TURN);
  if (state.deck.length === 0 && state.hand.length === 0) finish(state, false);
}

function handIndex(state: GameState, cardId: string): number {
  return state.hand.findIndex((c) => c.id === cardId);
}

/** Place a held card onto a row. Returns false if illegal. */
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
  tickTurn(state);
  return true;
}

/** Discard a held card — it spoils and is lost. */
export function discardFromHand(state: GameState, cardId: string): boolean {
  if (state.over) return false;
  const idx = handIndex(state, cardId);
  if (idx < 0) return false;
  state.hand.splice(idx, 1);
  state.spoiled++;
  if (state.spoiled >= SPOIL_LIMIT) {
    finish(state, true);
  } else {
    tickTurn(state);
  }
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
