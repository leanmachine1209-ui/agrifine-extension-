// AGRITAIRE rules — solitaire holding set + 14-card field stacks.
//
// Fields (foundations) start empty. A Field card (rank 1) sets the plot;
// the rest of that 14-card suit stacks in order. The holding set is a
// 7-pile Klondike tableau: build down, alternating gold/rust families.

import {
  Card,
  Suit,
  SUITS,
  RANK_MAX,
  FIELD_RANK,
  familyOf,
  createDeck,
  shuffle,
  mulberry32,
} from './cards';

export const HOLDING_PILES = 7;

export type PileRef =
  | { type: 'stock' }
  | { type: 'waste' }
  | { type: 'field'; suit: Suit }
  | { type: 'hold'; index: number };

export interface GameState {
  stock: Card[];
  waste: Card[];
  fields: Record<Suit, Card[]>;
  holding: Card[][];
  moves: number;
  score: number;
  recycled: number;
}

export const SCORE_PER_FIELD_CARD = 10;
export const SCORE_SUIT_BONUS = 100;

export function emptyFields(): Record<Suit, Card[]> {
  return { grain: [], orchard: [], livestock: [], equipment: [] };
}

export function deal(deck: Card[]): GameState {
  const holding: Card[][] = Array.from({ length: HOLDING_PILES }, () => []);
  for (let col = 0; col < HOLDING_PILES; col++) {
    for (let row = 0; row <= col; row++) {
      const card = deck.pop()!;
      card.faceUp = row === col;
      holding[col].push(card);
    }
  }
  const stock = deck.splice(0, deck.length);
  stock.forEach((card) => {
    card.faceUp = false;
  });
  return {
    stock,
    waste: [],
    fields: emptyFields(),
    holding,
    moves: 0,
    score: 0,
    recycled: 0,
  };
}

export function newGame(seed?: number): GameState {
  const rng = seed === undefined ? Math.random : mulberry32(seed);
  return deal(shuffle(createDeck(), rng));
}

export function cloneState(state: GameState): GameState {
  return structuredClone(state);
}

function findCard(state: GameState, cardId: string): { ref: PileRef; index: number } | null {
  const wasteIndex = state.waste.findIndex((card) => card.id === cardId);
  if (wasteIndex !== -1) return { ref: { type: 'waste' }, index: wasteIndex };

  for (const suit of SUITS) {
    const fieldIndex = state.fields[suit].findIndex((card) => card.id === cardId);
    if (fieldIndex !== -1) return { ref: { type: 'field', suit }, index: fieldIndex };
  }

  for (let i = 0; i < state.holding.length; i++) {
    const holdIndex = state.holding[i].findIndex((card) => card.id === cardId);
    if (holdIndex !== -1) return { ref: { type: 'hold', index: i }, index: holdIndex };
  }
  return null;
}

function pileArray(state: GameState, ref: PileRef): Card[] {
  switch (ref.type) {
    case 'stock':
      return state.stock;
    case 'waste':
      return state.waste;
    case 'field':
      return state.fields[ref.suit];
    case 'hold':
      return state.holding[ref.index];
  }
}

export function topOf(cards: Card[]): Card | undefined {
  return cards[cards.length - 1];
}

export function canPlaceOnField(card: Card, field: Card[]): boolean {
  if (field.length === 0) return card.rank === FIELD_RANK;
  const top = topOf(field);
  return Boolean(top && top.suit === card.suit && card.rank === top.rank + 1);
}

export function canStackOnHold(card: Card, destTop: Card | undefined): boolean {
  if (!destTop) return card.rank === RANK_MAX;
  return familyOf(card.suit) !== familyOf(destTop.suit) && card.rank === destTop.rank - 1;
}

export function isValidRun(cards: Card[]): boolean {
  if (cards.length === 0 || cards.some((card) => !card.faceUp)) return false;
  for (let i = 1; i < cards.length; i++) {
    const prev = cards[i - 1];
    const next = cards[i];
    if (familyOf(prev.suit) === familyOf(next.suit)) return false;
    if (next.rank !== prev.rank - 1) return false;
  }
  return true;
}

function samePile(a: PileRef, b: PileRef): boolean {
  if (a.type !== b.type) return false;
  if (a.type === 'hold' && b.type === 'hold') return a.index === b.index;
  if (a.type === 'field' && b.type === 'field') return a.suit === b.suit;
  return true;
}

