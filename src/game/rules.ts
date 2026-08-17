// AGRITAIRE rules engine (v7) — vertically aligned suits, collapsing assets.
//
// Four suit columns (Barns / Crops / Tractors / Cattle) stack top-to-bottom.
// Three of the same tier collapse into the next asset: wood barn → steel barn
// → modern barn, compact tractor → utility → combine. Bigger barns hold more
// cattle; bigger tractors lift harvest. Capital assets burn 🌱 tokens each
// operating loan — twice as hard when no crops or cattle are paying for them.
//
// Mini-decks, temperature-gated seeds, Expansion/Boom, Grain Bank, and the
// living herd stay from v6.

import {
  Card,
  Suit,
  SeasonName,
  Tier,
  SEASONS,
  PLACEABLE_SUITS,
  createDeck,
  shuffle,
  mulberry32,
  isInstant,
  isPlaceable,
} from './cards';

export const COLUMN_COUNT = 4;
export const COLUMN_CAP = 6;
export const MERGE_COUNT = 3;
export const MAX_TIER = 3;

export const CATTLE_LIFESPAN = 3;
export const FEED_PER_CATTLE = 1;
export const CATTLE_CASHOUT = 8;
export const HERD_END_BONUS = 4;
export const BASE_CATTLE_CAP = 2;

export const MINI_DECK_SIZE = 5;
export const SEEDS_START = 5;
export const MINI_DECK_COST = 2;
export const SELL_VALUE = 1;
export const INSTANT_SELL_VALUE = 2;
export const HARVEST_SEED_YIELD = 2;
export const BOOM_GRAIN_MAX = 6;

/** Cattle slots (barns) / harvest lift (tractors) by asset tier. */
export const TIER_CAPACITY: Record<Tier, number> = { 1: 1, 2: 3, 3: 6 };

/** Token burn per capital asset per loan. Idle (unpaid) assets pay double. */
export const TIER_BURN: Record<Tier, number> = { 1: 1, 2: 2, 3: 4 };

export type FoldMode = 'grain' | 'cattle';
export type BoomChoice = 'grain' | 'cow';

export interface Column {
  /** Locked suit. `null` = Expansion extra, locks on the first card played. */
  suit: Suit | null;
  cards: Card[];
}

export interface Cattle {
  id: string;
  life: number;
}

export interface BurnReport {
  barns: number;
  tractors: number;
  idleBarns: boolean;
  idleTractors: boolean;
  total: number;
}

export interface GameState {
  deck: Card[];
  hand: Card[];
  seeds: number;
  columns: Column[];
  grain: number;
  herd: Cattle[];
  score: number;
  season: number;
  sold: number;
  cattleCashed: number;
  cattleStarved: number;
  nextCow: number;
  nextMerge: number;
  tokensBurned: number;
  over: boolean;
  failed: boolean;
  rng: () => number;
}

function startingColumns(): Column[] {
  return PLACEABLE_SUITS.map((suit) => ({ suit, cards: [] }));
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
    columns: startingColumns(),
    grain: 0,
    herd: [],
    score: 0,
    season: 1,
    sold: 0,
    cattleCashed: 0,
    cattleStarved: 0,
    nextCow: 0,
    nextMerge: 0,
    tokensBurned: 0,
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

function cardsOfSuit(state: GameState, suit: Suit): Card[] {
  return state.columns.filter((col) => col.suit === suit).flatMap((col) => col.cards);
}

function sumTable(cards: Card[], table: Record<Tier, number>): number {
  return cards.reduce((n, card) => n + table[card.tier], 0);
}

export function barnCapacity(state: GameState): number {
  return BASE_CATTLE_CAP + sumTable(cardsOfSuit(state, 'field'), TIER_CAPACITY);
}

export function tractorPower(state: GameState): number {
  return sumTable(cardsOfSuit(state, 'equipment'), TIER_CAPACITY);
}

export function cattlePaying(state: GameState): boolean {
  return state.herd.length > 0 || cardsOfSuit(state, 'livestock').length > 0;
}

export function cropsPaying(state: GameState): boolean {
  return state.grain > 0 || cardsOfSuit(state, 'seed').length > 0;
}

/** Token burn for barns + tractors this loan. Idle capital pays double. */
export function capitalBurn(state: GameState): BurnReport {
  const barnBase = sumTable(cardsOfSuit(state, 'field'), TIER_BURN);
  const tractorBase = sumTable(cardsOfSuit(state, 'equipment'), TIER_BURN);
  const idleBarns = barnBase > 0 && !cattlePaying(state);
  const idleTractors = tractorBase > 0 && !cropsPaying(state);
  const barns = idleBarns ? barnBase * 2 : barnBase;
  const tractors = idleTractors ? tractorBase * 2 : tractorBase;
  return { barns, tractors, idleBarns, idleTractors, total: barns + tractors };
}

export function loanCost(state: GameState): number {
  return MINI_DECK_COST + capitalBurn(state).total;
}

export function canFold(col: Column, mode: FoldMode): boolean {
  if (col.cards.length === 0) return false;
  if (mode === 'grain') return col.suit === 'seed';
  return col.suit === 'livestock';
}

export function canPlace(card: Card, col: Column, season: SeasonName): boolean {
  if (isInstant(card)) return false;
  if (card.suit === 'seed' && card.season !== season) return false;
  if (col.suit === null && col.cards.length === 0) return isPlaceable(card.suit);
  return col.suit === card.suit;
}

export function anyValidPlacement(state: GameState): boolean {
  const season = currentSeason(state.season);
  return state.hand.some(
    (card) =>
      (card.suit === 'expansion' && state.columns.length < COLUMN_CAP) ||
      card.suit === 'boom' ||
      state.columns.some((col) => canPlace(card, col, season)),
  );
}

export function feedCost(state: GameState): number {
  return state.herd.length * FEED_PER_CATTLE;
}

export function collapseColumn(col: Column, nextId: () => string): void {
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i <= col.cards.length - MERGE_COUNT; i++) {
      const slice = col.cards.slice(i, i + MERGE_COUNT);
      const tier = slice[0].tier;
      if (tier >= MAX_TIER) continue;
      if (!slice.every((c) => c.tier === tier && c.suit === slice[0].suit)) continue;
      const merged: Card = {
        id: nextId(),
        suit: slice[0].suit,
        tier: (tier + 1) as Tier,
      };
      col.cards.splice(i, MERGE_COUNT, merged);
      if (col.suit === null) col.suit = merged.suit;
      changed = true;
      break;
    }
  }
}

