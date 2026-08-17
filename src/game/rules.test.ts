import { describe, it, expect } from 'vitest';
import { Card, Suit, RANK_MAX, createDeck, shuffle, mulberry32, rankLabel, isFieldCard } from './cards';
import {
  GameState,
  HOLDING_PILES,
  newGame,
  deal,
  canPlaceOnField,
  canStackOnHold,
  isValidRun,
  getMovableCards,
  validTargets,
  moveCards,
  sendToField,
  drawFromStock,
  autoPlayFields,
  isWon,
  topOf,
  emptyFields,
} from './rules';

function card(suit: Suit, rank: number, faceUp = true): Card {
  return { id: `${suit}-${rank}`, suit, rank, faceUp };
}

function state(overrides: Partial<GameState> = {}): GameState {
  return {
    stock: [],
    waste: [],
    fields: emptyFields(),
    holding: Array.from({ length: HOLDING_PILES }, () => []),
    moves: 0,
    score: 0,
    recycled: 0,
    ...overrides,
  };
}

describe('deck & deal', () => {
  it('builds 4 suits of 14 cards; rank 1 is the Field', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(56);
    expect(deck.filter((c) => c.suit === 'grain')).toHaveLength(14);
    expect(deck.filter(isFieldCard)).toHaveLength(4);
    expect(rankLabel(1)).toBe('F');
    expect(rankLabel(14)).toBe('★');
  });

  it('deals 7 holding piles (1..7) with only the top face-up, rest in stock', () => {
    const s = newGame(7);
    expect(s.holding).toHaveLength(7);
    expect(s.holding.map((p) => p.length)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(s.holding.every((p) => p[p.length - 1].faceUp)).toBe(true);
    expect(s.holding[3].slice(0, 3).every((c) => !c.faceUp)).toBe(true);
    expect(s.stock).toHaveLength(28);
    expect(s.waste).toHaveLength(0);
    expect(s.fields.grain).toHaveLength(0);
  });

  it('seeded shuffle is reproducible', () => {
    const a = shuffle(createDeck(), mulberry32(9)).map((c) => c.id);
    const b = shuffle(createDeck(), mulberry32(9)).map((c) => c.id);
    expect(a).toEqual(b);
  });

  it('deal mutates the passed deck into a legal layout', () => {
    const deck = createDeck();
    const s = deal(deck);
    expect(deck).toHaveLength(0);
    expect(s.holding.reduce((n, p) => n + p.length, 0) + s.stock.length).toBe(56);
  });
});

describe('field stacks (14-card suits)', () => {
  it('an empty field only accepts the Field card (rank 1)', () => {
    expect(canPlaceOnField(card('grain', 1), [])).toBe(true);
    expect(canPlaceOnField(card('grain', 2), [])).toBe(false);
    expect(canPlaceOnField(card('livestock', 1), [])).toBe(true);
  });

  it('stacks the same suit in order up to 14, not identical cards', () => {
    const field = [card('grain', 1), card('grain', 2)];
    expect(canPlaceOnField(card('grain', 3), field)).toBe(true);
    expect(canPlaceOnField(card('grain', 2), field)).toBe(false);
    expect(canPlaceOnField(card('grain', 1), field)).toBe(false);
    expect(canPlaceOnField(card('orchard', 3), field)).toBe(false);
  });

  it('playing a Field from waste sets that plot, then the next rank', () => {
    const s = state({
      waste: [card('livestock', 1)],
    });
    expect(sendToField(s, 'livestock-1')).toBe(true);
    expect(s.fields.livestock).toHaveLength(1);
    expect(s.fields.livestock[0].rank).toBe(1);
    s.waste.push(card('livestock', 2));
    expect(sendToField(s, 'livestock-2')).toBe(true);
    expect(s.fields.livestock.map((c) => c.rank)).toEqual([1, 2]);
  });
});

