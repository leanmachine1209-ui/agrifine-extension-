import { describe, it, expect } from 'vitest';
import { Card, Suit, SeasonName, Tier, createDeck, shuffle, mulberry32 } from './cards';
import {
  GameState,
  Column,
  Cattle,
  COLUMN_COUNT,
  COLUMN_CAP,
  MINI_DECK_SIZE,
  SEEDS_START,
  MINI_DECK_COST,
  HARVEST_SEED_YIELD,
  CATTLE_LIFESPAN,
  CATTLE_CASHOUT,
  HERD_END_BONUS,
  INSTANT_SELL_VALUE,
  BASE_CATTLE_CAP,
  newGame,
  currentSeason,
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
  foldColumn,
  cardsRemaining,
  collapseColumn,
  barnCapacity,
  tractorPower,
  capitalBurn,
  loanCost,
  enforceCapacity,
} from './rules';

function c(suit: Suit, season?: SeasonName, id?: string, tier: Tier = 1): Card {
  return {
    id: id ?? (season ? `${suit}-${season}` : `${suit}-1`),
    suit,
    tier,
    ...(season ? { season } : {}),
  };
}
function col(suit: Suit | null, cards: Card[] = []): Column {
  return { suit, cards };
}
function cows(...lives: number[]): Cattle[] {
  return lives.map((life, i) => ({ id: `cow-${i}`, life }));
}
function baseState(overrides: Partial<GameState> = {}): GameState {
  return {
    deck: [],
    hand: [],
    seeds: SEEDS_START,
    columns: [
      col('field'),
      col('seed'),
      col('equipment'),
      col('livestock'),
    ],
    grain: 0,
    herd: [],
    score: 0,
    season: 1,
    sold: 0,
    cattleCashed: 0,
    cattleStarved: 0,
    nextCow: 0,
    nextMerge: 0,
    tokensBurned: 0,
    over: false,
    failed: false,
    rng: () => 0.5,
    ...overrides,
  };
}

