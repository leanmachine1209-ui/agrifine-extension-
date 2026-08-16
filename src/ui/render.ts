// Pure HTML builders for the AGRITAIRE board. The controller rebuilds the
// board on each move; a separate clock tick patches only the timer text.

import { Card, CROPS, SUITS, rankLabel, cropColor } from '../game/cards';
import {
  GameState,
  PileRef,
  farmGrowth,
  cropsHarvested,
} from '../game/rules';

export interface RenderModel {
  state: GameState;
  selectedId: string | null;
  targets: PileRef[];
}

function isTarget(targets: PileRef[], ref: PileRef): boolean {
  return targets.some((t) => {
    if (t.type !== ref.type) return false;
    if (t.type === 'foundation' && ref.type === 'foundation') return t.suit === ref.suit;
    if (t.type === 'tableau' && ref.type === 'tableau') return t.index === ref.index;
    return false;
  });
}

function cardHTML(card: Card, selectedId: string | null): string {
  if (!card.faceUp) {
    return `<div class="card card--down" data-card-id="${card.id}" data-face="down"><span class="card-back">🌱</span></div>`;
  }
  const color = cropColor(card.suit);
  const emoji = CROPS[card.suit].emoji;
  const label = rankLabel(card.rank);
  const selected = card.id === selectedId ? ' is-selected' : '';
  return `
    <div class="card card--up card--${color}${selected}" data-card-id="${card.id}" data-face="up" data-suit="${card.suit}">
      <span class="card-corner card-corner--tl">${label}<i>${emoji}</i></span>
      <span class="card-pip">${emoji}</span>
      <span class="card-corner card-corner--br">${label}<i>${emoji}</i></span>
    </div>`;
}

function siloHTML(state: GameState, suit: string, targets: PileRef[]): string {
  const s = suit as Card['suit'];
  const pile = state.foundations[s];
  const top = pile[pile.length - 1];
  const target = isTarget(targets, { type: 'foundation', suit: s }) ? ' is-target' : '';
  const inner = top
    ? cardHTML(top, null)
    : `<div class="slot-empty"><span>${CROPS[s].emoji}</span><small>seed</small></div>`;
  return `
    <div class="silo${target}" data-pile="foundation" data-suit="${s}" title="${CROPS[s].label} silo">
      ${inner}
    </div>`;
}

function tableauPileHTML(state: GameState, index: number, model: RenderModel): string {
  const pile = state.tableau[index];
  const target = isTarget(model.targets, { type: 'tableau', index }) ? ' is-target' : '';
  const cards = pile.map((c) => cardHTML(c, model.selectedId)).join('');
  const empty = pile.length === 0 ? '<div class="plot-empty"></div>' : '';
  return `<div class="tableau-pile${target}" data-pile="tableau" data-index="${index}">${empty}${cards}</div>`;
}

function farmPlotHTML(state: GameState, suit: string): string {
  const s = suit as Card['suit'];
  const len = state.foundations[s].length; // 0..13
  const emoji = CROPS[s].emoji;
  let stage = '🟫';
  if (len >= 13) stage = emoji;
  else if (len >= 9) stage = emoji;
  else if (len >= 4) stage = '🌿';
  else if (len >= 1) stage = '🌱';
  const mature = len >= 13 ? ' is-mature' : '';
  const pct = Math.round((len / 13) * 100);
  return `
    <div class="plot${mature}" title="${CROPS[s].label}: ${len}/13">
      <div class="plot-crop">${stage}</div>
      <div class="plot-bar"><span style="width:${pct}%"></span></div>
      <div class="plot-name">${CROPS[s].label}</div>
    </div>`;
}

export function boardHTML(model: RenderModel): string {
  const { state } = model;
  const growthPct = Math.round(farmGrowth(state) * 100);
  const harvested = cropsHarvested(state);

  const stockInner =
    state.stock.length > 0
      ? `<span class="card-back">🌾</span><small class="stock-count">${state.stock.length}</small>`
      : '<span class="recycle">♻︎</span>';
  const wasteTop = state.waste[state.waste.length - 1];

  return `
  <div class="game">
    <header class="topbar">
      <div class="brand"><span class="brand-mark">🌱</span> AGRITAIRE</div>
      <div class="hud">
        <div class="stat"><span class="stat-ico">🪙</span><b>${state.stats.coins}</b></div>
        <div class="stat"><span class="stat-ico">🌾</span><b>${harvested}/4</b></div>
        <div class="stat"><span class="stat-ico">👣</span><b>${state.stats.moves}</b></div>
        <div class="stat"><span class="stat-ico">⏱</span><b id="hud-time">0:00</b></div>
      </div>
    </header>

    <section class="farm" aria-label="Farm growth">
      <div class="farm-head">
        <span>Farm Growth</span>
        <span class="farm-pct">${growthPct}%</span>
      </div>
      <div class="growth-bar"><span style="width:${growthPct}%"></span></div>
      <div class="plots">
        ${SUITS.map((s) => farmPlotHTML(state, s)).join('')}
      </div>
    </section>

    <section class="uppers">
      <div class="stockwaste">
        <div class="pile stock" data-pile="stock" data-action="draw" title="Draw / recycle">${stockInner}</div>
        <div class="pile waste" data-pile="waste" title="Waste">
          ${wasteTop ? cardHTML(wasteTop, model.selectedId) : '<div class="slot-empty"><small>waste</small></div>'}
        </div>
      </div>
      <div class="silos" aria-label="Silos">
        ${SUITS.map((s) => siloHTML(state, s, model.targets)).join('')}
      </div>
    </section>

    <section class="tableau" aria-label="Fields">
      ${Array.from({ length: state.tableau.length }, (_, i) => tableauPileHTML(state, i, model)).join('')}
    </section>

    <footer class="controls">
      <button class="btn" data-action="new" type="button">🌱 New</button>
      <button class="btn" data-action="undo" type="button">↩︎ Undo</button>
      <button class="btn" data-action="draw" type="button">🃏 Draw</button>
      <button class="btn btn--primary" data-action="auto" type="button">🚜 Auto-Harvest</button>
    </footer>
  </div>`;
}

export function winOverlayHTML(state: GameState, seconds: number): string {
  const time = formatClock(seconds);
  return `
  <div class="overlay" data-overlay>
    <div class="overlay-card">
      <div class="overlay-emoji">🌻🚜🌾</div>
      <h2>Harvest Complete!</h2>
      <p>All four crops are in the silo.</p>
      <div class="overlay-stats">
        <div><span>🪙 Coins</span><b>${state.stats.coins}</b></div>
        <div><span>👣 Moves</span><b>${state.stats.moves}</b></div>
        <div><span>⏱ Time</span><b>${time}</b></div>
      </div>
      <button class="btn btn--primary" data-action="new" type="button">Plant a New Field</button>
    </div>
  </div>`;
}

export function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
