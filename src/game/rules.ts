// AGRITAIRE rules engine (v6) — production chains, temperature, living herd.
//
// Cards arrive in MINI-DECKS (a season's hand). The first is free; each later
// one is an OPERATING LOAN paid in 🌱 SEEDS. Place cards on rows as a chain
//   empty → Field → Seed (matching season) → Equipment
// or SELL them for seeds. Livestock extras sit on a completed chain.
// Expansion adds a row; Boom instantly adds grain or a cow.
//
// Folding a completed chain:
//   🌾 Harvest → Grain Bank (+ seeds)
//   🐄 Cattle  → live animals in the Pasture
//
// The HERD eats grain each new season, ages, cashes out, or starves.
// End: deck empty → done; broke with cards remaining → bankrupt.

import {
  Card,
  Suit,
  SeasonName,
  SEASONS,
  createDeck,
  shuffle,
  mulberry32,
  isInstant,
} from './cards';

export const ROW_COUNT = 4;
export const ROW_CAP = 6;

export const CATTLE_LIFESPAN = 3;
export const FEED_PER_CATTLE = 1;
export const CATTLE_CASHOUT = 8;
export const HERD_END_BONUS = 4;

export const MINI_DECK_SIZE = 5;
export const SEEDS_START = 5;
export const MINI_DECK_COST = 2;
export const SELL_VALUE = 1;
export const INSTANT_SELL_VALUE = 2;
export const HARVEST_SEED_YIELD = 2;
export const BOOM_GRAIN_MAX = 6;

export type FoldMode = 'grain' | 'cattle';
export type BoomChoice = 'grain' | 'cow';
export type ChainNeed = 'field' | 'seed' | 'equipment' | 'livestock' | null;

export interface Row {
  cards: Card[];
}

export interface Cattle {
  id: string;
  life: number;
}

export interface GameState {
  deck: Card[];
  hand: Card[];
  seeds: number;
  rows: Row[];
  grain: number;
  herd: Cattle[];
  score: number;
  season: number;
  sold: number;
  cattleCashed: number;
  cattleStarved: number;
  nextCow: number;
  over: boolean;
  failed: boolean;
  rng: () => number;
}

function emptyRows(n: number): Row[] {
  return Array.from({ length: n }, () => ({ cards: [] }));
}

function drawInto(state: GameState, n: number): void {
  for (let i = 0; i < n && state.deck.length > 0; i++) {
    state.hand.push(state.deck.pop()!);
  }
}

export function currentSeason(seasonNumber: number): SeasonName {
  return SEASONS[(seasonNumber - 1 + SEASONS.length * 8) % SEASONS.length];
}

export function newGame(seed?: number): GameState {
  const rng = seed === undefined ? Math.random : mulberry32(seed);
  const state: GameState = {
    deck: shuffle(createDeck(), rng),
    hand: [],
    seeds: SEEDS_START,
    rows: emptyRows(ROW_COUNT),
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
    rng,
  };
  drawInto(state, MINI_DECK_SIZE);
  return state;
}

export function cloneState(state: GameState): GameState {
  const copy = structuredClone(state) as GameState;
  copy.rng = state.rng;
  return copy;
}

// ── Chain placement ───────────────────────────────────────────────────────

export function hasClass(row: Row, suit: Suit): boolean {
  return row.cards.some((c) => c.suit === suit);
}

/** What the row needs next, or 'livestock' when the chain is complete. */
export function nextNeeded(row: Row): ChainNeed {
  if (row.cards.length === 0) return 'field';
  if (!hasClass(row, 'field')) return 'field';
  if (!hasClass(row, 'seed')) return 'seed';
  if (!hasClass(row, 'equipment')) return 'equipment';
  return 'livestock';
}

export function canFold(row: Row): boolean {
  return hasClass(row, 'equipment');
}

