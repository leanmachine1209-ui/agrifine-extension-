// Card model for AGRITAIRE — a circular farm on a Klondike grid.
//
// 66 cards: 4 land-use suits × 13 ranks (52) + 14 event wildcards.
// Rank 1 is the Field that picks that land use on a plot.
// Crops (annual / perennial) and herd land (pasture / barn) overlay
// each other the way red and black do in solitaire.
// Beef routes to pasture, dairy to the barn. Manure from the herd
// returns to the crop fields — the late-game is that cycle, not extra columns.

export type Suit = 'annual' | 'perennial' | 'pasture' | 'barn';
export type Family = 'crop' | 'herd';
export type EventKind = 'rain' | 'bumper' | 'fair' | 'drought' | 'blight' | 'storm' | 'lien';
export type EventPolarity = 'boost' | 'hinder';

export interface SuitInfo {
  readonly suit: Suit;
  readonly emoji: string;
  readonly label: string;
  readonly land: string;
  readonly family: Family;
  readonly color: string;
}

export const SUIT_INFO: Record<Suit, SuitInfo> = {
  annual: {
    suit: 'annual',
    emoji: '🌾',
    label: 'Annual',
    land: 'crop field',
    family: 'crop',
    color: 'annual',
  },
  perennial: {
    suit: 'perennial',
    emoji: '🍎',
    label: 'Perennial',
    land: 'crop field',
    family: 'crop',
    color: 'perennial',
  },
  pasture: {
    suit: 'pasture',
    emoji: '🐄',
    label: 'Pasture',
    land: 'beef',
    family: 'herd',
    color: 'pasture',
  },
  barn: {
    suit: 'barn',
    emoji: '🥛',
    label: 'Barn',
    land: 'dairy',
    family: 'herd',
    color: 'barn',
  },
};

export const SUITS: Suit[] = ['annual', 'perennial', 'pasture', 'barn'];
export const CROP_SUITS: Suit[] = ['annual', 'perennial'];
export const HERD_SUITS: Suit[] = ['pasture', 'barn'];

export const RANK_MIN = 1;
export const RANK_MAX = 13;
export const FIELD_RANK = 1;

export const EVENT_KINDS: EventKind[] = [
  'rain',
  'bumper',
  'fair',
  'drought',
  'blight',
  'storm',
  'lien',
];
export const EVENT_COPIES = 2;
export const EVENT_COUNT = EVENT_KINDS.length * EVENT_COPIES;
export const RANKED_COUNT = SUITS.length * RANK_MAX;
export const DECK_SIZE = RANKED_COUNT + EVENT_COUNT;

export interface EventInfo {
  readonly kind: EventKind;
  readonly emoji: string;
  readonly label: string;
  readonly polarity: EventPolarity;
  readonly hint: string;
}

export const EVENT_INFO: Record<EventKind, EventInfo> = {
  rain: { kind: 'rain', emoji: '🌧️', label: 'Rain', polarity: 'boost', hint: 'Next field play is safe' },
  bumper: { kind: 'bumper', emoji: '🌽', label: 'Bumper', polarity: 'boost', hint: 'Auto-play F and 2s' },
  fair: { kind: 'fair', emoji: '🎪', label: 'Fair', polarity: 'boost', hint: 'Extra draw from stock' },
  drought: {
    kind: 'drought',
    emoji: '☀️',
    label: 'Drought',
    polarity: 'hinder',
    hint: 'Fields close for 3 moves',
  },
  blight: {
    kind: 'blight',
    emoji: '🦠',
    label: 'Blight',
    polarity: 'hinder',
    hint: 'A leased top returns to waste',
  },
  storm: {
    kind: 'storm',
    emoji: '🌪️',
    label: 'Storm',
    polarity: 'hinder',
    hint: 'A hold top blows onto waste',
  },
  lien: { kind: 'lien', emoji: '📜', label: 'Lien', polarity: 'hinder', hint: 'No recall for 4 moves' },
};

export interface RankedCard {
  readonly kind: 'ranked';
  readonly id: string;
  readonly suit: Suit;
  readonly rank: number;
  faceUp: boolean;
}

export interface EventCard {
  readonly kind: 'event';
  readonly id: string;
  readonly event: EventKind;
  readonly copy: number;
  faceUp: boolean;
}

export type Card = RankedCard | EventCard;

export function isRanked(card: Card): card is RankedCard {
  return card.kind === 'ranked';
}

export function isEvent(card: Card): card is EventCard {
  return card.kind === 'event';
}

export function isBoost(card: Card): boolean {
  return isEvent(card) && EVENT_INFO[card.event].polarity === 'boost';
}

export function isHinder(card: Card): boolean {
  return isEvent(card) && EVENT_INFO[card.event].polarity === 'hinder';
}

export function familyOf(suit: Suit): Family {
  return SUIT_INFO[suit].family;
}

export function isCropSuit(suit: Suit): boolean {
  return familyOf(suit) === 'crop';
}

export function isHerdSuit(suit: Suit): boolean {
  return familyOf(suit) === 'herd';
}

export function isFieldCard(card: Card): boolean {
  return isRanked(card) && card.rank === FIELD_RANK;
}

export function rankLabel(rank: number): string {
  if (rank === 1) return 'F';
  if (rank === 11) return 'J';
  if (rank === 12) return 'Q';
  if (rank === 13) return '★';
  return String(rank);
}

export function cardLabel(card: Card): string {
  if (isEvent(card)) {
    const info = EVENT_INFO[card.event];
    return `${info.label} (${info.polarity})`;
  }
  const info = SUIT_INFO[card.suit];
  if (card.rank === FIELD_RANK) return `${info.label} Field · ${info.land}`;
  if (card.rank === RANK_MAX) return `${info.label} Harvest`;
  return `${info.label} ${rankLabel(card.rank)}`;
}

/** Ordered 66-card deck: 4×13 ranked land uses + 14 event wildcards. */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = RANK_MIN; rank <= RANK_MAX; rank++) {
      deck.push({ kind: 'ranked', id: `${suit}-${rank}`, suit, rank, faceUp: false });
    }
  }
  for (const event of EVENT_KINDS) {
    for (let copy = 1; copy <= EVENT_COPIES; copy++) {
      deck.push({ kind: 'event', id: `event-${event}-${copy}`, event, copy, faceUp: false });
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
