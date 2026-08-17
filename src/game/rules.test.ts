import { describe, it, expect } from 'vitest';
import {
  Card,
  Suit,
  RANK_MAX,
  DECK_SIZE,
  EVENT_COUNT,
  RANKED_COUNT,
  createDeck,
  shuffle,
  mulberry32,
  rankLabel,
  isFieldCard,
  isEvent,
  isRanked,
  EventKind,
} from './cards';
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
  fieldTenure,
  ownedFarms,
  isSafeFieldPlay,
  canRecallFromLease,
  hasCrew,
  advise,
  fertilize,
  resolveEvent,
  autoResolveHinders,
  ownedHerdFarms,
  cardsInPlay,
} from './rules';

function card(suit: Suit, rank: number, faceUp = true): Card {
  return { kind: 'ranked', id: `${suit}-${rank}`, suit, rank, faceUp };
}

function eventCard(event: EventKind, copy = 1, faceUp = true): Card {
  return { kind: 'event', id: `event-${event}-${copy}`, event, copy, faceUp };
}

function state(overrides: Partial<GameState> = {}): GameState {
  return {
    stock: [],
    waste: [],
    fields: emptyFields(),
    holding: Array.from({ length: HOLDING_PILES }, () => []),
    resolved: [],
    manure: 0,
    droughtMoves: 0,
    lienMoves: 0,
    rainSafe: false,
    moves: 0,
    score: 0,
    recycled: 0,
    ...overrides,
  };
}

describe('deck & deal', () => {
  it('builds a 66-card deck: 4×13 land uses plus 14 events', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(DECK_SIZE);
    expect(deck.filter(isRanked)).toHaveLength(RANKED_COUNT);
    expect(deck.filter(isEvent)).toHaveLength(EVENT_COUNT);
    expect(deck.filter((c) => isRanked(c) && c.suit === 'annual')).toHaveLength(13);
    expect(deck.filter(isFieldCard)).toHaveLength(4);
    expect(rankLabel(1)).toBe('F');
    expect(rankLabel(13)).toBe('★');
  });

  it('deals 7 holding piles (1..7) with only the top face-up, rest in stock', () => {
    const s = newGame(7);
    expect(s.holding).toHaveLength(7);
    expect(s.holding.every((p) => p.length === 0 || p[p.length - 1].faceUp)).toBe(true);
    expect(s.fields.annual).toHaveLength(0);
    expect(cardsInPlay(s)).toBe(DECK_SIZE);
    expect(s.holding.reduce((n, p) => n + p.length, 0) + s.stock.length + s.waste.length + s.resolved.length).toBe(
      DECK_SIZE,
    );
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
    expect(cardsInPlay(s)).toBe(DECK_SIZE);
  });
});

describe('field stacks (land uses picked on the plots)', () => {
  it('an empty field only accepts the Field card (rank 1) of that land use', () => {
    expect(canPlaceOnField(card('annual', 1), [])).toBe(true);
    expect(canPlaceOnField(card('annual', 2), [])).toBe(false);
    expect(canPlaceOnField(card('pasture', 1), [])).toBe(true);
    expect(canPlaceOnField(eventCard('rain'), [])).toBe(false);
  });

  it('stacks the same land use in order up to 13, not identical cards', () => {
    const field = [card('annual', 1), card('annual', 2)];
    expect(canPlaceOnField(card('annual', 3), field)).toBe(true);
    expect(canPlaceOnField(card('annual', 2), field)).toBe(false);
    expect(canPlaceOnField(card('annual', 1), field)).toBe(false);
    expect(canPlaceOnField(card('perennial', 3), field)).toBe(false);
  });

  it('playing a Field from waste leases that plot, then the next rank', () => {
    const s = state({
      waste: [card('pasture', 1)],
    });
    expect(sendToField(s, 'pasture-1')).toBe(true);
    expect(fieldTenure(s.fields.pasture)).toBe('leased');
    expect(s.fields.pasture[0] && isRanked(s.fields.pasture[0]) && s.fields.pasture[0].rank).toBe(1);
    s.waste.push(card('pasture', 2));
    expect(sendToField(s, 'pasture-2')).toBe(true);
    expect(s.fields.pasture.map((c) => (isRanked(c) ? c.rank : 0))).toEqual([1, 2]);
    expect(ownedFarms(s)).toBe(0);
  });

  it('completing a 13-card suit owns the farm and never adds a yard column', () => {
    const s = state({
      waste: [card('annual', 13)],
      fields: {
        ...emptyFields(),
        annual: Array.from({ length: 12 }, (_, i) => card('annual', i + 1)),
      },
    });
    expect(fieldTenure(s.fields.annual)).toBe('leased');
    expect(sendToField(s, 'annual-13')).toBe(true);
    expect(fieldTenure(s.fields.annual)).toBe('owned');
    expect(ownedFarms(s)).toBe(1);
    expect(canRecallFromLease(s)).toBe(true);
    expect(s.holding).toHaveLength(7);
  });
});

