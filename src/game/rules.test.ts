import { describe, it, expect } from 'vitest';
import {
  Card,
  Suit,
  createDeck,
  shuffle,
  mulberry32,
} from './cards';
import {
  GameState,
  deal,
  newGame,
  emptyFoundations,
  canPlaceOnFoundation,
  canStackOnTableau,
  attemptMove,
  drawFromStock,
  sendToFoundation,
  autoHarvest,
  isWon,
  farmGrowth,
  cropsHarvested,
  COINS_PER_HARVEST,
  COINS_SILO_BONUS,
} from './rules';

function card(suit: Suit, rank: number, faceUp = true): Card {
  return { id: `${suit}-${rank}`, suit, rank, faceUp };
}

function baseState(overrides: Partial<GameState> = {}): GameState {
  return {
    stock: [],
    waste: [],
    foundations: emptyFoundations(),
    tableau: Array.from({ length: 7 }, () => []),
    stats: { moves: 0, score: 0, coins: 0 },
    ...overrides,
  };
}

describe('deck', () => {
  it('creates 52 unique cards, 13 per suit', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map((c) => c.id)).size).toBe(52);
    for (const suit of ['corn', 'wheat', 'tomato', 'carrot'] as Suit[]) {
      expect(deck.filter((c) => c.suit === suit)).toHaveLength(13);
    }
  });

  it('shuffle is a permutation and is seed-reproducible', () => {
    const a = shuffle(createDeck(), mulberry32(42)).map((c) => c.id);
    const b = shuffle(createDeck(), mulberry32(42)).map((c) => c.id);
    expect(a).toEqual(b);
    expect(new Set(a).size).toBe(52);
  });
});

describe('deal', () => {
  it('lays out 7 tableau piles with only the top card face up', () => {
    const state = deal(createDeck());
    for (let i = 0; i < 7; i++) {
      expect(state.tableau[i]).toHaveLength(i + 1);
      const pile = state.tableau[i];
      expect(pile[pile.length - 1].faceUp).toBe(true);
      expect(pile.slice(0, -1).every((c) => !c.faceUp)).toBe(true);
    }
    expect(state.stock).toHaveLength(52 - 28);
    expect(state.stock.every((c) => !c.faceUp)).toBe(true);
    expect(state.waste).toHaveLength(0);
  });

  it('newGame with a seed is reproducible', () => {
    const s1 = newGame(7);
    const s2 = newGame(7);
    expect(s1.tableau.map((p) => p.map((c) => c.id))).toEqual(
      s2.tableau.map((p) => p.map((c) => c.id)),
    );
  });
});

describe('foundation rules', () => {
  it('empty silo accepts only a seed (Ace)', () => {
    expect(canPlaceOnFoundation(card('corn', 1), [])).toBe(true);
    expect(canPlaceOnFoundation(card('corn', 2), [])).toBe(false);
  });
  it('builds up by same suit', () => {
    const f = [card('corn', 1)];
    expect(canPlaceOnFoundation(card('corn', 2), f)).toBe(true);
    expect(canPlaceOnFoundation(card('wheat', 2), f)).toBe(false);
    expect(canPlaceOnFoundation(card('corn', 3), f)).toBe(false);
  });
});

describe('tableau rules', () => {
  it('empty plot accepts only a King', () => {
    expect(canStackOnTableau(card('corn', 13), undefined)).toBe(true);
    expect(canStackOnTableau(card('corn', 12), undefined)).toBe(false);
  });
  it('stacks descending in alternating colors', () => {
    // corn/wheat = gold, tomato/carrot = red
    expect(canStackOnTableau(card('tomato', 6), card('corn', 7))).toBe(true); // red on gold
    expect(canStackOnTableau(card('wheat', 6), card('corn', 7))).toBe(false); // gold on gold
    expect(canStackOnTableau(card('tomato', 7), card('corn', 7))).toBe(false); // wrong rank
  });
});