export function canPlace(card: Card, row: Row, season: SeasonName): boolean {
  if (isInstant(card)) return false;
  const need = nextNeeded(row);
  if (need === 'field') return card.suit === 'field';
  if (need === 'seed') return card.suit === 'seed' && card.season === season;
  if (need === 'equipment') return card.suit === 'equipment';
  if (need === 'livestock') return card.suit === 'livestock';
  return false;
}

export function anyValidPlacement(state: GameState): boolean {
  const season = currentSeason(state.season);
  return state.hand.some(
    (card) =>
      (card.suit === 'expansion' && state.rows.length < ROW_CAP) ||
      card.suit === 'boom' ||
      state.rows.some((r) => canPlace(card, r, season)),
  );
}

export function feedCost(state: GameState): number {
  return state.herd.length * FEED_PER_CATTLE;
}

// ── Season / mini-deck economy ────────────────────────────────────────────

export function sellValue(card: Card): number {
  return isInstant(card) ? INSTANT_SELL_VALUE : SELL_VALUE;
}

export function canDrawMiniDeck(state: GameState): boolean {
  return (
    !state.over &&
    state.hand.length === 0 &&
    state.deck.length > 0 &&
    state.seeds >= MINI_DECK_COST
  );
}

export function advanceHerd(state: GameState): void {
  if (state.herd.length === 0) return;

  const need = feedCost(state);
  if (state.grain >= need) {
    state.grain -= need;
  } else {
    const fed = Math.floor(state.grain / FEED_PER_CATTLE);
    state.grain -= fed * FEED_PER_CATTLE;
    state.herd.sort((a, b) => a.life - b.life);
    state.cattleStarved += state.herd.length - fed;
    state.herd = state.herd.slice(0, fed);
  }

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
  if (!failed) state.score += state.herd.length * HERD_END_BONUS;
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

function takeFromHand(state: GameState, cardId: string): Card | null {
  const idx = handIndex(state, cardId);
  if (idx < 0) return null;
  const [card] = state.hand.splice(idx, 1);
  return card;
}

export function placeFromHand(state: GameState, cardId: string, rowIndex: number): boolean {
  if (state.over) return false;
  const idx = handIndex(state, cardId);
  if (idx < 0) return false;
  const row = state.rows[rowIndex];
  if (!row) return false;
  const card = state.hand[idx];
  if (!canPlace(card, row, currentSeason(state.season))) return false;
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

export function playExpansion(state: GameState, cardId: string): boolean {
  if (state.over) return false;
  const idx = handIndex(state, cardId);
  if (idx < 0) return false;
  if (state.hand[idx].suit !== 'expansion') return false;
  if (state.rows.length >= ROW_CAP) return false;
  takeFromHand(state, cardId);
  state.rows.push({ cards: [] });
  settleHand(state);
  return true;
}

export function playBoom(state: GameState, cardId: string, choice: BoomChoice): boolean {
  if (state.over) return false;
  const idx = handIndex(state, cardId);
  if (idx < 0) return false;
  if (state.hand[idx].suit !== 'boom') return false;
  takeFromHand(state, cardId);
  if (choice === 'grain') {
    state.grain += 1 + Math.floor(state.rng() * BOOM_GRAIN_MAX);
  } else {
    state.herd.push({ id: `cow-${state.nextCow++}`, life: CATTLE_LIFESPAN });
  }
  settleHand(state);
  return true;
}

// ── Folding ───────────────────────────────────────────────────────────────

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
    const seedBonus = countSuit(row.cards, 'seed');
    state.grain += len + seedBonus;
    state.seeds += HARVEST_SEED_YIELD;
    state.score += len + fieldBonus;
  } else {
    const extras = countSuit(row.cards, 'livestock');
    const count = 1 + extras;
    for (let i = 0; i < count; i++) {
      state.herd.push({ id: `cow-${state.nextCow++}`, life: CATTLE_LIFESPAN });
    }
    state.score += fieldBonus;
  }

  row.cards = [];
  return true;
}

export function isWon(state: GameState): boolean {
  return state.over && !state.failed;
}

export function cardsRemaining(state: GameState): number {
  return state.deck.length + state.hand.length;
}
