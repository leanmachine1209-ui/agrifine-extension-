// AGRITAIRE rules engine — Klondike solitaire with a farming theme.
//
// Foundations are "silos": plant an Ace (seed) and build up by suit to the
// King (harvest). Tableau piles build DOWN in alternating crop colors.
// The engine is pure-ish: moves mutate the passed-in state and report whether
// they happened; callers snapshot state (cloneState) for undo.

import {
  Card,
  Suit,
  SUITS,
  RANK_MAX,
  cropColor,
  createDeck,
  shuffle,
  mulberry32,
} from './cards';

export const TABLEAU_PILES = 7;

export type PileRef =
  | { type: 'stock' }
  | { type: 'waste' }
  | { type: 'foundation'; suit: Suit }
  | { type: 'tableau'; index: number };

export interface Stats {
  moves: number;
  score: number;
  coins: number;
}

export interface GameState {
  stock: Card[];
  waste: Card[];
  foundations: Record<Suit, Card[]>;
  tableau: Card[][];
  stats: Stats;
}

// Reward tuning (the "farming economy").
export const COINS_PER_HARVEST = 5; // each card sent to a silo
export const COINS_SILO_BONUS = 50; // completing a full silo (A→K)
export const SCORE_PER_HARVEST = 10;
export const SCORE_SILO_BONUS = 100;

export function emptyFoundations(): Record<Suit, Card[]> {
  return { corn: [], wheat: [], tomato: [], carrot: [] };
}

/** Deal a fresh Klondike layout from an ordered deck (mutates deck). */
export function deal(deck: Card[]): GameState {
  const tableau: Card[][] = Array.from({ length: TABLEAU_PILES }, () => []);
  for (let col = 0; col < TABLEAU_PILES; col++) {
    for (let row = 0; row <= col; row++) {
      const card = deck.pop()!;
      card.faceUp = row === col; // only the last card of each pile is face up
      tableau[col].push(card);
    }
  }
  const stock = deck.splice(0, deck.length);
  stock.forEach((c) => (c.faceUp = false));
  return {
    stock,
    waste: [],
    foundations: emptyFoundations(),
    tableau,
    stats: { moves: 0, score: 0, coins: 0 },
  };
}

export function newGame(seed?: number): GameState {
  const rng = seed === undefined ? Math.random : mulberry32(seed);
  return deal(shuffle(createDeck(), rng));
}

export function cloneState(state: GameState): GameState {
  return structuredClone(state);
}

// ── Location helpers ──────────────────────────────────────────────────────

function findCard(
  state: GameState,
  cardId: string,
): { ref: PileRef; index: number } | null {
  const wi = state.waste.findIndex((c) => c.id === cardId);
  if (wi !== -1) return { ref: { type: 'waste' }, index: wi };

  for (const suit of SUITS) {
    const fi = state.foundations[suit].findIndex((c) => c.id === cardId);
    if (fi !== -1) return { ref: { type: 'foundation', suit }, index: fi };
  }

  for (let i = 0; i < state.tableau.length; i++) {
    const ti = state.tableau[i].findIndex((c) => c.id === cardId);
    if (ti !== -1) return { ref: { type: 'tableau', index: i }, index: ti };
  }
  return null;
}

function pileArray(state: GameState, ref: PileRef): Card[] {
  switch (ref.type) {
    case 'stock':
      return state.stock;
    case 'waste':
      return state.waste;
    case 'foundation':
      return state.foundations[ref.suit];
    case 'tableau':
      return state.tableau[ref.index];
  }
}

function topOf(cards: Card[]): Card | undefined {
  return cards[cards.length - 1];
}

// ── Validation ────────────────────────────────────────────────────────────

export function canPlaceOnFoundation(card: Card, foundation: Card[]): boolean {
  const top = topOf(foundation);
  if (!top) return card.rank === 1; // only a seed (Ace) starts a silo
  return top.suit === card.suit && card.rank === top.rank + 1;
}

export function canStackOnTableau(moving: Card, destTop: Card | undefined): boolean {
  if (!destTop) return moving.rank === RANK_MAX; // empty plot: King only
  if (!destTop.faceUp) return false;
  return (
    cropColor(moving.suit) !== cropColor(destTop.suit) &&
    moving.rank === destTop.rank - 1
  );
}

/** A face-up run is movable only if it descends in alternating colors. */
function isValidRun(cards: Card[]): boolean {
  for (let i = 0; i < cards.length; i++) {
    if (!cards[i].faceUp) return false;
    if (i > 0 && !canStackOnTableau(cards[i], cards[i - 1])) return false;
  }
  return true;
}

// ── Core move ───────────────────────────────────────────────────────────────

/**
 * Attempt to move the card `cardId` (and, for tableau sources, the valid run
 * above it) onto `to`. Mutates state and returns true on success.
 */
