// Pure HTML builders for the AGRITAIRE (v2) turn-based board.

import { Card, SUIT_INFO, rankLabel } from '../game/cards';
import {
  GameState,
  Row,
  capacity,
  effectiveTop,
  canPlace,
  canFold,
  isStuck,
  SPOIL_LIMIT,
} from '../game/rules';

export interface RenderModel {
  state: GameState;
}

function cardHTML(card: Card, extra = ''): string {
  const info = SUIT_INFO[card.suit];
  return `
    <div class="card card--${info.color} ${extra}" data-card-id="${card.id}">
      <span class="card-rank">${rankLabel(card)}</span>
      <span class="card-suit">${info.emoji}</span>
    </div>`;
}

function rowHintHTML(row: Row): string {
  if (row.cards.length === 0) return '<span class="row-hint">empty — play any card</span>';
  const next = effectiveTop(row)! + 1;
  if (next > 13) return '<span class="row-hint">maxed — fold it!</span>';
  return `<span class="row-hint">needs <b>${next}</b> or ⭐</span>`;
}

function rowHTML(state: GameState, index: number): string {
  const row = state.rows[index];
  const valid = state.hand && canPlace(state.hand, row) ? ' is-valid' : '';
  const cards = row.cards.length
    ? row.cards.map((c) => cardHTML(c)).join('')
    : '<div class="row-empty"></div>';

  const controls = canFold(row)
    ? `<div class="row-fold">
         <button class="mini mini--grain" data-action="fold-grain" data-row="${index}" title="Harvest to grain bank">🌾 Harvest</button>
         <button class="mini mini--cattle" data-action="fold-cattle" data-row="${index}" title="Bank as cattle">🐄 Cattle</button>
       </div>`
    : `<div class="row-fold">${rowHintHTML(row)}</div>`;

  return `
    <div class="row${valid}" data-action="place" data-row="${index}">
      <div class="row-cards">${cards}</div>
      ${controls}
    </div>`;
}

export function boardHTML(model: RenderModel): string {
  const s = model.state;
  const cap = capacity(s);
  const stuck = isStuck(s);

  const handHTML = s.hand
    ? cardHTML(s.hand, 'card--hand')
    : '<div class="card card--empty card--hand"></div>';

  const suitLegend = (['livestock', 'grain', 'field', 'wild'] as const)
    .map((k) => `<span class="legend"><i>${SUIT_INFO[k].emoji}</i>${SUIT_INFO[k].label}</span>`)
    .join('');

  return `
  <div class="game">
    <header class="topbar">
      <div class="brand"><span class="brand-mark">🌱</span> AGRITAIRE</div>
      <div class="hud">
        <div class="stat"><span>🏆</span><b>${s.score}</b></div>
        <div class="stat"><span>🌾</span><b>${s.grain}</b></div>
        <div class="stat"><span>🐄</span><b>${s.herd}/${cap}</b></div>
        <div class="stat stat--warn"><span>🗑</span><b>${s.spoiled}/${SPOIL_LIMIT}</b></div>
      </div>
    </header>

    <section class="hand-panel">
      <div class="hand-slot">${handHTML}</div>
      <div class="hand-info">
        <div class="hand-title">Turn ${s.turn} · ${s.deck.length} left in deck</div>
        <div class="hand-sub ${stuck ? 'is-stuck' : ''}">
          ${stuck ? 'No legal play — this card will spoil.' : 'Place this card on a row, or discard it.'}
        </div>
        <button class="btn btn--discard" data-action="discard" type="button">🗑 Discard (lose card)</button>
      </div>
    </section>

    <section class="rows">
      ${Array.from({ length: s.rows.length }, (_, i) => rowHTML(s, i)).join('')}
    </section>

    <footer class="controls">
      <div class="legend-row">${suitLegend}</div>
      <button class="btn btn--primary" data-action="new" type="button">🌱 New Farm</button>
    </footer>
  </div>`;
}

export function overOverlayHTML(state: GameState): string {
  const failed = state.failed;
  const title = failed ? 'Farm Failed 🥀' : 'Season Complete! 🌻';
  const sub = failed
    ? `Too many crops spoiled (${state.spoiled}).`
    : 'You worked the whole deck.';
  return `
  <div class="overlay" data-overlay>
    <div class="overlay-card">
      <div class="overlay-emoji">${failed ? '🌧️🚜' : '🌾🐄🏆'}</div>
      <h2>${title}</h2>
      <p>${sub}</p>
      <div class="overlay-stats">
        <div><span>🏆 Score</span><b>${state.score}</b></div>
        <div><span>🐄 Herd</span><b>${state.herd}</b></div>
        <div><span>🌾 Grain</span><b>${state.grain}</b></div>
      </div>
      <button class="btn btn--primary" data-action="new" type="button">Start a New Farm</button>
    </div>
  </div>`;
}
