// Card model for AGRITAIRE v7.
//
// Placeable suits stack in vertically aligned columns. Three of the same
// tier collapse into a bigger asset (wood barn → steel barn, compact
// tractor → utility → combine). Expansion / Boom remain instant wildcards.

export type Suit = 'field' | 'seed' | 'equipment' | 'livestock' | 'expansion' | 'boom';
export type SeasonName = 'spring' | 'summer' | 'fall' | 'winter';
export type Tier = 1 | 2 | 3;

export interface SuitInfo {
  readonly suit: Suit;
  readonly emoji: string;
  readonly label: string;
  readonly color: string;
}

export const SUIT_INFO: Record<Suit, SuitInfo> = {
  field: { suit: 'field', emoji: '🏚️', label: 'Barns', color: 'field' },
  seed: { suit: 'seed', emoji: '🌱', label: 'Crops', color: 'seed' },
  equipment: { suit: 'equipment', emoji: '🚜', label: 'Tractors', color: 'equipment' },
  livestock: { suit: 'livestock', emoji: '🐄', label: 'Cattle', color: 'livestock' },
  expansion: { suit: 'expansion', emoji: '📐', label: 'Expansion', color: 'expansion' },
  boom: { suit: 'boom', emoji: '💥', label: 'Boom', color: 'boom' },
};

export const PLACEABLE_SUITS = ['field', 'seed', 'equipment', 'livestock'] as const;

export interface AssetTier {
  readonly tier: Tier;
  readonly emoji: string;
  readonly label: string;
  readonly short: string;
}

export const SUIT_TIERS: Record<(typeof PLACEABLE_SUITS)[number], readonly AssetTier[]> = {
  field: [
    { tier: 1, emoji: '🏚️', label: 'Wood barn', short: 'Wood' },
    { tier: 2, emoji: '🏭', label: 'Steel barn', short: 'Steel' },
    { tier: 3, emoji: '🏢', label: 'Modern barn', short: 'Modern' },
  ],
  seed: [
    { tier: 1, emoji: '🌱', label: 'Seedling', short: 'Seed' },
    { tier: 2, emoji: '🌾', label: 'Standing crop', short: 'Crop' },
    { tier: 3, emoji: '🌻', label: 'Bumper crop', short: 'Bumper' },
  ],
  equipment: [
    { tier: 1, emoji: '🚜', label: 'Compact tractor', short: 'Small' },
    { tier: 2, emoji: '🛻', label: 'Utility tractor', short: 'Utility' },
    { tier: 3, emoji: '🚛', label: 'Combine', short: 'Combine' },
  ],
  livestock: [
    { tier: 1, emoji: '🐄', label: 'Cow', short: 'Cow' },
    { tier: 2, emoji: '🐂', label: 'Herd', short: 'Herd' },
    { tier: 3, emoji: '🏞️', label: 'Feedlot', short: 'Lot' },
  ],
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
  readonly tier: Tier;
  readonly season?: SeasonName; // seeds only
}

export function isInstant(card: Card): boolean {
  return card.suit === 'expansion' || card.suit === 'boom';
}

export function isPlaceable(suit: Suit): suit is (typeof PLACEABLE_SUITS)[number] {
  return (PLACEABLE_SUITS as readonly string[]).includes(suit);
}

export function assetTier(card: Card): AssetTier | null {
  if (!isPlaceable(card.suit)) return null;
  return SUIT_TIERS[card.suit][card.tier - 1] ?? SUIT_TIERS[card.suit][0];
}

export function cardLabel(card: Card): string {
  if (card.suit === 'seed' && card.season && card.tier === 1) return SEASON_INFO[card.season].emoji;
  const asset = assetTier(card);
  if (asset) return asset.emoji;
  return SUIT_INFO[card.suit].emoji;
}

function ofSuit(suit: Suit, count: number, season?: SeasonName): Card[] {
  return Array.from({ length: count }, (_, i) => ({
    id: season ? `${suit}-${season}-${i + 1}` : `${suit}-${i + 1}`,
    suit,
    tier: 1 as Tier,
    ...(season ? { season } : {}),
  }));
}

/** Build the ordered deck (~45 cards). All dealt cards start at tier 1. */
export function createDeck(): Card[] {
  return [
    ...ofSuit('field', FIELD_COUNT),
    ...SEASONS.flatMap((season) => ofSuit('seed', SEEDS_PER_SEASON, season)),
    ...ofSuit('equipment', EQUIPMENT_COUNT),
    ...ofSuit('livestock', LIVESTOCK_COUNT),
    ...ofSuit('expansion', EXPANSION_COUNT),
    ...ofSuit('boom', BOOM_COUNT),
  ];
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