describe('holding set (solitaire tableau)', () => {
  it('empty hold only accepts a Harvest (rank 13), like a King', () => {
    expect(canStackOnHold(card('annual', 13), undefined)).toBe(true);
    expect(canStackOnHold(card('annual', 12), undefined)).toBe(false);
    expect(canStackOnHold(eventCard('rain'), undefined)).toBe(false);
  });

  it('builds down by one rank with crops overlaying the herd (red/black)', () => {
    const crop = card('annual', 10);
    expect(canStackOnHold(card('pasture', 9), crop)).toBe(true);
    expect(canStackOnHold(card('barn', 9), crop)).toBe(true);
    expect(canStackOnHold(card('perennial', 9), crop)).toBe(false);
    expect(canStackOnHold(card('pasture', 8), crop)).toBe(false);
  });

  it('a holding run must be face-up, descending, and alternating families', () => {
    expect(isValidRun([card('annual', 8), card('pasture', 7), card('perennial', 6)])).toBe(true);
    expect(isValidRun([card('annual', 8), card('perennial', 7)])).toBe(false);
    expect(isValidRun([card('annual', 8, false), card('pasture', 7)])).toBe(false);
    expect(isValidRun([card('annual', 8), eventCard('rain')])).toBe(false);
  });

  it('moves a run from one hold pile onto another and flips the exposed card', () => {
    const s = state({
      holding: [
        [card('barn', 5, false), card('annual', 10), card('pasture', 9)],
        [card('pasture', 11)],
        [],
        [],
        [],
        [],
        [],
      ],
    });
    expect(moveCards(s, 'annual-10', { type: 'hold', index: 1 })).toBe(true);
    expect(s.holding[1].map((c) => c.id)).toEqual(['pasture-11', 'annual-10', 'pasture-9']);
    expect(s.holding[0]).toHaveLength(1);
    expect(s.holding[0][0].faceUp).toBe(true);
  });
});

describe('stock, waste, and legal grabs', () => {
  it('draws stock onto waste, then recycles waste back to stock', () => {
    const s = state({
      stock: [card('annual', 4, false), card('perennial', 5, false)],
    });
    expect(drawFromStock(s)).toBe(true);
    expect(topOf(s.waste)?.id).toBe('perennial-5');
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
      waste: [card('annual', 1), card('perennial', 2)],
      holding: [[card('pasture', 8), card('annual', 7)], [], [], [], [], [], []],
    });
    expect(getMovableCards(s, 'annual-1')).toBeNull();
    expect(getMovableCards(s, 'perennial-2')?.map((c) => c.id)).toEqual(['perennial-2']);
    expect(getMovableCards(s, 'pasture-8')?.map((c) => c.id)).toEqual(['pasture-8', 'annual-7']);
  });

  it('validTargets lists the matching empty field for a Field card', () => {
    const s = state({ waste: [card('barn', 1)] });
    expect(validTargets(s, 'barn-1')).toEqual([{ type: 'field', suit: 'barn' }]);
  });
});

describe('manure cycle', () => {
  it('pasture and barn plays fill the hopper; fertilize spends it on crops', () => {
    const s = state({
      waste: [card('annual', 1), card('pasture', 1)],
    });
    expect(sendToField(s, 'pasture-1')).toBe(true);
    expect(s.manure).toBe(1);
    expect(ownedHerdFarms(s)).toBe(0);
    expect(fertilize(s)).toBe(true);
    expect(s.manure).toBe(0);
    expect(s.fields.annual.map((c) => (isRanked(c) ? c.rank : 0))).toEqual([1]);
  });

  it('owning a herd farm enriches manure and never opens an 8th hold', () => {
    const s = state({
      waste: [card('barn', 2)],
      fields: {
        ...emptyFields(),
        pasture: Array.from({ length: RANK_MAX }, (_, i) => card('pasture', i + 1)),
        barn: [card('barn', 1)],
      },
    });
    expect(s.holding).toHaveLength(7);
    expect(sendToField(s, 'barn-2')).toBe(true);
    expect(s.manure).toBe(2);
    expect(s.holding).toHaveLength(7);
  });

  it('fertilize with nothing to promote still spends manure and makes the next field play safe', () => {
    const s = state({ manure: 1, droughtMoves: 2 });
    expect(fertilize(s)).toBe(true);
    expect(s.manure).toBe(0);
    expect(s.rainSafe).toBe(true);
    s.waste.push(card('annual', 1));
    expect(sendToField(s, 'annual-1')).toBe(true);
    expect(s.fields.annual).toHaveLength(1);
  });
});