describe('holding set (solitaire tableau)', () => {
  it('empty hold only accepts a Harvest (rank 14), like a King', () => {
    expect(canStackOnHold(card('grain', 14), undefined)).toBe(true);
    expect(canStackOnHold(card('grain', 13), undefined)).toBe(false);
  });

  it('builds down by one rank in the opposite family', () => {
    const gold = card('grain', 10);
    expect(canStackOnHold(card('livestock', 9), gold)).toBe(true);
    expect(canStackOnHold(card('equipment', 9), gold)).toBe(true);
    expect(canStackOnHold(card('orchard', 9), gold)).toBe(false);
    expect(canStackOnHold(card('livestock', 8), gold)).toBe(false);
  });

  it('a holding run must be face-up, descending, and alternating', () => {
    expect(isValidRun([card('grain', 8), card('livestock', 7), card('orchard', 6)])).toBe(true);
    expect(isValidRun([card('grain', 8), card('orchard', 7)])).toBe(false);
    expect(isValidRun([card('grain', 8, false), card('livestock', 7)])).toBe(false);
  });

  it('moves a run from one hold pile onto another and flips the exposed card', () => {
    const s = state({
      holding: [
        [card('equipment', 5, false), card('grain', 10), card('livestock', 9)],
        [card('livestock', 11)],
        [],
        [],
        [],
        [],
        [],
      ],
    });
    expect(moveCards(s, 'grain-10', { type: 'hold', index: 1 })).toBe(true);
    expect(s.holding[1].map((c) => c.id)).toEqual(['livestock-11', 'grain-10', 'livestock-9']);
    expect(s.holding[0]).toHaveLength(1);
    expect(s.holding[0][0].faceUp).toBe(true);
  });
});

describe('stock, waste, and legal grabs', () => {
  it('draws stock onto waste, then recycles waste back to stock', () => {
    const s = state({
      stock: [card('grain', 4, false), card('orchard', 5, false)],
    });
    expect(drawFromStock(s)).toBe(true);
    expect(topOf(s.waste)?.id).toBe('orchard-5');
    expect(s.waste[0].faceUp).toBe(true);
    drawFromStock(s);
    expect(s.stock).toHaveLength(0);
    expect(drawFromStock(s)).toBe(true);
    expect(s.recycled).toBe(1);
    expect(s.stock).toHaveLength(2);
    expect(s.waste).toHaveLength(0);
  });

  it('only the waste top and a valid hold run are movable', () => {
    const s = state({
      waste: [card('grain', 1), card('orchard', 2)],
      holding: [[card('livestock', 8), card('grain', 7)], [], [], [], [], [], []],
    });
    expect(getMovableCards(s, 'grain-1')).toBeNull();
    expect(getMovableCards(s, 'orchard-2')?.map((c) => c.id)).toEqual(['orchard-2']);
    expect(getMovableCards(s, 'livestock-8')?.map((c) => c.id)).toEqual(['livestock-8', 'grain-7']);
  });

  it('validTargets lists the matching empty field for a Field card', () => {
    const s = state({ waste: [card('equipment', 1)] });
    expect(validTargets(s, 'equipment-1')).toEqual([{ type: 'field', suit: 'equipment' }]);
  });
});

describe('auto-play and win', () => {
  it('autoPlayFields walks sequential cards onto their fields', () => {
    const s = state({
      waste: [card('grain', 1)],
      holding: [[card('grain', 2)], [], [], [], [], [], []],
    });
    expect(autoPlayFields(s)).toBe(2);
    expect(s.fields.grain.map((c) => c.rank)).toEqual([1, 2]);
  });

  it('is won only when every 14-card suit sits on its field', () => {
    const s = state();
    expect(isWon(s)).toBe(false);
    for (const suit of ['grain', 'orchard', 'livestock', 'equipment'] as Suit[]) {
      s.fields[suit] = Array.from({ length: RANK_MAX }, (_, i) => card(suit, i + 1));
    }
    expect(isWon(s)).toBe(true);
  });
});
