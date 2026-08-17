import { describe, it, expect } from 'vitest';
import { Card, Suit, SeasonName, createDeck, shuffle, mulberry32 } from './cards';
import {
  GameState,
  Row,
  Cattle,
  ROW_COUNT,
  ROW_CAP,
  MINI_DECK_SIZE,
  SEEDS_START,
  MINI_DECK_COST,
  HARVEST_SEED_YIELD,
  CATTLE_LIFESPAN,
  CATTLE_CASHOUT,
  HERD_END_BONUS,
  INSTANT_SELL_VALUE,
  newGame,
  currentSeason,
  nextNeeded,
  canPlace,
  feedCost,
  sellValue,
  sellCard,
  canDrawMiniDeck,
  drawMiniDeck,
  advanceHerd,
  placeFromHand,
  playExpansion,
  playBoom,
  canFold,
  foldRow,
  cardsRemaining,
} from './rules';

function c(suit: Suit, season?: SeasonName, id?: string): Card {
  return {
    id: id ?? (season ? `${suit}-${season}` : `${suit}-1`),
    suit,
    ...(season ? { season } : {}),
  };
}
function row(cards: Card[]): Row {
  return { cards };
}
function cows(...lives: number[]): Cattle[] {
  return lives.map((life, i) => ({ id: `cow-${i}`, life }));
}
function baseState(overrides: Partial<GameState> = {}): GameState {
  return {
    deck: [],
    hand: [],
    seeds: SEEDS_START,
    rows: Array.from({ length: ROW_COUNT }, () => ({ cards: [] })),
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
    rng: () => 0.5,
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
    expect(currentSeason(1)).toBe('spring');
    expect(currentSeason(2)).toBe('summer');
    expect(currentSeason(4)).toBe('winter');
    expect(currentSeason(5)).toBe('spring');
  });

  it('seeded shuffle is reproducible', () => {
    const a = shuffle(createDeck(), mulberry32(9)).map((x) => x.id);
    const b = shuffle(createDeck(), mulberry32(9)).map((x) => x.id);
    expect(a).toEqual(b);
  });
});

describe('production chain', () => {
  it('empty row accepts only Field', () => {
    const r = row([]);
    expect(nextNeeded(r)).toBe('field');
    expect(canPlace(c('field'), r, 'spring')).toBe(true);
    expect(canPlace(c('seed', 'spring'), r, 'spring')).toBe(false);
    expect(canPlace(c('equipment'), r, 'spring')).toBe(false);
    expect(canPlace(c('livestock'), r, 'spring')).toBe(false);
  });

  it('Field then matching-season Seed; rejects the wrong season', () => {
    const r = row([c('field')]);
    expect(nextNeeded(r)).toBe('seed');
    expect(canPlace(c('seed', 'spring'), r, 'spring')).toBe(true);
    expect(canPlace(c('seed', 'winter'), r, 'spring')).toBe(false);
    expect(canPlace(c('equipment'), r, 'spring')).toBe(false);
  });

  it('Field+Seed accepts Equipment; then the row is foldable and livestock extras are legal', () => {
    const r = row([c('field'), c('seed', 'spring')]);
    expect(canPlace(c('equipment'), r, 'spring')).toBe(true);
    expect(canFold(r)).toBe(false);
    r.cards.push(c('equipment'));
    expect(canFold(r)).toBe(true);
    expect(nextNeeded(r)).toBe('livestock');
    expect(canPlace(c('livestock'), r, 'spring')).toBe(true);
    expect(canPlace(c('field'), r, 'spring')).toBe(false);
  });

  it('instant cards never sit on a row', () => {
    const r = row([]);
    expect(canPlace(c('expansion'), r, 'spring')).toBe(false);
    expect(canPlace(c('boom'), r, 'spring')).toBe(false);
  });
});

describe('expansion & boom', () => {
  it('Expansion adds a row and refuses past the cap', () => {
    const s = baseState({ hand: [c('expansion', undefined, 'expansion-1')] });
    expect(playExpansion(s, 'expansion-1')).toBe(true);
    expect(s.rows).toHaveLength(5);
    expect(s.hand).toHaveLength(0);

    const full = baseState({
      hand: [c('expansion', undefined, 'expansion-2')],
      rows: Array.from({ length: ROW_CAP }, () => ({ cards: [] })),
    });
    expect(playExpansion(full, 'expansion-2')).toBe(false);
    expect(full.rows).toHaveLength(ROW_CAP);
    expect(full.hand).toHaveLength(1);
  });

  it('Boom can add grain or a cow', () => {
    const grain = baseState({
      hand: [c('boom', undefined, 'boom-1')],
      rng: () => 0,
    });
    expect(playBoom(grain, 'boom-1', 'grain')).toBe(true);
    expect(grain.grain).toBe(1);
    expect(grain.hand).toHaveLength(0);

    const cow = baseState({ hand: [c('boom', undefined, 'boom-2')] });
    expect(playBoom(cow, 'boom-2', 'cow')).toBe(true);
    expect(cow.herd).toHaveLength(1);
    expect(cow.herd[0].life).toBe(CATTLE_LIFESPAN);
  });

  it('sells instants for extra seeds', () => {
    expect(sellValue(c('boom'))).toBe(INSTANT_SELL_VALUE);
    const s = baseState({ hand: [c('boom', undefined, 'boom-1')], seeds: 5 });
    expect(sellCard(s, 'boom-1')).toBe(true);
    expect(s.seeds).toBe(5 + INSTANT_SELL_VALUE);
  });
});