function mergeId(state: GameState): string {
  return `merge-${state.nextMerge++}`;
}

export function sellValue(card: Card): number {
  return isInstant(card) ? INSTANT_SELL_VALUE : SELL_VALUE;
}

export function canDrawMiniDeck(state: GameState): boolean {
  return (
    !state.over &&
    state.hand.length === 0 &&
    state.deck.length > 0 &&
    state.seeds >= loanCost(state)
  );
}

export function enforceCapacity(state: GameState): void {
  const cap = barnCapacity(state);
  if (state.herd.length <= cap) return;
  state.herd.sort((a, b) => a.life - b.life);
  const extra = state.herd.length - cap;
  state.cattleStarved += extra;
  state.herd = state.herd.slice(extra);
}

export function advanceHerd(state: GameState): void {
  enforceCapacity(state);
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

function chargeCapitalBurn(state: GameState): void {
  const burn = capitalBurn(state).total;
  if (burn <= 0) return;
  state.seeds -= burn;
  state.tokensBurned += burn;
}

export function drawMiniDeck(state: GameState): boolean {
  if (!canDrawMiniDeck(state)) return false;
  chargeCapitalBurn(state);
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
  } else if (state.seeds < loanCost(state)) {
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

export function placeFromHand(state: GameState, cardId: string, columnIndex: number): boolean {
  if (state.over) return false;
  const idx = handIndex(state, cardId);
  if (idx < 0) return false;
  const col = state.columns[columnIndex];
  if (!col) return false;
  const card = state.hand[idx];
  if (!canPlace(card, col, currentSeason(state.season))) return false;
  col.cards.push(card);
  if (col.suit === null) col.suit = card.suit;
  state.hand.splice(idx, 1);
  collapseColumn(col, () => mergeId(state));
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
  if (state.columns.length >= COLUMN_CAP) return false;
  takeFromHand(state, cardId);
  state.columns.push({ suit: null, cards: [] });
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
    enforceCapacity(state);
  }
  settleHand(state);
  return true;
}

export function foldColumn(state: GameState, columnIndex: number, mode: FoldMode): boolean {
  if (state.over) return false;
  const col = state.columns[columnIndex];
  if (!col || !canFold(col, mode)) return false;

  const value = col.cards.reduce((n, card) => n + card.tier, 0);

  if (mode === 'grain') {
    state.grain += value + tractorPower(state);
    state.seeds += HARVEST_SEED_YIELD;
    state.score += value;
  } else {
    const room = Math.max(0, barnCapacity(state) - state.herd.length);
    const added = Math.min(value, room);
    const overflow = value - added;
    for (let i = 0; i < added; i++) {
      state.herd.push({ id: `cow-${state.nextCow++}`, life: CATTLE_LIFESPAN });
    }
    state.cattleStarved += overflow;
    state.score += added;
  }

  col.cards = [];
  return true;
}

export function isWon(state: GameState): boolean {
  return state.over && !state.failed;
}

export function cardsRemaining(state: GameState): number {
  return state.deck.length + state.hand.length;
}
