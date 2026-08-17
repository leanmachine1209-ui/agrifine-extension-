// Card + suit model for AGRITAIRE.
//
// Four suits:
//   🐄 livestock  — folds into cattle (points, but need grain to preserve)
//   🌾 grain      — folds into the grain bank (grain preserves cattle)
//   🏞️ field     — the sequential backbone; scores bonus points
//   ⭐ wild       — a wildcard that fills any slot in a sequential run

export type Suit = 'livestock' | 'grain' | 'field' | 'wild';

export interface SuitInfo {
  readonly suit: Suit;
  readonly emoji: string;
  readonly label: string;
  readonly color: string; // css class suffix
}

export const SUIT_INFO: Record<Suit, SuitInfo> = {
  livestock: { suit: 'livestock', emoji: '🐄', label: 'Livestock', color: 'livestock' },
  grain: { suit: 'grain', emoji: '🌾', label: 'Grain', color: 'grain' },
  field: { suit: 'field', emoji: '🏞️', label: 'Field', color: 'field' },
  wild: { suit: 'wild', emoji: '⭐', label: 'Wild', color: 'wild' },
};

/** Ranked suits form the 1..13 sequences; wild is rankless. */
export const RANKED_SUITS: Suit[] = ['livestock', 'grain', 'field'];
export const RANK_MIN = 1;
export const RANK_MAX = 13;
export const WILD_COUNT = 6;

export interface Card {
  readonly id: string;
  readonly suit: Suit;
  readonly rank: number; // 1..13 for ranked suits; 0 for wild
}

export function isWild(card: Card): boolean {
  return card.suit === 'wild';
}

export function rankLabel(card: Card): string {
  return card.suit === 'wild' ? '★' : String(card.rank);
}

/** Build the ordered deck: 3 ranked suits × 13 + WILD_COUNT wilds. */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of RANKED_SUITS) {
    for (let rank = RANK_MIN; rank <= RANK_MAX; rank++) {
      deck.push({ id: `${suit}-${rank}`, suit, rank });
    }
  }
  for (let i = 1; i <= WILD_COUNT; i++) {
    deck.push({ id: `wild-${i}`, suit: 'wild', rank: 0 });
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
