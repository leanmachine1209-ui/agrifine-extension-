// AGRITAIRE rules engine (v2) — a turn-based, sequential stacking game.
//
// Each turn you draw one card into your "hand" and must place it on one of the
// four rows, which build strictly ascending consecutive runs (rank +1). A ⭐
// wild fills any next slot. If the card cannot be placed (or you choose to), it
// SPOILS and is lost — too many spoils and the farm fails.
//
// A row of >=3 cards can be "folded":
//   🌾 Harvest → adds grain to the bank (grain raises cattle capacity)
//   🐄 Cattle  → adds cattle for points (2×), but only up to capacity
//
// Suit bonuses on fold: grain cards boost harvests, livestock cards boost the
// herd, field cards add bonus points, wilds are flexible filler.

import { Card, Suit, createDeck, shuffle, mulberry32, isWild } from './cards';

export const ROW_COUNT = 4;
export const MIN_RUN = 3; // shortest foldable set
export const BASE_HERD = 2; // cattle capacity with zero grain
export const GRAIN_PER_CATTLE = 2; // grain needed for each extra cattle slot
export const SPOIL_LIMIT = 12; // farm fails at this many spoiled cards
export const HERD_END_BONUS = 3; // points per surviving cattle at game end
export const CATTLE_POINTS = 2; // points per cattle banked

export type FoldMode = 'grain' | 'cattle';

export interface Row {
  cards: Card[];
  base: number; // rank of the first card (1 if a wild started the row)
}

export interface GameState {
  deck: Card[]; // face-down draw pile; next card is popped from the end
  hand: Card | null; // the card that must be placed this turn
  rows: Row[];
  grain: number;
  herd: number; // preserved cattle
  score: number;
  spoiled: number;
  cattleLost: number; // cattle that could not be preserved (over capacity)
  turn: number;
  over: boolean;
  failed: boolean; // true when the game ended by too many spoils
}

function emptyRows(): Row[] {
  return Array.from({ length: ROW_COUNT }, () => ({ cards: [], base: 0 }));
}

export function newGame(seed?: number): GameState {
  const rng = seed === undefined ? Math.random : mulberry32(seed);
  const deck = shuffle(createDeck(), rng);
  const state: GameState = {
    deck,
    hand: deck.pop() ?? null,
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
  return state;
}

export function cloneState(state: GameState): GameState {
  return structuredClone(state);
}

// ── Capacity & placement ────────────────────────────────────────────────────

/** Max cattle that can be preserved right now. Grain raises the cap. */
export function capacity(state: GameState): number {
  return BASE_HERD + Math.floor(state.grain / GRAIN_PER_CATTLE);
}

/** Effective top rank of a row (base + length - 1), or null when empty. */
export function effectiveTop(row: Row): number | null {
  return row.cards.length === 0 ? null : row.base + row.cards.length - 1;
}

export function canPlace(card: Card, row: Row): boolean {
  if (row.cards.length === 0) return true; // any card starts a row
  if (isWild(card)) return true; // wild fills the next slot
  const top = effectiveTop(row)!;
  return card.rank === top + 1;
}

export function anyValidPlacement(state: GameState): boolean {
  if (!state.hand) return false;
  return state.rows.some((r) => canPlace(state.hand!, r));
}

/** A row is stuck if the hand cannot go there and it cannot be folded to help. */
export function isStuck(state: GameState): boolean {
  if (!state.hand || state.over) return false;
  if (anyValidPlacement(state)) return false;
  // Folding a row would empty it, letting the hand start there.
  return !state.rows.some((r) => canFold(r));
}

// ── Turn flow ────────────────────────────────────────────────────────────────

function finish(state: GameState, failed: boolean): void {
  if (state.over) return;
  state.over = true;
  state.failed = failed;
  if (!failed) state.score += state.herd * HERD_END_BONUS;
}

function drawNext(state: GameState): void {
  if (state.deck.length > 0) {
    state.hand = state.deck.pop()!;
    state.turn++;
  } else {
    state.hand = null;
    finish(state, false);
  }
}

/** Place the hand onto a row. Returns false if the move is illegal. */
export function placeHand(state: GameState, rowIndex: number): boolean {
  if (state.over || !state.hand) return false;
  const row = state.rows[rowIndex];
  if (!row || !canPlace(state.hand, row)) return false;
  if (row.cards.length === 0) row.base = isWild(state.hand) ? 1 : state.hand.rank;
  row.cards.push(state.hand);
  state.hand = null;
  drawNext(state);
  return true;
}

/** Deliberately (or forcibly) discard the hand — the card is lost. */
export function discardHand(state: GameState): boolean {
  if (state.over || !state.hand) return false;
  state.spoiled++;
  state.hand = null;
  if (state.spoiled >= SPOIL_LIMIT) {
    finish(state, true);
  } else {
    drawNext(state);
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

/**
 * Fold a completed run. Grain harvests raise the grain bank (and cattle cap);
 * cattle banks score double but are capped by preservation capacity.
 */
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
  return state.deck.length + (state.hand ? 1 : 0);
}