function flipExposed(state: GameState, ref: PileRef): void {
  if (ref.type !== 'hold') return;
  const top = topOf(state.holding[ref.index]);
  if (top && !top.faceUp) top.faceUp = true;
}

export function getMovableCards(state: GameState, cardId: string): Card[] | null {
  const located = findCard(state, cardId);
  if (!located) return null;
  const { ref, index } = located;
  if (ref.type === 'stock') return null;
  const arr = pileArray(state, ref);
  if (ref.type === 'hold') {
    const run = arr.slice(index);
    return isValidRun(run) ? run : null;
  }
  if (index !== arr.length - 1) return null;
  return arr[index].faceUp ? [arr[index]] : null;
}

export function validTargets(state: GameState, cardId: string): PileRef[] {
  const moving = getMovableCards(state, cardId);
  if (!moving) return [];
  const targets: PileRef[] = [];
  if (moving.length === 1 && canPlaceOnField(moving[0], state.fields[moving[0].suit])) {
    targets.push({ type: 'field', suit: moving[0].suit });
  }
  for (let i = 0; i < state.holding.length; i++) {
    if (canStackOnHold(moving[0], topOf(state.holding[i]))) {
      targets.push({ type: 'hold', index: i });
    }
  }
  return targets;
}

function canMoveTo(state: GameState, moving: Card[], dest: PileRef): boolean {
  if (dest.type === 'stock' || dest.type === 'waste') return false;
  if (dest.type === 'field') {
    return moving.length === 1 && dest.suit === moving[0].suit && canPlaceOnField(moving[0], state.fields[dest.suit]);
  }
  return canStackOnHold(moving[0], topOf(state.holding[dest.index]));
}

export function moveCards(state: GameState, cardId: string, dest: PileRef): boolean {
  const located = findCard(state, cardId);
  if (!located) return false;
  if (samePile(located.ref, dest)) return false;
  const moving = getMovableCards(state, cardId);
  if (!moving) return false;
  if (!canMoveTo(state, moving, dest)) return false;

  const source = pileArray(state, located.ref);
  source.splice(located.index, moving.length);
  pileArray(state, dest).push(...moving);
  flipExposed(state, located.ref);

  if (dest.type === 'field') {
    state.score += SCORE_PER_FIELD_CARD;
    if (state.fields[dest.suit].length === RANK_MAX) state.score += SCORE_SUIT_BONUS;
  }

  state.moves++;
  return true;
}

export function sendToField(state: GameState, cardId: string): boolean {
  const located = findCard(state, cardId);
  if (!located) return false;
  const arr = pileArray(state, located.ref);
  const card = arr[located.index];
  if (!card) return false;
  return moveCards(state, cardId, { type: 'field', suit: card.suit });
}

export function drawFromStock(state: GameState): boolean {
  if (state.stock.length > 0) {
    const card = state.stock.pop()!;
    card.faceUp = true;
    state.waste.push(card);
    state.moves++;
    return true;
  }
  if (state.waste.length > 0) {
    while (state.waste.length > 0) {
      const card = state.waste.pop()!;
      card.faceUp = false;
      state.stock.push(card);
    }
    state.recycled++;
    state.moves++;
    return true;
  }
  return false;
}

export function autoPlayFields(state: GameState): number {
  let moved = 0;
  let progress = true;
  while (progress) {
    progress = false;
    const ids: string[] = [];
    const wasteTop = topOf(state.waste);
    if (wasteTop) ids.push(wasteTop.id);
    for (const pile of state.holding) {
      const top = topOf(pile);
      if (top?.faceUp) ids.push(top.id);
    }
    for (const id of ids) {
      if (sendToField(state, id)) {
        moved++;
        progress = true;
      }
    }
  }
  return moved;
}

export function isWon(state: GameState): boolean {
  return SUITS.every((suit) => state.fields[suit].length === RANK_MAX);
}

export function fieldProgress(state: GameState): number {
  const placed = SUITS.reduce((sum, suit) => sum + state.fields[suit].length, 0);
  return placed / (SUITS.length * RANK_MAX);
}

export function suitsCompleted(state: GameState): number {
  return SUITS.filter((suit) => state.fields[suit].length === RANK_MAX).length;
}

export function cardsInPlay(state: GameState): number {
  return (
    state.stock.length +
    state.waste.length +
    state.holding.reduce((n, pile) => n + pile.length, 0)
  );
}

export function targetKey(ref: PileRef): string {
  if (ref.type === 'field') return `field:${ref.suit}`;
  if (ref.type === 'hold') return `hold:${ref.index}`;
  return ref.type;
}
