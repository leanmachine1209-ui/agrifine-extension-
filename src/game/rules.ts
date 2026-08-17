// AGRITAIRE rules engine (v5) — seasons, mini-deck loans & a LIVING HERD.
//
// Cards arrive in MINI-DECKS (a season's hand). The first is free; each later
// one is an OPERATING LOAN paid in 🌱 SEEDS. Each turn you PLACE a card on a row
// (ascending runs) or SELL it for seeds.
//
// Folding a run (>=3):
//   🌾 Harvest → grain bank (+ seeds). Grain is the Grain Bank: it FEEDS cattle.
//   🐄 Cattle  → adds live animals to your herd.
//
// The HERD is alive: every new season each animal EATS grain (FEED_PER_CATTLE).
// Unfed animals STARVE (lost). Animals AGE, and when their lifespan ends they
// leave the board and CASH OUT for big points. Survivors are sold at game end.
//
// End states: deck empty → season complete; hand empty & can't afford the next
// loan → bankrupt.

import { Card, Suit, createDeck, shuffle, mulberry32, isWild } from './cards';

export const ROW_COUNT = 4;
export const MIN_RUN = 3;

// Living herd.
export const CATTLE_LIFESPAN = 3; // seasons an animal stays before cashing out
export const FEED_PER_CATTLE = 1; // grain eaten per animal per season
export const CATTLE_CASHOUT = 8; // big points when an animal ages out
export const HERD_END_BONUS = 4; // points per surviving animal at game end

// Seasons & the seed economy.
export const MINI_DECK_SIZE = 5;
export const SEEDS_START = 5;
export const MINI_DECK_COST = 2;
export const SELL_VALUE = 1;
export const WILD_SELL_VALUE = 2;
export const HARVEST_SEED_YIELD = 2;

export type FoldMode = 'grain' | 'cattle';

export interface Row {
  cards: Card[];
  base: number;
}

export interface Cattle {
  id: string;
  life: number; // seasons of life remaining
}

export interface GameState {
  deck: Card[];
  hand: Card[];
  seeds: number;
  rows: Row[];
  grain: number; // the Grain Bank — feeds the herd
  herd: Cattle[];
  score: number;
  season: number;
  sold: number;
  cattleCashed: number;
  cattleStarved: number;
  nextCow: number;
  over: boolean;
  failed: boolean;
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
    herd: [],
    score: 0,
    season: 1,
    sold: 0,
    cattleCashed: 0,
    cattleStarved: 0,
    nextCow: 0,
    over: false,
    failed: false,
  };
  drawInto(state, MINI_DECK_SIZE);
  return state;
}

export function cloneState(state: GameState): GameState {
  return structuredClone(state);
}

// ── Placement ─────────────────────────────────────────────────────────────

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

/** Grain the herd will eat next season. */
export function feedCost(state: GameState): number {
  return state.herd.length * FEED_PER_CATTLE;
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

/** Feed, age, cash out, and starve the herd as a new season begins. */
export function advanceHerd(state: GameState): void {
  if (state.herd.length === 0) return;

  // Feed from the Grain Bank; unfed animals starve.
  const need = feedCost(state);
  if (state.grain >= need) {
    state.grain -= need;
  } else {
    const fed = Math.floor(state.grain / FEED_PER_CATTLE);
    state.grain -= fed * FEED_PER_CATTLE;
    state.herd.sort((a, b) => a.life - b.life); // keep animals closest to cashing out
    state.cattleStarved += state.herd.length - fed;
    state.herd = state.herd.slice(0, fed);
  }

  // Age survivors; those that reach the end of life cash out for big points.
  const survivors: Cattle[] = [];
  for (const cow of state.herd) {
    cow.life -= 1;
    if (cow.life <= 0) {
      state.score += CATTLE_CASHOUT;
      state.cattleCashed++;
    } else {
      survivors.push(cow);
    }
  }
  state.herd = survivors;
}

/** Take the operating loan, advance the season (herd feeds/ages), and draw. */
export function drawMiniDeck(state: GameState): boolean {
  if (!canDrawMiniDeck(state)) return false;
  state.seeds -= MINI_DECK_COST;
  state.season++;
  advanceHerd(state);
  drawInto(state, MINI_DECK_SIZE);
  return true;
}

function finish(state: GameState, failed: boolean): void {
  if (state.over) return;
  state.over = true;
  state.failed = failed;
  if (!failed) state.score += state.herd.length * HERD_END_BONUS; // sell survivors
}

function settleHand(state: GameState): void {
  if (state.over || state.hand.length > 0) return;
  if (state.deck.length === 0) {
    finish(state, false);
  } else if (state.seeds < MINI_DECK_COST) {
    finish(state, true);
  }
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
    state.seeds += HARVEST_SEED_YIELD;
    state.score += len + fieldBonus;
  } else {
    const count = len + countSuit(row.cards, 'livestock');
    for (let i = 0; i < count; i++) {
      state.herd.push({ id: `cow-${state.nextCow++}`, life: CATTLE_LIFESPAN });
    }
    state.score += fieldBonus; // real payoff comes when they cash out
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
