// Card model for AGRITAIRE.
//
// Classes:
//   🏞️ field      — starts a production chain
//   🌱 seed       — second step; must match the current season
//   🚜 equipment  — third step; row becomes foldable
//   🐄 livestock  — extra on a completed chain; boosts a cattle fold
//   📐 expansion  — instant: add a row (cap 6)
//   💥 boom       — instant: +grain or +cow (player picks)

export type Suit = 'field' | 'seed' | 'equipment' | 'livestock' | 'expansion' | 'boom';
export type SeasonName = 'spring' | 'summer' | 'fall' | 'winter';

export interface SuitInfo {
  readonly suit: Suit;
  readonly emoji: string;
  readonly label: string;
  readonly color: string;
}

export const SUIT_INFO: Record<Suit, SuitInfo> = {
  field: { suit: 'field', emoji: '🏞️', label: 'Field', color: 'field' },
  seed: { suit: 'seed', emoji: '🌱', label: 'Seed', color: 'seed' },
  equipment: { suit: 'equipment', emoji: '🚜', label: 'Equipment', color: 'equipment' },
  livestock: { suit: 'livestock', emoji: '🐄', label: 'Livestock', color: 'livestock' },
  expansion: { suit: 'expansion', emoji: '📐', label: 'Expansion', color: 'expansion' },
  boom: { suit: 'boom', emoji: '💥', label: 'Boom', color: 'boom' },
};

export const SEASONS: SeasonName[] = ['spring', 'summer', 'fall', 'winter'];

export const SEASON_INFO: Record<SeasonName, { emoji: string; label: string }> = {
  spring: { emoji: '🌸', label: 'Spring' },
  summer: { emoji: '☀️', label: 'Summer' },
  fall: { emoji: '🍂', label: 'Fall' },
  winter: { emoji: '❄️', label: 'Winter' },
};

export const FIELD_COUNT = 10;
export const SEEDS_PER_SEASON = 3;
export const EQUIPMENT_COUNT = 8;
export const LIVESTOCK_COUNT = 8;
export const EXPANSION_COUNT = 3;
export const BOOM_COUNT = 4;

export interface Card {
  readonly id: string;
  readonly suit: Suit;
  readonly season?: SeasonName; // seeds only
}

export function isInstant(card: Card): boolean {
  return card.suit === 'expansion' || card.suit === 'boom';
}

export function cardLabel(card: Card): string {
  if (card.suit === 'seed' && card.season) return SEASON_INFO[card.season].emoji;
  return SUIT_INFO[card.suit].emoji;
}

/** Build the ordered deck (~45 cards). */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (let i = 1; i <= FIELD_COUNT; i++) {
    deck.push({ id: `field-${i}`, suit: 'field' });
  }
  for (const season of SEASONS) {
    for (let i = 1; i <= SEEDS_PER_SEASON; i++) {
      deck.push({ id: `seed-${season}-${i}`, suit: 'seed', season });
    }
  }
  for (let i = 1; i <= EQUIPMENT_COUNT; i++) {
    deck.push({ id: `equipment-${i}`, suit: 'equipment' });
  }
  for (let i = 1; i <= LIVESTOCK_COUNT; i++) {
    deck.push({ id: `livestock-${i}`, suit: 'livestock' });
  }
  for (let i = 1; i <= EXPANSION_COUNT; i++) {
    deck.push({ id: `expansion-${i}`, suit: 'expansion' });
  }
  for (let i = 1; i <= BOOM_COUNT; i++) {
    deck.push({ id: `boom-${i}`, suit: 'boom' });
  }
  return deck;
}

/** Deterministic PRNG (mulberry32) so games can be seeded/reproduced. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** In-place Fisher–Yates shuffle using an injectable RNG. */
export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
