import { describe, it, expect } from 'vitest';
import { Card, Suit, createDeck, shuffle, mulberry32 } from './cards';
import {
  GameState,
  Row,
  ROW_COUNT,
  SPOIL_LIMIT,
  SEEDS_START,
  HAND_MAX,
  SEEDS_MAX,
  newGame,
  capacity,
  effectiveTop,
  canPlace,
  canDraw,
  drawCard,
  placeFromHand,
  discardFromHand,
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
    spoiled: 0,
    cattleLost: 0,
    turn: 1,
    over: false,
    failed: false,
    ...overrides,
  };
}

describe('deck', () => {
  it('has 39 ranked cards + 6 wilds', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(45);
    for (const s of ['livestock', 'grain', 'field'] as Suit[]) {
      expect(deck.filter((x) => x.suit === s)).toHaveLength(13);
    }
    expect(deck.filter((x) => x.suit === 'wild')).toHaveLength(6);
  });

  it('seeded shuffle is reproducible', () => {
    const a = shuffle(createDeck(), mulberry32(5)).map((x) => x.id);
    const b = shuffle(createDeck(), mulberry32(5)).map((x) => x.id);
    expect(a).toEqual(b);
  });
});

describe('newGame', () => {
  it('starts with a seed count and one free card', () => {
    const s = newGame(3);
    expect(s.seeds).toBe(SEEDS_START);
    expect(s.hand).toHaveLength(1);
    expect(s.deck).toHaveLength(44);
    expect(cardsRemaining(s)).toBe(45);
  });
});

describe('seed economy', () => {
  it('spends a seed to draw a card into the hand', () => {
    const s = baseState({ deck: [c('field', 2), c('grain', 9)], seeds: 3, hand: [] });
    expect(canDraw(s)).toBe(true);
    expect(drawCard(s)).toBe(true);
    expect(s.seeds).toBe(2);
    expect(s.hand).toHaveLength(1);
  });

  it('cannot draw with no seeds, empty deck, or a full hand', () => {
    expect(canDraw(baseState({ deck: [c('field', 1)], seeds: 0 }))).toBe(false);
    expect(canDraw(baseState({ deck: [], seeds: 3 }))).toBe(false);
    const full = baseState({ deck: [c('field', 1)], seeds: 3, hand: Array(HAND_MAX).fill(c('field', 1)) });
    expect(canDraw(full)).toBe(false);
  });

  it('seeds grow by one each turn and are capped', () => {
    const s = baseState({ hand: [c('field', 5)], deck: [c('grain', 9)], seeds: 3 });
    placeFromHand(s, 'field-5', 0); // a turn passes
    expect(s.seeds).toBe(4);
    const near = baseState({ hand: [c('field', 5)], deck: [c('grain', 9)], seeds: SEEDS_MAX });
    placeFromHand(near, 'field-5', 0);
    expect(near.seeds).toBe(SEEDS_MAX); // capped
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

  it('places a held card and removes it from the hand', () => {
    const s = baseState({ hand: [c('grain', 6), c('field', 1)], deck: [] });
    s.rows[0] = row([c('field', 5)]);
    expect(placeFromHand(s, 'grain-6', 0)).toBe(true);
    expect(s.rows[0].cards.map((x) => x.id)).toEqual(['field-5', 'grain-6']);
    expect(s.hand.map((x) => x.id)).toEqual(['field-1']);
    expect(s.turn).toBe(2);
  });

  it('rejects an illegal placement', () => {
    const s = baseState({ hand: [c('grain', 8)] });
    s.rows[0] = row([c('field', 5)]);
    expect(placeFromHand(s, 'grain-8', 0)).toBe(false);
    expect(s.hand).toHaveLength(1);
  });
});

describe('discard / spoil', () => {
  it('discarding loses the card and advances the turn', () => {
    const s = baseState({ hand: [c('grain', 1)], deck: [c('field', 1)], seeds: 3 });
    expect(discardFromHand(s, 'grain-1')).toBe(true);
    expect(s.spoiled).toBe(1);
    expect(s.hand).toHaveLength(0);
    expect(s.seeds).toBe(4); // grew this turn
  });

  it('too many spoils fails the farm', () => {
    const s = baseState({ hand: [c('grain', 1)], deck: [c('field', 1)], spoiled: SPOIL_LIMIT - 1 });
    discardFromHand(s, 'grain-1');
    expect(s.over).toBe(true);
    expect(s.failed).toBe(true);
  });
});

describe('folding', () => {
  it('needs at least MIN_RUN cards', () => {
    expect(canFold(row([c('grain', 1), c('grain', 2)]))).toBe(false);
    expect(canFold(row([c('grain', 1), c('grain', 2), c('field', 3)]))).toBe(true);
  });

  it('harvest adds grain (+grain bonus) and points (+field bonus)', () => {
    const s = baseState();
    s.rows[0] = row([c('grain', 3), c('grain', 4), c('field', 5)]);
    expect(foldRow(s, 0, 'grain')).toBe(true);
    expect(s.grain).toBe(3 + 2);
    expect(s.score).toBe(3 + 1);
    expect(s.rows[0].cards).toHaveLength(0);
  });

  it('cattle is capped by capacity; grain raises the cap', () => {
    const s = baseState({ grain: 0, herd: 0 });
    s.rows[0] = row([c('livestock', 3), c('field', 4), c('grain', 5)]);
    expect(foldRow(s, 0, 'cattle')).toBe(true);
    expect(s.herd).toBe(2); // capacity 2
    expect(s.cattleLost).toBe(2);
    expect(s.score).toBe(2 * 2 + 1);

    s.grain = 6; // capacity 5
    s.rows[1] = row([c('livestock', 6), c('livestock', 7), c('livestock', 8)]);
    foldRow(s, 1, 'cattle'); // want 6, room 3
    expect(s.herd).toBe(5);
  });
});

describe('capacity + game end', () => {
  it('capacity is base + grain/2', () => {
    expect(capacity(baseState({ grain: 0 }))).toBe(2);
    expect(capacity(baseState({ grain: 6 }))).toBe(5);
  });

  it('awards a herd bonus when nothing is left to play', () => {
    const s = baseState({ hand: [c('field', 1)], deck: [], herd: 3 });
    placeFromHand(s, 'field-1', 0);
    expect(s.over).toBe(true);
    expect(s.failed).toBe(false);
    expect(s.score).toBe(3 * 3);
  });
});