describe('events', () => {
  it('a hinder on waste auto-resolves; drought closes the fields', () => {
    const s = state({
      stock: [eventCard('drought', 1, false)],
      waste: [card('annual', 1)],
    });
    expect(sendToField(s, 'annual-1')).toBe(true);
    expect(drawFromStock(s)).toBe(true);
    expect(s.waste).toHaveLength(0);
    expect(s.resolved.map((c) => (isEvent(c) ? c.event : ''))).toEqual(['drought']);
    expect(s.droughtMoves).toBe(3);
    s.waste.push(card('perennial', 1));
    expect(sendToField(s, 'perennial-1')).toBe(false);
    expect(s.fields.perennial).toHaveLength(0);
  });

  it('a boost stays on waste until tapped', () => {
    const s = state({ waste: [eventCard('rain')] });
    autoResolveHinders(s);
    expect(s.waste).toHaveLength(1);
    expect(resolveEvent(s, 'event-rain-1')).toBe(true);
    expect(s.rainSafe).toBe(true);
    expect(s.resolved).toHaveLength(1);
    expect(s.waste).toHaveLength(0);
  });

  it('blight returns a leased top to waste; owned farms are skipped', () => {
    const s = state({
      waste: [eventCard('blight')],
      fields: {
        ...emptyFields(),
        annual: Array.from({ length: RANK_MAX }, (_, i) => card('annual', i + 1)),
        pasture: [card('pasture', 1), card('pasture', 2)],
      },
    });
    expect(resolveEvent(s, 'event-blight-1')).toBe(true);
    expect(s.fields.annual).toHaveLength(RANK_MAX);
    expect(s.fields.pasture.map((c) => (isRanked(c) ? c.rank : 0))).toEqual([1]);
    expect(topOf(s.waste)?.id).toBe('pasture-2');
  });

  it('events cannot stack in the holding set', () => {
    const s = state({
      waste: [eventCard('fair')],
      holding: [[card('annual', 8)], [], [], [], [], [], []],
    });
    expect(moveCards(s, 'event-fair-1', { type: 'hold', index: 0 })).toBe(false);
    expect(getMovableCards(s, 'event-fair-1')).toBeNull();
  });
});

describe('auto-play, tenure, and optimal play', () => {
  it('autoPlayFields only promotes F and 2s (safe Klondike plays)', () => {
    const s = state({
      waste: [card('annual', 1)],
      holding: [[card('annual', 2)], [card('annual', 3)], [], [], [], [], []],
    });
    expect(autoPlayFields(s)).toBe(2);
    expect(s.fields.annual.map((c) => (isRanked(c) ? c.rank : 0))).toEqual([1, 2]);
    expect(s.holding[1]).toHaveLength(1);
  });

  it('a mid-rank is not safe until opposite-family ranks below are up', () => {
    const s = state({
      fields: {
        ...emptyFields(),
        annual: [card('annual', 1), card('annual', 2)],
      },
    });
    expect(isSafeFieldPlay(s, card('annual', 3))).toBe(false);
    s.fields.pasture = [card('pasture', 1), card('pasture', 2)];
    s.fields.barn = [card('barn', 1), card('barn', 2)];
    expect(isSafeFieldPlay(s, card('annual', 3))).toBe(true);
  });

  it('cannot recall from a lease until one farm is owned; lien also blocks recall', () => {
    const s = state({
      fields: { ...emptyFields(), annual: [card('annual', 1), card('annual', 2)] },
      holding: [[card('pasture', 3)], [], [], [], [], [], []],
    });
    expect(canRecallFromLease(s)).toBe(false);
    expect(getMovableCards(s, 'annual-2')).toBeNull();
    s.fields.perennial = Array.from({ length: RANK_MAX }, (_, i) => card('perennial', i + 1));
    expect(canRecallFromLease(s)).toBe(true);
    s.lienMoves = 2;
    expect(canRecallFromLease(s)).toBe(false);
    s.lienMoves = 0;
    expect(moveCards(s, 'annual-2', { type: 'hold', index: 0 })).toBe(true);
    expect(s.fields.annual).toHaveLength(1);
  });

  it('the third owned farm turns the crew on, still on 7 holds', () => {
    const s = state({
      fields: {
        annual: Array.from({ length: RANK_MAX }, (_, i) => card('annual', i + 1)),
        perennial: Array.from({ length: RANK_MAX }, (_, i) => card('perennial', i + 1)),
        pasture: Array.from({ length: RANK_MAX }, (_, i) => card('pasture', i + 1)),
        barn: [],
      },
    });
    expect(hasCrew(s)).toBe(true);
    expect(s.holding).toHaveLength(7);
  });

  it('advise prefers a move that flips a buried card', () => {
    const s = state({
      holding: [
        [card('barn', 4, false), card('annual', 10)],
        [card('pasture', 11)],
        [],
        [],
        [],
        [],
        [],
      ],
    });
    const tip = advise(s);
    expect(tip.cardId).toBe('annual-10');
    expect(tip.text).toMatch(/buried/);
  });

  it('is won only when every farm is owned and all 14 events are resolved', () => {
    const s = state();
    expect(isWon(s)).toBe(false);
    for (const suit of ['annual', 'perennial', 'pasture', 'barn'] as Suit[]) {
      s.fields[suit] = Array.from({ length: RANK_MAX }, (_, i) => card(suit, i + 1));
    }
    expect(isWon(s)).toBe(false);
    s.resolved = Array.from({ length: EVENT_COUNT }, (_, i) => eventCard('rain', i + 1));
    expect(isWon(s)).toBe(true);
    expect(ownedFarms(s)).toBe(4);
  });
});
