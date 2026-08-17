import { describe, it, expect } from 'vitest';
import { Card, Suit, createDeck, shuffle, mulberry32 } from './cards';
import {
  GameState,
  Row,
  ROW_COUNT,
  MINI_DECK_SIZE,
  SEEDS_START,
  MINI_DECK_COST,
  WILD_SELL_VALUE,
  HARVEST_SEED_YIELD,
  newGame,
  capacity,
  effectiveTop,
  canPlace,
  sellValue,
  sellCard,
  canDrawMiniDeck,
  drawMiniDeck,
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
function baseState(overrides: Partial<GameState> = {}): GameState {
  return {
    deck: [],
    hand: [],
    seeds: SEEDS_START,
    rows: Array.from({ length: ROW_COUNT }, () => ({ cards: [], base: 0 })),
    grain: 0,
    herd: 0,
    score: 0,
    season: 1,
    sold: 0,
    cattleLost: 0,
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
    expect(s.deck).toHaveLength(45 - MINI_DECK_SIZE);
    expect(s.season).toBe(1);
    expect(cardsRemaining(s)).toBe(45);
  });

  it('seeded shuffle is reproducible', () => {
    const a = shuffle(createDeck(), mulberry32(9)).map((x) => x.id);
    const b = shuffle(createDeck(), mulberry32(9)).map((x) => x.id);
    expect(a).toEqual(b);
  });
});

describe('placement', () => {
  it('empty row accepts anything; runs ascend by 1; wild fills any slot', () => {
    expect(canPlace(c('field', 7), row([]))).toBe(true);
    const r = row([c('field', 5)]);
    expect(effectiveTop(r)).toBe(5);
    expect(canPlace(c('grain', 6), r)).toBe(true);
    expect(canPlace(c('grain', 7), r)).toBe(false);
    expect(canPlace(c('wild', 0), r)).toBe(true);
  });

  it('places a held card onto a row', () => {
    const s = baseState({ hand: [c('grain', 6), c('field', 1)], deck: [c('field', 9)] });
    s.rows[0] = row([c('field', 5)]);
    expect(placeFromHand(s, 'grain-6', 0)).toBe(true);
    expect(s.rows[0].cards.map((x) => x.id)).toEqual(['field-5', 'grain-6']);
    expect(s.hand.map((x) => x.id)).toEqual(['field-1']);
  });
});

describe('selling', () => {
  it('sells a card for seeds (wild worth more)', () => {
    const s = baseState({ hand: [c('field', 4), c('wild', 1)], deck: [c('grain', 2)], seeds: 5 });
    expect(sellValue(c('wild', 1))).toBe(WILD_SELL_VALUE);
    expect(sellCard(s, 'wild-1')).toBe(true);
    expect(s.seeds).toBe(5 + WILD_SELL_VALUE);
    expect(s.sold).toBe(1);
    expect(s.hand.map((x) => x.id)).toEqual(['field-4']);
  });
});

describe('mini-deck loans', () => {
  it('can only draw a mini-deck when hand is empty, deck remains, and affordable', () => {
    expect(canDrawMiniDeck(baseState({ hand: [], deck: [c('grain', 1)], seeds: MINI_DECK_COST }))).toBe(true);
    expect(canDrawMiniDeck(baseState({ hand: [c('grain', 1)], deck: [c('grain', 2)], seeds: 5 }))).toBe(false);
    expect(canDrawMiniDeck(baseState({ hand: [], deck: [c('grain', 1)], seeds: MINI_DECK_COST - 1 }))).toBe(false);
    expect(canDrawMiniDeck(baseState({ hand: [], deck: [], seeds: 5 }))).toBe(false);
  });

  it('taking the loan spends seeds, bumps the season, and draws cards', () => {
    const s = baseState({ hand: [], deck: [c('grain', 1), c('field', 2), c('field', 3)], seeds: 5 });
    expect(drawMiniDeck(s)).toBe(true);
    expect(s.seeds).toBe(5 - MINI_DECK_COST);
    expect(s.season).toBe(2);
    expect(s.hand).toHaveLength(3); // drew what remained (< MINI_DECK_SIZE)
  });
});

describe('end conditions', () => {
  it('finishing the deck ends the run and pays a herd bonus', () => {
    const s = baseState({ hand: [c('field', 1)], deck: [], herd: 3 });
    placeFromHand(s, 'field-1', 0); // hand empties, deck empty -> done
    expect(s.over).toBe(true);
    expect(s.failed).toBe(false);
    expect(s.score).toBe(3 * 3);
  });

  it('emptying the hand while broke and cards remain = bankruptcy', () => {
    const s = baseState({ hand: [c('field', 1)], deck: [c('grain', 2)], seeds: MINI_DECK_COST - 1 });
    placeFromHand(s, 'field-1', 0);
    expect(s.over).toBe(true);
    expect(s.failed).toBe(true);
  });

  it('selling can raise seeds enough to avoid bankruptcy', () => {
    const s = baseState({ hand: [c('field', 1), c('wild', 1)], deck: [c('grain', 2)], seeds: 0 });
    sellCard(s, 'wild-1'); // +2 seeds, hand still has field-1
    expect(s.over).toBe(false);
    placeFromHand(s, 'field-1', 0); // hand empties; seeds(2) >= cost -> not bankrupt, awaiting loan
    expect(s.over).toBe(false);
    expect(canDrawMiniDeck(s)).toBe(true);
  });
});

describe('folding', () => {
  it('needs at least MIN_RUN cards', () => {
    expect(canFold(row([c('grain', 1), c('grain', 2)]))).toBe(false);
    expect(canFold(row([c('grain', 1), c('grain', 2), c('field', 3)]))).toBe(true);
  });

  it('harvest adds grain + seeds + points; capacity is base + grain/2', () => {
    const s = baseState({ seeds: 0 });
    s.rows[0] = row([c('grain', 3), c('grain', 4), c('field', 5)]);
    expect(foldRow(s, 0, 'grain')).toBe(true);
    expect(s.grain).toBe(3 + 2);
    expect(s.seeds).toBe(HARVEST_SEED_YIELD);
    expect(s.score).toBe(3 + 1);
    expect(capacity(s)).toBe(2 + Math.floor(5 / 2));
  });

  it('cattle is capped by capacity', () => {
    const s = baseState({ grain: 0, herd: 0 });
    s.rows[0] = row([c('livestock', 3), c('field', 4), c('grain', 5)]);
    expect(foldRow(s, 0, 'cattle')).toBe(true);
    expect(s.herd).toBe(2);
    expect(s.cattleLost).toBe(2);
    expect(s.score).toBe(2 * 2 + 1);
  });
});
