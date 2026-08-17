import { describe, it, expect } from 'vitest';
import { Card, Suit, createDeck, shuffle, mulberry32 } from './cards';
import {
  GameState,
  Row,
  ROW_COUNT,
  SPOIL_LIMIT,
  newGame,
  capacity,
  effectiveTop,
  canPlace,
  anyValidPlacement,
  placeHand,
  discardHand,
  canFold,
  foldRow,
  cardsRemaining,
} from './rules';

function c(suit: Suit, rank: number): Card {
  return { id: suit === 'wild' ? `wild-${rank}` : `${suit}-${rank}`, suit, rank: suit === 'wild' ? 0 : rank };
}
function row(cards: Card[]): Row {
  return { cards, base: cards.length ? (cards[0].suit === 'wild' ? 1 : cards[0].rank) : 0 };
}
function baseState(overrides: Partial<GameState> = {}): GameState {
  return {
    deck: [],
    hand: null,
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
    expect(new Set(deck.map((x) => x.id)).size).toBe(45);
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
  it('draws a hand and leaves the rest in the deck', () => {
    const s = newGame(3);
    expect(s.hand).not.toBeNull();
    expect(s.deck).toHaveLength(44);
    expect(cardsRemaining(s)).toBe(45);
    expect(s.rows).toHaveLength(4);
    expect(s.rows.every((r) => r.cards.length === 0)).toBe(true);
  });
});

describe('capacity', () => {
  it('is base plus grain/GRAIN_PER_CATTLE', () => {
    expect(capacity(baseState({ grain: 0 }))).toBe(2);
    expect(capacity(baseState({ grain: 4 }))).toBe(4);
    expect(capacity(baseState({ grain: 5 }))).toBe(4);
    expect(capacity(baseState({ grain: 6 }))).toBe(5);
  });
});

describe('placement rules', () => {
  it('empty row accepts anything; runs must ascend by 1', () => {
    expect(canPlace(c('field', 7), row([]))).toBe(true);
    const r = row([c('field', 5)]);
    expect(effectiveTop(r)).toBe(5);
    expect(canPlace(c('grain', 6), r)).toBe(true);
    expect(canPlace(c('grain', 7), r)).toBe(false);
  });

  it('wild fills any next slot', () => {
    const r = row([c('field', 5)]);
    expect(canPlace(c('wild', 0), r)).toBe(true);
  });
});

describe('turn flow', () => {
  it('places the hand, advances the run, and draws the next card', () => {
    const s = baseState({ hand: c('grain', 6), deck: [c('field', 1)] });
    s.rows[0] = row([c('field', 5)]);
    expect(placeHand(s, 0)).toBe(true);
    expect(s.rows[0].cards.map((x) => x.id)).toEqual(['field-5', 'grain-6']);
    expect(s.hand?.id).toBe('field-1'); // next card drawn
    expect(s.deck).toHaveLength(0);
    expect(s.turn).toBe(2);
  });

  it('rejects an illegal placement', () => {
    const s = baseState({ hand: c('grain', 8) });
    s.rows[0] = row([c('field', 5)]);
    expect(placeHand(s, 0)).toBe(false);
    expect(s.hand?.id).toBe('grain-8'); // unchanged
  });

  it('a wild can start a row at rank 1 and be extended by rank 2', () => {
    const s = baseState({ hand: c('wild', 1), deck: [c('field', 2)] });
    placeHand(s, 0); // wild starts row, base 1
    expect(s.rows[0].base).toBe(1);
    expect(placeHand(s, 0)).toBe(true); // field-2 continues
    expect(s.rows[0].cards.map((x) => x.suit)).toEqual(['wild', 'field']);
  });

  it('discarding spoils the hand and draws the next', () => {
    const s = baseState({ hand: c('grain', 1), deck: [c('field', 1)] });
    expect(discardHand(s)).toBe(true);
    expect(s.spoiled).toBe(1);
    expect(s.hand?.id).toBe('field-1');
  });

  it('too many spoils fails the farm', () => {
    const s = baseState({ hand: c('grain', 1), deck: [c('field', 1)], spoiled: SPOIL_LIMIT - 1 });
    discardHand(s);
    expect(s.spoiled).toBe(SPOIL_LIMIT);
    expect(s.over).toBe(true);
    expect(s.failed).toBe(true);
  });

  it('detects stuck hands with no placement and nothing foldable', () => {
    const s = baseState({ hand: c('grain', 9) });
    s.rows.forEach((_, i) => (s.rows[i] = row([c('field', 3)]))); // top 3, need 4; len 1 not foldable
    expect(anyValidPlacement(s)).toBe(false);
    // grain-9 fits nowhere (tops are 3, need 4); no row foldable
    expect(placeHand(s, 0)).toBe(false);
  });
});

describe('folding', () => {
  it('needs at least MIN_RUN cards', () => {
    expect(canFold(row([c('grain', 1), c('grain', 2)]))).toBe(false);
    expect(canFold(row([c('grain', 1), c('grain', 2), c('field', 3)]))).toBe(true);
  });

  it('harvest adds grain (+grain-card bonus) and points (+field bonus)', () => {
    const s = baseState();
    s.rows[0] = row([c('grain', 3), c('grain', 4), c('field', 5)]);
    expect(foldRow(s, 0, 'grain')).toBe(true);
    expect(s.grain).toBe(3 + 2); // len 3 + 2 grain cards
    expect(s.score).toBe(3 + 1); // len 3 + 1 field card
    expect(s.rows[0].cards).toHaveLength(0);
  });

  it('cattle is capped by preservation capacity; grain raises the cap', () => {
    const s = baseState({ grain: 0, herd: 0 });
    s.rows[0] = row([c('livestock', 3), c('field', 4), c('grain', 5)]);
    // want = len 3 + 1 livestock = 4; capacity = 2 -> only 2 preserved
    expect(foldRow(s, 0, 'cattle')).toBe(true);
    expect(s.herd).toBe(2);
    expect(s.cattleLost).toBe(2);
    expect(s.score).toBe(2 * 2 + 1); // 2 cattle *2 + 1 field bonus

    // Harvest grain to raise capacity, then bank more cattle.
    s.grain = 6; // capacity 2 + 3 = 5
    s.rows[1] = row([c('livestock', 6), c('livestock', 7), c('livestock', 8)]);
    foldRow(s, 1, 'cattle'); // want 3 + 3 = 6, room = 5 - 2 = 3
    expect(s.herd).toBe(5);
  });
});

describe('game end', () => {
  it('awards a herd bonus when the deck runs out', () => {
    const s = baseState({ hand: c('field', 1), deck: [], herd: 3 });
    placeHand(s, 0); // consumes hand, deck empty -> game over
    expect(s.over).toBe(true);
    expect(s.failed).toBe(false);
    expect(s.score).toBe(3 * 3); // herd end bonus
  });
});
