// Card model for AGRITAIRE v8 — solitaire suits with Field starters.
//
// Four 14-card suits. Rank 1 is the Field that opens that suit's foundation.
// Ranks 2–14 stack in order on that field. The holding set (tableau) builds
// down in alternating families, like Klondike.

export type Suit = 'grain' | 'orchard' | 'livestock' | 'equipment';
export type Family = 'gold' | 'rust';

export interface SuitInfo {
  readonly suit: Suit;
  readonly emoji: string;
  readonly label: string;
  readonly family: Family;
  readonly color: string;
}

export const SUIT_INFO: Record<Suit, SuitInfo> = {
  grain: { suit: 'grain', emoji: '🌾', label: 'Grain', family: 'gold', color: 'grain' },
  orchard: { suit: 'orchard', emoji: '🍎', label: 'Orchard', family: 'gold', color: 'orchard' },
  livestock: { suit: 'livestock', emoji: '🐄', label: 'Cattle', family: 'rust', color: 'livestock' },
  equipment: { suit: 'equipment', emoji: '🚜', label: 'Tractors', family: 'rust', color: 'equipment' },
};

export const SUITS: Suit[] = ['grain', 'orchard', 'livestock', 'equipment'];

export const RANK_MIN = 1;
export const RANK_MAX = 14;
export const FIELD_RANK = 1;

export interface Card {
  readonly id: string;
  readonly suit: Suit;
  readonly rank: number;
  faceUp: boolean;
}

export function familyOf(suit: Suit): Family {
  return SUIT_INFO[suit].family;
}

export function isFieldCard(card: Card): boolean {
  return card.rank === FIELD_RANK;
}

export function rankLabel(rank: number): string {
  if (rank === 1) return 'F';
  if (rank === 11) return 'J';
  if (rank === 12) return 'Q';
  if (rank === 13) return 'K';
  if (rank === 14) return '★';
  return String(rank);
}

export function cardLabel(card: Card): string {
  const info = SUIT_INFO[card.suit];
  if (card.rank === FIELD_RANK) return `${info.label} Field`;
  if (card.rank === RANK_MAX) return `${info.label} Harvest`;
  return `${info.label} ${rankLabel(card.rank)}`;
}

/** Ordered 56-card deck: 4 suits × ranks 1–14. */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = RANK_MIN; rank <= RANK_MAX; rank++) {
      deck.push({ id: `${suit}-${rank}`, suit, rank, faceUp: false });
    }
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
