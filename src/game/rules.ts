// AGRITAIRE rules — Klondike holding set on a circular farm.
//
// Playing a Field (rank 1) picks that land use on a plot: annual crop,
// perennial crop, beef pasture, or dairy barn. Completing the 13-card suit
// owns that farm. Crops and herd overlay in the holding set the way red
// and black do. Herd cards on pasture/barn make manure; manure returns to
// the crop fields. Fourteen event wildcards boost or hinder; hinders
// auto-resolve. The board never grows extra columns.

import {
  Card,
  Suit,
  SUITS,
  CROP_SUITS,
  HERD_SUITS,
  RANK_MAX,
  FIELD_RANK,
  EVENT_COUNT,
  DECK_SIZE,
  familyOf,
  isRanked,
  isEvent,
  isHinder,
  isBoost,
  isCropSuit,
  isHerdSuit,
  createDeck,
  shuffle,
  mulberry32,
  EVENT_INFO,
} from './cards';

export const HOLDING_PILES = 7;
export const RECALL_AT_OWNED = 1;
export const CREW_AT_OWNED = 3;
export const DROUGHT_MOVES = 3;
export const LIEN_MOVES = 4;

export type PileRef =
  | { type: 'stock' }
  | { type: 'waste' }
  | { type: 'field'; suit: Suit }
  | { type: 'hold'; index: number }
  | { type: 'resolved' };

export interface GameState {
  stock: Card[];
  waste: Card[];
  fields: Record<Suit, Card[]>;
  holding: Card[][];
  resolved: Card[];
  manure: number;
  droughtMoves: number;
  lienMoves: number;
  rainSafe: boolean;
  moves: number;
  score: number;
  recycled: number;
}

export const SCORE_PER_FIELD_CARD = 10;
export const SCORE_DEED = 150;
export const SCORE_EVENT = 5;

export type Tenure = 'vacant' | 'leased' | 'owned';
export type MoveOptions = { tallyMoves?: boolean };

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

export function ownedCropFarms(state: GameState): number {
  return CROP_SUITS.filter((suit) => fieldTenure(state.fields[suit]) === 'owned').length;
}

export function ownedHerdFarms(state: GameState): number {
  return HERD_SUITS.filter((suit) => fieldTenure(state.fields[suit]) === 'owned').length;
}

export function canRecallFromLease(state: GameState): boolean {
  return ownedFarms(state) >= RECALL_AT_OWNED && state.lienMoves <= 0;
}

export function hasCrew(state: GameState): boolean {
  return ownedFarms(state) >= CREW_AT_OWNED;
}

export function emptyFields(): Record<Suit, Card[]> {
  return { annual: [], perennial: [], pasture: [], barn: [] };
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
  const state: GameState = {
    stock,
    waste: [],
    fields: emptyFields(),
    holding,
    resolved: [],
    manure: 0,
    droughtMoves: 0,
    lienMoves: 0,
    rainSafe: false,
    moves: 0,
    score: 0,
    recycled: 0,
  };
  autoResolveHinders(state);
  return state;
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
    case 'resolved':
      return state.resolved;
  }
}

export function topOf(cards: Card[]): Card | undefined {
  return cards[cards.length - 1];
}

export function fieldsClosed(state: GameState): boolean {
  return state.droughtMoves > 0 && !state.rainSafe;
}

export function canPlaceOnField(card: Card, field: Card[]): boolean {
  if (!isRanked(card)) return false;
  if (field.length === 0) return card.rank === FIELD_RANK;
  const top = topOf(field);
  return Boolean(top && isRanked(top) && top.suit === card.suit && card.rank === top.rank + 1);
}

export function canStackOnHold(card: Card, destTop: Card | undefined): boolean {
  if (!isRanked(card)) return false;
  if (!destTop) return card.rank === RANK_MAX;
  if (!isRanked(destTop)) return false;
  return familyOf(card.suit) !== familyOf(destTop.suit) && card.rank === destTop.rank - 1;
}

