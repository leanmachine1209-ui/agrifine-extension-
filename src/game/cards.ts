// Card + crop model for AGRITAIRE.
// Solitaire's four suits are reskinned as four crops. The alternating-color
// rule of Klondike maps onto two crop "families": gold crops and red crops.

export type Suit = 'corn' | 'wheat' | 'tomato' | 'carrot';
export type CropColor = 'gold' | 'red';

export interface CropInfo {
  readonly suit: Suit;
  readonly emoji: string;
  readonly label: string;
  readonly color: CropColor;
}

export const CROPS: Record<Suit, CropInfo> = {
  corn: { suit: 'corn', emoji: '🌽', label: 'Corn', color: 'gold' },
  wheat: { suit: 'wheat', emoji: '🌾', label: 'Wheat', color: 'gold' },
  tomato: { suit: 'tomato', emoji: '🍅', label: 'Tomato', color: 'red' },
  carrot: { suit: 'carrot', emoji: '🥕', label: 'Carrot', color: 'red' },
};

export const SUITS: Suit[] = ['corn', 'wheat', 'tomato', 'carrot'];

export const RANK_MIN = 1; // Ace = a freshly planted seed
export const RANK_MAX = 13; // King = fully grown, ready to harvest

export interface Card {
  readonly id: string;
  readonly suit: Suit;
  readonly rank: number; // 1..13
  faceUp: boolean;
}

export function cropColor(suit: Suit): CropColor {
  return CROPS[suit].color;
}

export function rankLabel(rank: number): string {
  switch (rank) {
    case 1:
      return 'A';
    case 11:
      return 'J';
    case 12:
      return 'Q';
    case 13:
      return 'K';
    default:
      return String(rank);
  }
}

/** Create an ordered, face-down 52-card deck. */
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