export function attemptMove(state: GameState, cardId: string, to: PileRef): boolean {
  const located = findCard(state, cardId);
  if (!located) return false;
  const { ref: from, index } = located;

  if (from.type === 'stock') return false; // stock cards move only via draw
  if (samePile(from, to)) return false;

  const fromArr = pileArray(state, from);

  // Determine the moving cards.
  let moving: Card[];
  if (from.type === 'tableau') {
    moving = fromArr.slice(index);
    if (!isValidRun(moving)) return false;
  } else {
    // waste / foundation: only the exposed top card is movable
    if (index !== fromArr.length - 1) return false;
    moving = [fromArr[index]];
  }

  // Validate against the destination.
  if (to.type === 'foundation') {
    if (moving.length !== 1) return false;
    if (to.suit !== moving[0].suit) return false;
    if (!canPlaceOnFoundation(moving[0], state.foundations[to.suit])) return false;
  } else if (to.type === 'tableau') {
    if (!canStackOnTableau(moving[0], topOf(state.tableau[to.index]))) return false;
  } else {
    return false; // cannot drop onto stock or waste
  }

  // Commit: detach from source, attach to destination.
  fromArr.splice(index, moving.length);
  pileArray(state, to).push(...moving);

  // Flip a newly exposed tableau card.
  if (from.type === 'tableau') {
    const exposed = topOf(state.tableau[from.index]);
    if (exposed && !exposed.faceUp) exposed.faceUp = true;
  }

  state.stats.moves++;
  if (to.type === 'foundation') {
    state.stats.coins += COINS_PER_HARVEST;
    state.stats.score += SCORE_PER_HARVEST;
    if (state.foundations[to.suit].length === RANK_MAX) {
      state.stats.coins += COINS_SILO_BONUS;
      state.stats.score += SCORE_SILO_BONUS;
    }
  }
  return true;
}

function samePile(a: PileRef, b: PileRef): boolean {
  if (a.type !== b.type) return false;
  if (a.type === 'tableau' && b.type === 'tableau') return a.index === b.index;
  if (a.type === 'foundation' && b.type === 'foundation') return a.suit === b.suit;
  return true;
}

/** Draw one card from stock to waste, or recycle the waste when stock is empty. */
export function drawFromStock(state: GameState): boolean {
  if (state.stock.length > 0) {
    const card = state.stock.pop()!;
    card.faceUp = true;
    state.waste.push(card);
    state.stats.moves++;
    return true;
  }
  if (state.waste.length > 0) {
    while (state.waste.length > 0) {
      const card = state.waste.pop()!;
      card.faceUp = false;
      state.stock.push(card);
    }
    state.stats.moves++;
    return true;
  }
  return false;
}

/** Send a card straight to its silo if legal (used by double-click/tap). */
export function sendToFoundation(state: GameState, cardId: string): boolean {
  const located = findCard(state, cardId);
  if (!located) return false;
  const arr = pileArray(state, located.ref);
  const card = arr[located.index];
  if (!card) return false;
  return attemptMove(state, cardId, { type: 'foundation', suit: card.suit });
}

/** Auto-move every currently reachable card into its silo. Returns moves made. */
export function autoHarvest(state: GameState): number {
  let moved = 0;
  let progress = true;
  while (progress) {
    progress = false;
    const candidates: string[] = [];
    const w = topOf(state.waste);
    if (w) candidates.push(w.id);
    for (const pile of state.tableau) {
      const t = topOf(pile);
      if (t && t.faceUp) candidates.push(t.id);
    }
    for (const id of candidates) {
      if (sendToFoundation(state, id)) {
        moved++;
        progress = true;
      }
    }
  }
  return moved;
}

/**
 * The face-up run that would move if the player grabbed `cardId`, or null if
 * the card is not a legal grab point (face down, buried in waste/foundation,
 * or an invalid tableau run).
 */
export function getMovableCards(state: GameState, cardId: string): Card[] | null {
  const located = findCard(state, cardId);
  if (!located) return null;
  const { ref, index } = located;
  if (ref.type === 'stock') return null;
  const arr = pileArray(state, ref);
  if (ref.type === 'tableau') {
    const run = arr.slice(index);
    return isValidRun(run) ? run : null;
  }
  if (index !== arr.length - 1) return null; // only top of waste/foundation
  return arr[index].faceUp ? [arr[index]] : null;
}

/** Every pile the selected card could legally move to right now. */
export function validTargets(state: GameState, cardId: string): PileRef[] {
  const moving = getMovableCards(state, cardId);
  if (!moving) return [];
  const targets: PileRef[] = [];
  if (moving.length === 1) {
    const suit = moving[0].suit;
    if (canPlaceOnFoundation(moving[0], state.foundations[suit])) {
      targets.push({ type: 'foundation', suit });
    }
  }
  for (let i = 0; i < state.tableau.length; i++) {
    if (canStackOnTableau(moving[0], topOf(state.tableau[i]))) {
      targets.push({ type: 'tableau', index: i });
    }
  }
  return targets;
}

export function isWon(state: GameState): boolean {
  return SUITS.every((s) => state.foundations[s].length === RANK_MAX);
}

/** Fraction (0..1) of the whole farm that has been harvested into silos. */
export function farmGrowth(state: GameState): number {
  const total = SUITS.reduce((sum, s) => sum + state.foundations[s].length, 0);
  return total / (SUITS.length * RANK_MAX);
}

/** Number of fully harvested crops (completed silos). */
export function cropsHarvested(state: GameState): number {
  return SUITS.filter((s) => state.foundations[s].length === RANK_MAX).length;
}