export function isValidRun(cards: Card[]): boolean {
  if (cards.length === 0 || cards.some((card) => !card.faceUp || !isRanked(card))) return false;
  for (let i = 1; i < cards.length; i++) {
    const prev = cards[i - 1];
    const next = cards[i];
    if (!isRanked(prev) || !isRanked(next)) return false;
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

function tickHazards(state: GameState): void {
  if (state.droughtMoves > 0) state.droughtMoves--;
  if (state.lienMoves > 0) state.lienMoves--;
}

function manureForHerdPlay(state: GameState): number {
  return ownedHerdFarms(state) >= 1 ? 2 : 1;
}

function afterFieldPlay(state: GameState, card: Card, suit: Suit): void {
  state.score += SCORE_PER_FIELD_CARD;
  if (isRanked(card) && isHerdSuit(suit)) {
    state.manure += manureForHerdPlay(state);
  }
  if (isRanked(card) && state.rainSafe) {
    state.rainSafe = false;
  }
  if (fieldTenure(state.fields[suit]) === 'owned') {
    state.score += SCORE_DEED;
  }
}

export function getMovableCards(state: GameState, cardId: string): Card[] | null {
  const located = findCard(state, cardId);
  if (!located) return null;
  const { ref, index } = located;
  if (ref.type === 'stock' || ref.type === 'resolved') return null;
  const arr = pileArray(state, ref);
  const card = arr[index];
  if (!card?.faceUp) return null;
  if (isEvent(card)) return null;
  if (ref.type === 'hold') {
    const run = arr.slice(index);
    return isValidRun(run) ? run : null;
  }
  if (index !== arr.length - 1) return null;
  if (ref.type === 'field') {
    if (fieldTenure(arr) === 'owned') return null;
    if (!canRecallFromLease(state)) return null;
  }
  return [card];
}

export function validTargets(state: GameState, cardId: string): PileRef[] {
  const moving = getMovableCards(state, cardId);
  if (!moving || !isRanked(moving[0])) return [];
  const located = findCard(state, cardId);
  const targets: PileRef[] = [];
  const card = moving[0];
  if (
    located?.ref.type !== 'field' &&
    moving.length === 1 &&
    !fieldsClosed(state) &&
    canPlaceOnField(card, state.fields[card.suit])
  ) {
    targets.push({ type: 'field', suit: card.suit });
  }
  for (let i = 0; i < state.holding.length; i++) {
    if (canStackOnHold(card, topOf(state.holding[i]))) {
      targets.push({ type: 'hold', index: i });
    }
  }
  return targets;
}

function canMoveTo(state: GameState, moving: Card[], dest: PileRef, source: PileRef): boolean {
  if (dest.type === 'stock' || dest.type === 'waste' || dest.type === 'resolved') return false;
  if (!isRanked(moving[0])) return false;
  if (dest.type === 'field') {
    if (source.type === 'field') return false;
    if (fieldsClosed(state)) return false;
    return (
      moving.length === 1 &&
      dest.suit === moving[0].suit &&
      canPlaceOnField(moving[0], state.fields[dest.suit])
    );
  }
  if (source.type === 'field' && !canRecallFromLease(state)) return false;
  return canStackOnHold(moving[0], topOf(state.holding[dest.index]));
}

export function moveCards(
  state: GameState,
  cardId: string,
  dest: PileRef,
  options: MoveOptions = {},
): boolean {
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
    afterFieldPlay(state, moving[0], dest.suit);
  }

  if (options.tallyMoves !== false) {
    state.moves++;
    tickHazards(state);
  }
  autoResolveHinders(state);
  return true;
}

export function sendToField(state: GameState, cardId: string, options: MoveOptions = {}): boolean {
  const located = findCard(state, cardId);
  if (!located) return false;
  const arr = pileArray(state, located.ref);
  const card = arr[located.index];
  if (!card || !isRanked(card)) return false;
  return moveCards(state, cardId, { type: 'field', suit: card.suit }, options);
}

function drawOneToWaste(state: GameState): boolean {
  if (state.stock.length === 0) return false;
  const card = state.stock.pop()!;
  card.faceUp = true;
  state.waste.push(card);
  return true;
}

export function drawFromStock(state: GameState): boolean {
  if (drawOneToWaste(state)) {
    state.moves++;
    tickHazards(state);
    autoResolveHinders(state);
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
    tickHazards(state);
    return true;
  }
  return false;
}

/** F and 2s always go up. Higher ranks only if opposite-family ranks below are already leased that far. */
export function isSafeFieldPlay(state: GameState, card: Card): boolean {
  if (!isRanked(card)) return false;
  if (card.rank <= 2) return true;
  const need = card.rank - 1;
  return SUITS.filter((suit) => familyOf(suit) !== familyOf(card.suit)).every((suit) => {
    const top = topOf(state.fields[suit]);
    const rank = top && isRanked(top) ? top.rank : 0;
    return rank >= need;
  });
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

function autoPlayMatching(state: GameState, allow: (card: Card) => boolean): number {
  let moved = 0;
  let progress = true;
  while (progress) {
    progress = false;
    for (const card of fieldCandidates(state)) {
      if (!allow(card)) continue;
      if (sendToField(state, card.id, { tallyMoves: false })) {
        moved++;
        progress = true;
        break;
      }
    }
  }
  return moved;
}

/** Optimal-play auto: only safe promotions (F, 2, then safe higher ranks). */
export function autoPlayFields(state: GameState): number {
  return autoPlayMatching(state, (card) => isRanked(card) && isSafeFieldPlay(state, card));
}

function autoPlayTwos(state: GameState, suits: readonly Suit[]): number {
  const allowed = new Set<Suit>(suits);
  return autoPlayMatching(
    state,
    (card) => isRanked(card) && allowed.has(card.suit) && card.rank <= 2,
  );
}

export function fertilize(state: GameState): boolean {
  if (state.manure < 1) return false;
  state.manure--;
  state.moves++;
  tickHazards(state);
  const promoted = autoPlayMatching(state, (card) => {
    if (!isRanked(card) || !isCropSuit(card.suit)) return false;
    if (card.rank <= 2) return true;
    return isSafeFieldPlay(state, card);
  });
  if (promoted === 0) state.rainSafe = true;
  autoResolveHinders(state);
  return true;
}

function applyEventEffect(state: GameState, card: Card): void {
  if (!isEvent(card)) return;
  switch (card.event) {
    case 'rain':
      state.rainSafe = true;
      break;
    case 'bumper':
      autoPlayTwos(state, SUITS);
      break;
    case 'fair':
      drawOneToWaste(state);
      break;
    case 'drought':
      state.droughtMoves = DROUGHT_MOVES;
      break;
    case 'blight': {
      const suit = SUITS.find((s) => fieldTenure(state.fields[s]) === 'leased' && state.fields[s].length > 0);
      if (!suit) break;
      const top = state.fields[suit].pop();
      if (!top) break;
      top.faceUp = true;
      state.waste.push(top);
      state.score = Math.max(0, state.score - SCORE_PER_FIELD_CARD);
      break;
    }
    case 'storm': {
      const index = state.holding.findIndex((pile) => {
        const top = topOf(pile);
        return Boolean(top?.faceUp && isRanked(top));
      });
      if (index < 0) break;
      const top = state.holding[index].pop();
      if (!top) break;
      top.faceUp = true;
      state.waste.push(top);
      flipExposed(state, { type: 'hold', index });
      break;
    }
    case 'lien':
      state.lienMoves = LIEN_MOVES;
      break;
  }
}

function takeTopEvent(state: GameState, ref: PileRef): Card | undefined {
  const arr = pileArray(state, ref);
  const top = topOf(arr);
  if (!top || !isEvent(top) || !top.faceUp) return undefined;
  return arr.pop();
}

export function autoResolveHinders(state: GameState): void {
  for (let guard = 0; guard < DECK_SIZE; guard++) {
    const wasteTop = topOf(state.waste);
    if (wasteTop && isHinder(wasteTop) && wasteTop.faceUp) {
      const card = takeTopEvent(state, { type: 'waste' });
      if (!card) break;
      applyEventEffect(state, card);
      state.resolved.push(card);
      continue;
    }
    const holdIndex = state.holding.findIndex((pile) => {
      const top = topOf(pile);
      return Boolean(top?.faceUp && isHinder(top));
    });
    if (holdIndex >= 0) {
      const card = takeTopEvent(state, { type: 'hold', index: holdIndex });
      if (!card) break;
      applyEventEffect(state, card);
      state.resolved.push(card);
      flipExposed(state, { type: 'hold', index: holdIndex });
      continue;
    }
    break;
  }
}

export function resolveEvent(state: GameState, cardId: string): boolean {
  const located = findCard(state, cardId);
  if (!located) return false;
  if (located.ref.type !== 'waste' && located.ref.type !== 'hold') return false;
  const arr = pileArray(state, located.ref);
  if (located.index !== arr.length - 1) return false;
  const card = arr[located.index];
  if (!card || !isEvent(card) || !card.faceUp) return false;
  if (isHinder(card)) {
    arr.pop();
    applyEventEffect(state, card);
    state.resolved.push(card);
    flipExposed(state, located.ref);
    autoResolveHinders(state);
    return true;
  }
  arr.pop();
  applyEventEffect(state, card);
  state.resolved.push(card);
  state.score += SCORE_EVENT;
  flipExposed(state, located.ref);
  state.moves++;
  tickHazards(state);
  autoResolveHinders(state);
  return true;
}

export function developAfterMove(state: GameState): void {
  autoResolveHinders(state);
  if (ownedCropFarms(state) >= 1) autoPlayTwos(state, HERD_SUITS);
  if (hasCrew(state)) autoPlayFields(state);
}

export function harvestReady(state: GameState): boolean {
  const wasteTop = topOf(state.waste);
  if (wasteTop && isRanked(wasteTop) && wasteTop.rank === RANK_MAX) return true;
  return state.holding.some((pile) => {
    const top = topOf(pile);
    return Boolean(top && isRanked(top) && top.rank === RANK_MAX);
  });
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
  if (wasteTop && isRanked(wasteTop)) ids.push(wasteTop.id);
  for (const suit of SUITS) {
    const top = topOf(state.fields[suit]);
    if (top && isRanked(top)) ids.push(top.id);
  }
  for (const pile of state.holding) {
    for (const card of pile) {
      if (card.faceUp && isRanked(card)) ids.push(card.id);
    }
  }
  return ids;
}

function faceUpBoost(state: GameState): Card | undefined {
  const wasteTop = topOf(state.waste);
  if (wasteTop && isBoost(wasteTop)) return wasteTop;
  for (const pile of state.holding) {
    const top = topOf(pile);
    if (top && isBoost(top) && top.faceUp) return top;
  }
  return undefined;
}

/**
 * Klondike-style advice: flip buried cards first, play F/2, don't vacate
 * a hold without a ★, and only promote mid-ranks when it is safe.
 */
export function advise(state: GameState): Advice {
  if (isWon(state)) {
    return { text: 'The cycle is closed — every plot is a deed and every event is home.' };
  }
  if (state.droughtMoves > 0 && !state.rainSafe) {
    const boost = faceUpBoost(state);
    if (boost && isEvent(boost) && boost.event === 'rain') {
      return { text: `Drought (${state.droughtMoves}). Tap Rain to open the fields.`, cardId: boost.id };
    }
  }

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
      else if (dest.type === 'field' && isRanked(moving[0]) && moving[0].rank === FIELD_RANK) {
        leases.push({ cardId, dest });
      } else if (dest.type === 'field' && (isSafeFieldPlay(state, moving[0]) || state.rainSafe)) {
        safe.push({ cardId, dest });
      }
      else if (dest.type === 'hold') holds.push({ cardId, dest });
    }
  }

  const tableauBoost = (() => {
    for (const pile of state.holding) {
      const top = topOf(pile);
      if (top && isBoost(top) && top.faceUp) return top;
    }
    return undefined;
  })();

  if (flips[0]) {
    return { text: 'Turn a buried card — that is the best Klondike play.', ...flips[0] };
  }
  if (tableauBoost && isEvent(tableauBoost)) {
    return {
      text: `Tap ${EVENT_INFO[tableauBoost.event].label} to clear the hold — events do not stack.`,
      cardId: tableauBoost.id,
    };
  }
  if (leases[0]) {
    return { text: 'Lease this Field (F). That picks the plot’s land use.', ...leases[0] };
  }
  if (safe[0]) {
    const moving = getMovableCards(state, safe[0].cardId)?.[0];
    return {
      text:
        moving && isRanked(moving) && moving.rank === 2
          ? 'Play the 2 onto the lease. Twos almost never help the holding set.'
          : 'Safe to build the lease — opposite-family ranks below are already up.',
      ...safe[0],
    };
  }
  if (state.manure > 0) {
    return { text: 'Spend manure to fertilize a crop field. The herd feeds the land.' };
  }
  if (holds[0]) {
    return { text: 'Park it in the holding set. Crops overlay the herd, like red on black.', ...holds[0] };
  }
  const wasteBoost = topOf(state.waste);
  if (wasteBoost && isBoost(wasteBoost) && isEvent(wasteBoost)) {
    return {
      text: `Tap ${EVENT_INFO[wasteBoost.event].label}: ${EVENT_INFO[wasteBoost.event].hint}.`,
      cardId: wasteBoost.id,
    };
  }
  if (state.stock.length || state.waste.length) {
    return { text: 'No improving move. Draw from the stock (or recycle the waste).' };
  }
  return { text: 'No legal play left. Start a new farm, or recall from a lease if you own one.' };
}

export function isWon(state: GameState): boolean {
  return (
    SUITS.every((suit) => state.fields[suit].length === RANK_MAX) && state.resolved.length === EVENT_COUNT
  );
}

export function fieldProgress(state: GameState): number {
  const placed = SUITS.reduce((sum, suit) => sum + state.fields[suit].length, 0);
  return (placed + state.resolved.length) / DECK_SIZE;
}

export function suitsCompleted(state: GameState): number {
  return SUITS.filter((suit) => state.fields[suit].length === RANK_MAX).length;
}

export function cardsInPlay(state: GameState): number {
  return (
    state.stock.length +
    state.waste.length +
    state.holding.reduce((n, pile) => n + pile.length, 0) +
    state.resolved.length +
    SUITS.reduce((n, suit) => n + state.fields[suit].length, 0)
  );
}

export function targetKey(ref: PileRef): string {
  if (ref.type === 'field') return `field:${ref.suit}`;
  if (ref.type === 'hold') return `hold:${ref.index}`;
  return ref.type;
}
