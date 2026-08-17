// AGRITAIRE rules — Klondike holding set + leased fields that become farms.
//
// Playing a Field (rank 1) leases that plot. Completing the 14-card suit
// (F → ★) owns the farm and unlocks late-game development. Holding piles
// follow Klondike: build down, alternate families, empty pile takes a ★.

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
export const YARD_PILES = 8;
export const RECALL_AT_OWNED = 1;
export const YARD_AT_OWNED = 2;
export const CREW_AT_OWNED = 3;

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
export const SCORE_DEED = 150;

export type Tenure = 'vacant' | 'leased' | 'owned';

export function fieldTenure(field: Card[]): Tenure {
  if (field.length === 0) return 'vacant';
  if (field.length >= RANK_MAX) return 'owned';
  return 'leased';
}

export function ownedFarms(state: GameState): number {
  return SUITS.filter((suit) => fieldTenure(state.fields[suit]) === 'owned').length;
}

export function leasedFields(state: GameState): number {
  return SUITS.filter((suit) => fieldTenure(state.fields[suit]) === 'leased').length;
}

export function canRecallFromLease(state: GameState): boolean {
  return ownedFarms(state) >= RECALL_AT_OWNED;
}

export function hasYard(state: GameState): boolean {
  return ownedFarms(state) >= YARD_AT_OWNED;
}

export function hasCrew(state: GameState): boolean {
  return ownedFarms(state) >= CREW_AT_OWNED;
}

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
  if (ref.type === 'field') {
    if (fieldTenure(arr) === 'owned') return null;
    if (!canRecallFromLease(state)) return null;
  }
  return arr[index].faceUp ? [arr[index]] : null;
}

export function validTargets(state: GameState, cardId: string): PileRef[] {
  const moving = getMovableCards(state, cardId);
  if (!moving) return [];
  const located = findCard(state, cardId);
  const targets: PileRef[] = [];
  if (located?.ref.type !== 'field' && moving.length === 1 && canPlaceOnField(moving[0], state.fields[moving[0].suit])) {
    targets.push({ type: 'field', suit: moving[0].suit });
  }
  for (let i = 0; i < state.holding.length; i++) {
    if (canStackOnHold(moving[0], topOf(state.holding[i]))) {
      targets.push({ type: 'hold', index: i });
    }
  }
  return targets;
}

function canMoveTo(state: GameState, moving: Card[], dest: PileRef, source: PileRef): boolean {
  if (dest.type === 'stock' || dest.type === 'waste') return false;
  if (dest.type === 'field') {
    if (source.type === 'field') return false;
    return moving.length === 1 && dest.suit === moving[0].suit && canPlaceOnField(moving[0], state.fields[dest.suit]);
  }
  if (source.type === 'field' && !canRecallFromLease(state)) return false;
  return canStackOnHold(moving[0], topOf(state.holding[dest.index]));
}

function syncDevelopment(state: GameState): void {
  if (hasYard(state) && state.holding.length < YARD_PILES) {
    state.holding.push([]);
  }
}

