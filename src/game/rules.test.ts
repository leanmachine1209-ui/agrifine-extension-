import { describe, it, expect } from 'vitest';
import { Card, Suit, createDeck, shuffle, mulberry32 } from './cards';
import {
  GameState,
  Row,
  Cattle,
  ROW_COUNT,
  MINI_DECK_SIZE,
  SEEDS_START,
  MINI_DECK_COST,
  WILD_SELL_VALUE,
  HARVEST_SEED_YIELD,
  CATTLE_LIFESPAN,
  CATTLE_CASHOUT,
  HERD_END_BONUS,
  newGame,
  effectiveTop,
  canPlace,
  feedCost,
  sellValue,
  sellCard,
  canDrawMiniDeck,
  drawMiniDeck,
  advanceHerd,
  placeFromHand,
  canFold,
  foldRow,
  cardsRemaining,
} from './rules';

function c(suit: Suit, rank: number): Card {
  return {
    id: suit === 'wild' ? `wild-${rank}` : `${suit}-${rank}`,
    suit,
    rank: suit === 'wild' ? 0 : rank,
  };
}
function row(cards: Card[]): Row {
  return { cards, base: cards.length ? (cards[0].suit === 'wild' ? 1 : cards[0].rank) : 0 };
}
function cows(...lives: number[]): Cattle[] {
  return lives.map((life, i) => ({ id: `cow-${i}`, life }));
}
function baseState(overrides: Partial<GameState> = {}): GameState {
  return {
    deck: [],
    hand: [],
    seeds: SEEDS_START,
    rows: Array.from({ length: ROW_COUNT }, () => ({ cards: [], base: 0 })),
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
    ...overrides,
  };
}

describe('deck & new game', () => {
  it('has 45 cards; new game deals a free mini-deck', () => {
    expect(createDeck()).toHaveLength(45);
    const s = newGame(3);
    expect(s.hand).toHaveLength(MINI_DECK_SIZE);
    expect(s.seeds).toBe(SEEDS_START);
    expect(s.herd).toHaveLength(0);
    expect(cardsRemaining(s)).toBe(45);
  });

  it('seeded shuffle is reproducible', () => {
    const a = shuffle(createDeck(), mulberry32(9)).map((x) => x.id);
    const b = shuffle(createDeck(), mulberry32(9)).map((x) => x.id);
    expect(a).toEqual(b);
  });
});

describe('placement & selling', () => {
  it('runs ascend by 1; wild fills any slot', () => {
    const r = row([c('field', 5)]);
    expect(effectiveTop(r)).toBe(5);
    expect(canPlace(c('grain', 6), r)).toBe(true);
    expect(canPlace(c('grain', 7), r)).toBe(false);
    expect(canPlace(c('wild', 0), r)).toBe(true);
  });

  it('sells a card for seeds (wild worth more)', () => {
    const s = baseState({ hand: [c('field', 4), c('wild', 1)], deck: [c('grain', 2)], seeds: 5 });
    expect(sellValue(c('wild', 1))).toBe(WILD_SELL_VALUE);
    expect(sellCard(s, 'wild-1')).toBe(true);
    expect(s.seeds).toBe(5 + WILD_SELL_VALUE);
  });
});

describe('mini-deck loans', () => {
  it('draws only when hand empty, deck remains, and affordable', () => {
    expect(canDrawMiniDeck(baseState({ hand: [], deck: [c('grain', 1)], seeds: MINI_DECK_COST }))).toBe(true);
    expect(canDrawMiniDeck(baseState({ hand: [c('grain', 1)], deck: [c('grain', 2)], seeds: 5 }))).toBe(false);
    expect(canDrawMiniDeck(baseState({ hand: [], deck: [c('grain', 1)], seeds: MINI_DECK_COST - 1 }))).toBe(false);
  });

  it('taking the loan spends seeds, bumps the season, and draws', () => {
    const s = baseState({ hand: [], deck: [c('grain', 1), c('field', 2), c('field', 3)], seeds: 5 });
    expect(drawMiniDeck(s)).toBe(true);
    expect(s.seeds).toBe(5 - MINI_DECK_COST);
    expect(s.season).toBe(2);
    expect(s.hand).toHaveLength(3);
  });
});

describe('folding', () => {
  it('needs at least MIN_RUN cards', () => {
    expect(canFold(row([c('grain', 1), c('grain', 2)]))).toBe(false);
    expect(canFold(row([c('grain', 1), c('grain', 2), c('field', 3)]))).toBe(true);
  });

  it('harvest fills the grain bank (+grain bonus) and returns seeds', () => {
    const s = baseState({ seeds: 0 });
    s.rows[0] = row([c('grain', 3), c('grain', 4), c('field', 5)]);
    expect(foldRow(s, 0, 'grain')).toBe(true);
    expect(s.grain).toBe(3 + 2);
    expect(s.seeds).toBe(HARVEST_SEED_YIELD);
    expect(s.score).toBe(3 + 1);
  });

  it('cattle fold adds live animals with a lifespan (no capacity cap)', () => {
    const s = baseState();
    s.rows[0] = row([c('livestock', 3), c('livestock', 4), c('field', 5)]);
    expect(foldRow(s, 0, 'cattle')).toBe(true);
    expect(s.herd).toHaveLength(3 + 2); // len 3 + 2 livestock cards
    expect(s.herd.every((cow) => cow.life === CATTLE_LIFESPAN)).toBe(true);
    expect(s.score).toBe(1); // 1 field bonus; big payoff is at cash-out
  });
});

describe('living herd', () => {
  it('eats grain each season (feedCost)', () => {
    const s = baseState({ grain: 5, herd: cows(2, 2, 2) });
    expect(feedCost(s)).toBe(3);
    advanceHerd(s);
    expect(s.grain).toBe(2); // 5 - 3 fed
    expect(s.herd.every((cow) => cow.life === 1)).toBe(true); // aged
  });

  it('starves animals when grain runs short (feeds those closest to cash-out)', () => {
    const s = baseState({ grain: 1, herd: cows(3, 2, 3) }); // grain feeds only 1
    advanceHerd(s);
    expect(s.cattleStarved).toBe(2);
    expect(s.herd).toHaveLength(1);
    expect(s.herd[0].life).toBe(1); // the life-2 animal was fed and aged to 1
    expect(s.grain).toBe(0);
  });

  it('cashes out big points when an animal reaches end of life', () => {
    const s = baseState({ grain: 10, herd: cows(1, 1) }); // both age to 0 this season
    advanceHerd(s);
    expect(s.cattleCashed).toBe(2);
    expect(s.score).toBe(2 * CATTLE_CASHOUT);
    expect(s.herd).toHaveLength(0);
  });
});

describe('end conditions', () => {
  it('finishing the deck sells surviving cattle for a bonus', () => {
    const s = baseState({ hand: [c('field', 1)], deck: [], herd: cows(2, 2) });
    placeFromHand(s, 'field-1', 0);
    expect(s.over).toBe(true);
    expect(s.failed).toBe(false);
    expect(s.score).toBe(2 * HERD_END_BONUS);
  });

  it('emptying the hand while broke and cards remain = bankruptcy', () => {
    const s = baseState({ hand: [c('field', 1)], deck: [c('grain', 2)], seeds: MINI_DECK_COST - 1 });
    placeFromHand(s, 'field-1', 0);
    expect(s.over).toBe(true);
    expect(s.failed).toBe(true);
  });
});