describe('deck & new game', () => {
  it('has 45 cards; new game deals a free mini-deck onto 4 suit columns', () => {
    expect(createDeck()).toHaveLength(45);
    expect(createDeck().every((card) => card.tier === 1)).toBe(true);
    const s = newGame(3);
    expect(s.hand).toHaveLength(MINI_DECK_SIZE);
    expect(s.seeds).toBe(SEEDS_START);
    expect(s.herd).toHaveLength(0);
    expect(s.columns).toHaveLength(COLUMN_COUNT);
    expect(s.columns.map((column) => column.suit)).toEqual([
      'field',
      'seed',
      'equipment',
      'livestock',
    ]);
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

describe('vertically aligned suits', () => {
  it('each column only accepts its own suit', () => {
    const barns = col('field');
    const crops = col('seed');
    expect(canPlace(c('field'), barns, 'spring')).toBe(true);
    expect(canPlace(c('seed', 'spring'), barns, 'spring')).toBe(false);
    expect(canPlace(c('equipment'), barns, 'spring')).toBe(false);
    expect(canPlace(c('seed', 'spring'), crops, 'spring')).toBe(true);
    expect(canPlace(c('field'), crops, 'spring')).toBe(false);
  });

  it('rejects the wrong-season Seed on the crop column', () => {
    const crops = col('seed');
    expect(canPlace(c('seed', 'spring'), crops, 'spring')).toBe(true);
    expect(canPlace(c('seed', 'winter'), crops, 'spring')).toBe(false);
  });

  it('instant cards never sit on a column', () => {
    expect(canPlace(c('expansion'), col('field'), 'spring')).toBe(false);
    expect(canPlace(c('boom'), col(null), 'spring')).toBe(false);
  });

  it('an Expansion extra locks to the first suit played', () => {
    const s = baseState({
      hand: [c('field', undefined, 'field-1')],
      columns: [...baseState().columns, col(null)],
    });
    expect(placeFromHand(s, 'field-1', 4)).toBe(true);
    expect(s.columns[4].suit).toBe('field');
    expect(s.columns[4].cards).toHaveLength(1);
  });
});

describe('collapsing stacks', () => {
  it('three wood barns collapse into a steel barn', () => {
    const barns = col('field', [c('field', undefined, 'a'), c('field', undefined, 'b'), c('field', undefined, 'c')]);
    let n = 0;
    collapseColumn(barns, () => `m-${n++}`);
    expect(barns.cards).toHaveLength(1);
    expect(barns.cards[0].tier).toBe(2);
    expect(barns.cards[0].suit).toBe('field');
  });

  it('three steel barns collapse into a modern barn', () => {
    const barns = col('field', [
      c('field', undefined, 'a', 2),
      c('field', undefined, 'b', 2),
      c('field', undefined, 'c', 2),
    ]);
    collapseColumn(barns, () => 'm-1');
    expect(barns.cards).toHaveLength(1);
    expect(barns.cards[0].tier).toBe(3);
  });

  it('three compact tractors collapse into a utility tractor, then three utilities into a combine', () => {
    const tractors = col('equipment', [
      c('equipment', undefined, 'a'),
      c('equipment', undefined, 'b'),
      c('equipment', undefined, 'c'),
    ]);
    collapseColumn(tractors, () => 'u-1');
    expect(tractors.cards[0].tier).toBe(2);

    tractors.cards.push(c('equipment', undefined, 'd', 2), c('equipment', undefined, 'e', 2));
    collapseColumn(tractors, () => 'c-1');
    expect(tractors.cards).toHaveLength(1);
    expect(tractors.cards[0].tier).toBe(3);
  });

  it('modern barns do not collapse further', () => {
    const barns = col('field', [
      c('field', undefined, 'a', 3),
      c('field', undefined, 'b', 3),
      c('field', undefined, 'c', 3),
    ]);
    collapseColumn(barns, () => 'x');
    expect(barns.cards).toHaveLength(3);
  });

  it('placing the third wood barn from hand collapses the stack', () => {
    const s = baseState({
      hand: [c('field', undefined, 'field-3')],
    });
    s.columns[0].cards = [c('field', undefined, 'field-1'), c('field', undefined, 'field-2')];
    expect(placeFromHand(s, 'field-3', 0)).toBe(true);
    expect(s.columns[0].cards).toHaveLength(1);
    expect(s.columns[0].cards[0].tier).toBe(2);
  });
});

describe('capacity — leveling up management', () => {
  it('wood barns add cattle slots; steel/modern add more', () => {
    const s = baseState();
    expect(barnCapacity(s)).toBe(BASE_CATTLE_CAP);
    s.columns[0].cards = [c('field', undefined, 'w', 1)];
    expect(barnCapacity(s)).toBe(BASE_CATTLE_CAP + 1);
    s.columns[0].cards = [c('field', undefined, 's', 2)];
    expect(barnCapacity(s)).toBe(BASE_CATTLE_CAP + 3);
    s.columns[0].cards = [c('field', undefined, 'm', 3)];
    expect(barnCapacity(s)).toBe(BASE_CATTLE_CAP + 6);
  });

  it('bigger tractors lift harvest yield', () => {
    const s = baseState({
      columns: [
        col('field'),
        col('seed', [c('seed', 'spring', 'seed-1'), c('seed', 'spring', 'seed-2')]),
        col('equipment', [c('equipment', undefined, 't', 2)]),
        col('livestock'),
      ],
    });
    expect(tractorPower(s)).toBe(3);
    expect(foldColumn(s, 1, 'grain')).toBe(true);
    expect(s.grain).toBe(2 + 3);
    expect(s.seeds).toBe(SEEDS_START + HARVEST_SEED_YIELD);
    expect(s.columns[1].cards).toHaveLength(0);
  });

  it('cattle fold is capped by barn capacity; extras starve', () => {
    const s = baseState({
      columns: [
        col('field'),
        col('seed'),
        col('equipment'),
        col('livestock', [
          c('livestock', undefined, 'a'),
          c('livestock', undefined, 'b'),
          c('livestock', undefined, 'c'),
        ]),
      ],
    });
    expect(barnCapacity(s)).toBe(BASE_CATTLE_CAP);
    expect(foldColumn(s, 3, 'cattle')).toBe(true);
    expect(s.herd).toHaveLength(BASE_CATTLE_CAP);
    expect(s.cattleStarved).toBe(1);
  });
});

describe('idle token burn', () => {
  it('empty farm burns nothing extra', () => {
    expect(capitalBurn(baseState()).total).toBe(0);
    expect(loanCost(baseState())).toBe(MINI_DECK_COST);
  });

  it('idle barns and tractors burn double when no cattle or crops pay', () => {
    const s = baseState({
      columns: [
        col('field', [c('field', undefined, 'b', 2)]),
        col('seed'),
        col('equipment', [c('equipment', undefined, 't', 1)]),
        col('livestock'),
      ],
    });
    const burn = capitalBurn(s);
    expect(burn.idleBarns).toBe(true);
    expect(burn.idleTractors).toBe(true);
    expect(burn.barns).toBe(4);
    expect(burn.tractors).toBe(2);
    expect(burn.total).toBe(6);
    expect(loanCost(s)).toBe(MINI_DECK_COST + 6);
  });

  it('cattle pay for barns and grain/crops pay for tractors', () => {
    const s = baseState({
      grain: 4,
      herd: cows(3),
      columns: [
        col('field', [c('field', undefined, 'b', 2)]),
        col('seed'),
        col('equipment', [c('equipment', undefined, 't', 1)]),
        col('livestock'),
      ],
    });
    const burn = capitalBurn(s);
    expect(burn.idleBarns).toBe(false);
    expect(burn.idleTractors).toBe(false);
    expect(burn.barns).toBe(2);
    expect(burn.tractors).toBe(1);
    expect(burn.total).toBe(3);
  });

  it('taking a loan charges idle burn then the operating-loan fee', () => {
    const s = baseState({
      hand: [],
      deck: [c('field'), c('seed', 'summer')],
      seeds: 10,
      columns: [
        col('field', [c('field', undefined, 'b', 1)]),
        col('seed'),
        col('equipment'),
        col('livestock'),
      ],
    });
    expect(drawMiniDeck(s)).toBe(true);
    expect(s.tokensBurned).toBe(2);
    expect(s.seeds).toBe(10 - 2 - MINI_DECK_COST);
    expect(s.season).toBe(2);
  });
});

describe('expansion & boom', () => {
  it('Expansion adds an open column and refuses past the cap', () => {
    const s = baseState({ hand: [c('expansion', undefined, 'expansion-1')] });
    expect(playExpansion(s, 'expansion-1')).toBe(true);
    expect(s.columns).toHaveLength(5);
    expect(s.columns[4].suit).toBeNull();
    expect(s.hand).toHaveLength(0);

    const full = baseState({
      hand: [c('expansion', undefined, 'expansion-2')],
      columns: Array.from({ length: COLUMN_CAP }, () => col(null)),
    });
    expect(playExpansion(full, 'expansion-2')).toBe(false);
    expect(full.columns).toHaveLength(COLUMN_CAP);
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

describe('folding production', () => {
  it('cannot harvest an empty crop column or a barn column', () => {
    expect(canFold(col('seed'), 'grain')).toBe(false);
    expect(canFold(col('field', [c('field')]), 'grain')).toBe(false);
    expect(canFold(col('seed', [c('seed', 'spring')]), 'grain')).toBe(true);
    expect(canFold(col('livestock', [c('livestock')]), 'cattle')).toBe(true);
  });
});

describe('living herd', () => {
  it('eats grain each season (feedCost)', () => {
    const s = baseState({
      grain: 5,
      herd: cows(2, 2, 2),
      columns: [col('field', [c('field', undefined, 'b', 2)]), col('seed'), col('equipment'), col('livestock')],
    });
    expect(feedCost(s)).toBe(3);
    advanceHerd(s);
    expect(s.grain).toBe(2);
    expect(s.herd.every((cow) => cow.life === 1)).toBe(true);
  });

  it('starves animals when grain runs short (feeds those closest to cash-out)', () => {
    const s = baseState({
      grain: 1,
      herd: cows(3, 2, 3),
      columns: [col('field', [c('field', undefined, 'b', 2)]), col('seed'), col('equipment'), col('livestock')],
    });
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

  it('over-capacity herd is culled to barn space', () => {
    const s = baseState({ herd: cows(3, 3, 2, 1) });
    expect(barnCapacity(s)).toBe(BASE_CATTLE_CAP);
    enforceCapacity(s);
    expect(s.herd).toHaveLength(BASE_CATTLE_CAP);
    expect(s.cattleStarved).toBe(2);
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

  it('idle capital can bankrupt you even with enough seeds for a bare loan', () => {
    const s = baseState({
      hand: [c('field', undefined, 'field-x')],
      deck: [c('seed', 'spring')],
      seeds: MINI_DECK_COST,
      columns: [
        col('field', [c('field', undefined, 'b', 2)]),
        col('seed'),
        col('equipment'),
        col('livestock'),
      ],
    });
    placeFromHand(s, 'field-x', 0);
    expect(s.over).toBe(true);
    expect(s.failed).toBe(true);
  });
});