export function moveCards(state: GameState, cardId: string, dest: PileRef): boolean {
  const located = findCard(state, cardId);
  if (!located) return false;
  if (samePile(located.ref, dest)) return false;
  const moving = getMovableCards(state, cardId);
  if (!moving) return false;
  if (!canMoveTo(state, moving, dest, located.ref)) return false;

  const source = pileArray(state, located.ref);
  source.splice(located.index, moving.length);
  pileArray(state, dest).push(...moving);
  flipExposed(state, located.ref);

  if (dest.type === 'field') {
    state.score += SCORE_PER_FIELD_CARD;
    if (fieldTenure(state.fields[dest.suit]) === 'owned') {
      state.score += SCORE_DEED;
      syncDevelopment(state);
    }
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

/** F and 2s always go up. Higher ranks only if opposite-family (rank-1) are already leased that far. */
export function isSafeFieldPlay(state: GameState, card: Card): boolean {
  if (card.rank <= 2) return true;
  const need = card.rank - 1;
  return SUITS.filter((suit) => familyOf(suit) !== familyOf(card.suit)).every(
    (suit) => (topOf(state.fields[suit])?.rank ?? 0) >= need,
  );
}

function fieldCandidates(state: GameState): Card[] {
  const cards: Card[] = [];
  const wasteTop = topOf(state.waste);
  if (wasteTop) cards.push(wasteTop);
  for (const pile of state.holding) {
    const top = topOf(pile);
    if (top?.faceUp) cards.push(top);
  }
  return cards;
}

/** Optimal-play auto: only safe promotions (F, 2, then safe higher ranks). */
export function autoPlayFields(state: GameState): number {
  let moved = 0;
  let progress = true;
  while (progress) {
    progress = false;
    for (const card of fieldCandidates(state)) {
      if (!isSafeFieldPlay(state, card)) continue;
      if (sendToField(state, card.id)) {
        moved++;
        progress = true;
        break;
      }
    }
  }
  return moved;
}

export function developAfterMove(state: GameState): void {
  syncDevelopment(state);
  if (hasCrew(state)) autoPlayFields(state);
}

export function harvestReady(state: GameState): boolean {
  if (topOf(state.waste)?.rank === RANK_MAX) return true;
  return state.holding.some((pile) => topOf(pile)?.rank === RANK_MAX);
}

export function wouldFlip(state: GameState, cardId: string): boolean {
  const located = findCard(state, cardId);
  if (!located || located.ref.type !== 'hold' || located.index === 0) return false;
  return !state.holding[located.ref.index][located.index - 1].faceUp;
}

export function emptiesHold(state: GameState, cardId: string): boolean {
  const located = findCard(state, cardId);
  return Boolean(located && located.ref.type === 'hold' && located.index === 0);
}

export interface Advice {
  text: string;
  cardId?: string;
  dest?: PileRef;
}

function everyMovableId(state: GameState): string[] {
  const ids: string[] = [];
  const wasteTop = topOf(state.waste);
  if (wasteTop) ids.push(wasteTop.id);
  for (const suit of SUITS) {
    const top = topOf(state.fields[suit]);
    if (top) ids.push(top.id);
  }
  for (const pile of state.holding) {
    for (const card of pile) {
      if (card.faceUp) ids.push(card.id);
    }
  }
  return ids;
}

/**
 * Klondike-style advice: flip buried cards first, play F/2, don't vacate
 * a hold without a ★, and only promote mid-ranks when it is safe.
 */
export function advise(state: GameState): Advice {
  const ids = everyMovableId(state);
  const flips: { cardId: string; dest: PileRef }[] = [];
  const leases: { cardId: string; dest: PileRef }[] = [];
  const safe: { cardId: string; dest: PileRef }[] = [];
  const holds: { cardId: string; dest: PileRef }[] = [];

  for (const cardId of ids) {
    const moving = getMovableCards(state, cardId);
    if (!moving) continue;
    for (const dest of validTargets(state, cardId)) {
      if (emptiesHold(state, cardId) && dest.type !== 'hold' && !harvestReady(state)) continue;
      if (wouldFlip(state, cardId)) flips.push({ cardId, dest });
      else if (dest.type === 'field' && moving[0].rank === FIELD_RANK) leases.push({ cardId, dest });
      else if (dest.type === 'field' && isSafeFieldPlay(state, moving[0])) safe.push({ cardId, dest });
      else if (dest.type === 'hold') holds.push({ cardId, dest });
    }
  }

  if (flips[0]) {
    return { text: 'Turn a buried card — that is the best Klondike play.', ...flips[0] };
  }
  if (leases[0]) {
    return { text: 'Lease this Field (F). Aces go up immediately.', ...leases[0] };
  }
  if (safe[0]) {
    return {
      text: safe[0] && getMovableCards(state, safe[0].cardId)?.[0].rank === 2
        ? 'Play the 2 onto the lease. Twos almost never help the holding set.'
        : 'Safe to build the lease — opposite-family ranks below are already up.',
      ...safe[0],
    };
  }
  if (holds[0]) {
    return { text: 'Park it in the holding set. Keep mid-ranks off the lease until they are safe.', ...holds[0] };
  }
  if (state.stock.length || state.waste.length) {
    return { text: 'No improving move. Draw from the stock (or recycle the waste).' };
  }
  return { text: 'No legal play left. Start a new farm, or undo by recalling from a lease if you own one.' };
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