describe('attemptMove', () => {
  it('moves a waste seed into its silo and awards coins', () => {
    const state = baseState({ waste: [card('corn', 1)] });
    const ok = attemptMove(state, 'corn-1', { type: 'foundation', suit: 'corn' });
    expect(ok).toBe(true);
    expect(state.foundations.corn).toHaveLength(1);
    expect(state.waste).toHaveLength(0);
    expect(state.stats.coins).toBe(COINS_PER_HARVEST);
    expect(state.stats.moves).toBe(1);
  });

  it('rejects an illegal tableau stack', () => {
    const state = baseState();
    state.tableau[0] = [card('corn', 7)];
    state.tableau[1] = [card('wheat', 6)]; // same color, illegal
    expect(attemptMove(state, 'wheat-6', { type: 'tableau', index: 0 })).toBe(false);
  });

  it('moves a valid multi-card run and flips the exposed card', () => {
    const state = baseState();
    state.tableau[0] = [card('carrot', 5, false), card('corn', 8), card('tomato', 7)];
    state.tableau[1] = [card('carrot', 9)];
    // move corn-8 + tomato-7 (gold,red run) onto carrot-9 (red) -> corn-8 red? corn=gold on carrot=red ok
    const ok = attemptMove(state, 'corn-8', { type: 'tableau', index: 1 });
    expect(ok).toBe(true);
    expect(state.tableau[1].map((c) => c.id)).toEqual(['carrot-9', 'corn-8', 'tomato-7']);
    // exposed carrot-5 should now be face up
    expect(state.tableau[0]).toHaveLength(1);
    expect(state.tableau[0][0].faceUp).toBe(true);
  });
});

describe('stock', () => {
  it('draws to waste then recycles when empty', () => {
    const state = baseState({ stock: [card('corn', 3, false), card('wheat', 4, false)] });
    expect(drawFromStock(state)).toBe(true);
    expect(state.waste).toHaveLength(1);
    expect(state.waste[0].faceUp).toBe(true);
    drawFromStock(state);
    expect(state.stock).toHaveLength(0);
    expect(state.waste).toHaveLength(2);
    // recycle
    expect(drawFromStock(state)).toBe(true);
    expect(state.stock).toHaveLength(2);
    expect(state.waste).toHaveLength(0);
    expect(state.stock.every((c) => !c.faceUp)).toBe(true);
  });
});

describe('harvest + win', () => {
  it('sendToFoundation routes a card to its silo', () => {
    const state = baseState();
    state.foundations.corn = [card('corn', 1)];
    state.tableau[3] = [card('corn', 2)];
    expect(sendToFoundation(state, 'corn-2')).toBe(true);
    expect(state.foundations.corn.map((c) => c.rank)).toEqual([1, 2]);
  });

  it('autoHarvest completes silos, pays the bonus, and wins', () => {
    const state = baseState();
    const suits: Suit[] = ['corn', 'wheat', 'tomato', 'carrot'];
    // Each silo pre-filled A..Q; the four Kings are reachable on tableau tops.
    suits.forEach((s, i) => {
      state.foundations[s] = Array.from({ length: 12 }, (_, r) => card(s, r + 1));
      state.tableau[i] = [card(s, 13)];
    });
    expect(isWon(state)).toBe(false);
    const moved = autoHarvest(state);
    expect(moved).toBe(4);
    expect(isWon(state)).toBe(true);
    expect(cropsHarvested(state)).toBe(4);
    expect(farmGrowth(state)).toBe(1);
    // 4 kings * per-harvest + 4 completion bonuses
    expect(state.stats.coins).toBe(4 * COINS_PER_HARVEST + 4 * COINS_SILO_BONUS);
  });

  it('farmGrowth reflects fraction of cards in silos', () => {
    const state = baseState();
    state.foundations.corn = Array.from({ length: 13 }, (_, r) => card('corn', r + 1));
    expect(farmGrowth(state)).toBeCloseTo(13 / 52);
  });
});