describe('mini-deck loans', () => {
  it('draws only when hand empty, deck remains, and affordable', () => {
    expect(canDrawMiniDeck(baseState({ hand: [], deck: [c('field')], seeds: MINI_DECK_COST }))).toBe(
      true,
    );
    expect(canDrawMiniDeck(baseState({ hand: [c('field')], deck: [c('seed', 'spring')], seeds: 5 }))).toBe(
      false,
    );
    expect(canDrawMiniDeck(baseState({ hand: [], deck: [c('field')], seeds: MINI_DECK_COST - 1 }))).toBe(
      false,
    );
  });

  it('taking the loan spends seeds, bumps the season, and draws', () => {
    const s = baseState({ hand: [], deck: [c('field'), c('seed', 'summer'), c('equipment')], seeds: 5 });
    expect(drawMiniDeck(s)).toBe(true);
    expect(s.seeds).toBe(5 - MINI_DECK_COST);
    expect(s.season).toBe(2);
    expect(s.hand).toHaveLength(3);
    expect(currentSeason(s.season)).toBe('summer');
  });
});

describe('folding a completed chain', () => {
  it('cannot fold until Equipment is present', () => {
    expect(canFold(row([c('field'), c('seed', 'spring')]))).toBe(false);
    expect(canFold(row([c('field'), c('seed', 'spring'), c('equipment')]))).toBe(true);
  });

  it('harvest fills the grain bank and returns seeds', () => {
    const s = baseState({ seeds: 0 });
    s.rows[0] = row([c('field'), c('seed', 'spring'), c('equipment')]);
    expect(foldRow(s, 0, 'grain')).toBe(true);
    expect(s.grain).toBe(3 + 1);
    expect(s.seeds).toBe(HARVEST_SEED_YIELD);
    expect(s.score).toBe(3 + 1);
    expect(s.rows[0].cards).toHaveLength(0);
  });

  it('cattle fold adds live animals; livestock extras add more cows', () => {
    const s = baseState();
    s.rows[0] = row([c('field'), c('seed', 'spring'), c('equipment'), c('livestock')]);
    expect(foldRow(s, 0, 'cattle')).toBe(true);
    expect(s.herd).toHaveLength(2);
    expect(s.herd.every((cow) => cow.life === CATTLE_LIFESPAN)).toBe(true);
    expect(s.score).toBe(1);
  });
});

describe('living herd', () => {
  it('eats grain each season (feedCost)', () => {
    const s = baseState({ grain: 5, herd: cows(2, 2, 2) });
    expect(feedCost(s)).toBe(3);
    advanceHerd(s);
    expect(s.grain).toBe(2);
    expect(s.herd.every((cow) => cow.life === 1)).toBe(true);
  });

  it('starves animals when grain runs short (feeds those closest to cash-out)', () => {
    const s = baseState({ grain: 1, herd: cows(3, 2, 3) });
    advanceHerd(s);
    expect(s.cattleStarved).toBe(2);
    expect(s.herd).toHaveLength(1);
    expect(s.herd[0].life).toBe(1);
    expect(s.grain).toBe(0);
  });

  it('cashes out big points when an animal reaches end of life', () => {
    const s = baseState({ grain: 10, herd: cows(1, 1) });
    advanceHerd(s);
    expect(s.cattleCashed).toBe(2);
    expect(s.score).toBe(2 * CATTLE_CASHOUT);
    expect(s.herd).toHaveLength(0);
  });

  it('taking a loan feeds and ages the herd', () => {
    const s = baseState({
      hand: [],
      deck: [c('field'), c('equipment')],
      grain: 4,
      herd: cows(3),
      seeds: 5,
    });
    expect(drawMiniDeck(s)).toBe(true);
    expect(s.grain).toBe(3);
    expect(s.herd[0].life).toBe(2);
  });
});

describe('end conditions', () => {
  it('finishing the deck sells surviving cattle for a bonus', () => {
    const s = baseState({ hand: [c('field')], deck: [], herd: cows(2, 2) });
    placeFromHand(s, 'field-1', 0);
    expect(s.over).toBe(true);
    expect(s.failed).toBe(false);
    expect(s.score).toBe(2 * HERD_END_BONUS);
  });

  it('emptying the hand while broke and cards remain = bankruptcy', () => {
    const s = baseState({
      hand: [c('field')],
      deck: [c('seed', 'spring')],
      seeds: MINI_DECK_COST - 1,
    });
    placeFromHand(s, 'field-1', 0);
    expect(s.over).toBe(true);
    expect(s.failed).toBe(true);
  });
});
