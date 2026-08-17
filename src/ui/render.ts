// Pure HTML builders for AGRITAIRE (v5): Grain Bank + living Pasture, seasons.

import { Card, SUIT_INFO, rankLabel } from '../game/cards';
import {
  GameState,
  Row,
  effectiveTop,
  canPlace,
  canFold,
  canDrawMiniDeck,
  anyValidPlacement,
  feedCost,
  sellValue,
  MINI_DECK_COST,
  CATTLE_CASHOUT,
} from '../game/rules';

export interface RenderModel {
  state: GameState;
  selectedId: string | null;
}

function cardHTML(card: Card, cls = ''): string {
  const info = SUIT_INFO[card.suit];
  return `
    <div class="card card--${info.color} ${cls}" data-card-id="${card.id}">
      <span class="card-rank">${rankLabel(card)}</span>
      <span class="card-suit">${info.emoji}</span>
    </div>`;
}

function selectedCard(state: GameState, selectedId: string | null): Card | null {
  return state.hand.find((c) => c.id === selectedId) ?? state.hand[0] ?? null;
}

function rowHintHTML(row: Row): string {
  if (row.cards.length === 0) return '<span class="row-hint">empty — play any card</span>';
  const next = effectiveTop(row)! + 1;
  if (next > 13) return '<span class="row-hint">maxed — fold it!</span>';
  return `<span class="row-hint">needs <b>${next}</b> or ⭐</span>`;
}

function rowHTML(state: GameState, index: number, sel: Card | null): string {
  const row = state.rows[index];
  const valid = sel && canPlace(sel, row) ? ' is-valid' : '';
  const cards = row.cards.length
    ? row.cards.map((cc) => cardHTML(cc)).join('')
    : '<div class="row-empty"></div>';
  const controls = canFold(row)
    ? `<div class="row-fold">
         <button class="mini mini--grain" data-action="fold-grain" data-row="${index}" title="Harvest to grain bank">🌾 Harvest</button>
         <button class="mini mini--cattle" data-action="fold-cattle" data-row="${index}" title="Raise as livestock">🐄 Cattle</button>
       </div>`
    : `<div class="row-fold">${rowHintHTML(row)}</div>`;
  return `
    <div class="row${valid}" data-action="place" data-row="${index}">
      <div class="row-cards">${cards}</div>
      ${controls}
    </div>`;
}

function pastureHTML(state: GameState): string {
  if (state.herd.length === 0) {
    return '<div class="pasture-empty">no livestock yet — fold a run as 🐄</div>';
  }
  return state.herd
    .slice()
    .sort((a, b) => a.life - b.life)
    .map(
      (cow) =>
        `<span class="cow" title="cashes out in ${cow.life} season(s)">🐄<i>${cow.life}</i></span>`,
    )
    .join('');
}

export function boardHTML(model: RenderModel): string {
  const s = model.state;
  const sel = selectedCard(s, model.selectedId);
  const handEmpty = s.hand.length === 0;
  const feed = feedCost(s);

  const handCards = handEmpty
    ? '<div class="card card--empty"></div>'
    : s.hand.map((cc) => cardHTML(cc, cc.id === sel?.id ? 'is-selected' : '')).join('');

  const noPlay = !handEmpty && !anyValidPlacement(s);
  const hint = handEmpty
    ? `Season over — take the operating loan (−${MINI_DECK_COST}🌱) for a new mini-deck.`
    : noPlay
      ? 'No row fits — fold a run, or sell this card for 🌱.'
      : 'Pick a card, then tap a row — or sell it for 🌱.';

  const actions = handEmpty
    ? `<button class="btn btn--seed" data-action="draw-mini" type="button" ${canDrawMiniDeck(s) ? '' : 'disabled'}>
         🌱 Take Loan · Draw Season ${s.season + 1} <small>(−${MINI_DECK_COST})</small>
       </button>`
    : `<button class="btn btn--sell" data-action="sell" type="button">💰 Sell <small>(+${sel ? sellValue(sel) : 1}🌱)</small></button>`;

  const suitLegend = (['livestock', 'grain', 'field', 'wild'] as const)
    .map((k) => `<span class="legend"><i>${SUIT_INFO[k].emoji}</i>${SUIT_INFO[k].label}</span>`)
    .join('');

  return `
  <div class="game">
    <header class="topbar">
      <div class="brand"><span class="brand-mark">🌱</span> AGRITAIRE</div>
      <div class="hud">
        <div class="stat"><span>🏆</span><b>${s.score}</b></div>
        <div class="stat stat--seed"><span>🌱</span><b>${s.seeds}</b></div>
      </div>
    </header>

    <section class="bank">
      <div class="bank-box">
        <div class="bank-label">🌾 Grain Bank</div>
        <div class="bank-value">${s.grain}<small>${feed > 0 ? ` · −${feed}/season` : ''}</small></div>
      </div>
      <div class="bank-box bank-box--herd">
        <div class="bank-label">🐄 Pasture <span class="cashout-note">(+${CATTLE_CASHOUT} at cash-out)</span></div>
        <div class="pasture">${pastureHTML(s)}</div>
      </div>
    </section>

    <section class="hand-panel">
      <div class="hand-cards" data-hand>${handCards}</div>
      <div class="hand-info">
        <div class="hand-title">Season ${s.season} · ${s.deck.length} in deck · hand ${s.hand.length}</div>
        <div class="hand-sub ${noPlay ? 'is-stuck' : ''}">${hint}</div>
        <div class="hand-actions">${actions}</div>
      </div>
    </section>

    <section class="rows">
      ${Array.from({ length: s.rows.length }, (_, i) => rowHTML(s, i, sel)).join('')}
    </section>

    <footer class="controls">
      <div class="legend-row">${suitLegend}</div>
      <button class="btn btn--primary" data-action="new" type="button">🌱 New Farm</button>
    </footer>
  </div>`;
}

export function overOverlayHTML(state: GameState): string {
  const failed = state.failed;
  const title = failed ? 'Bankrupt! 🥀' : 'Farm Complete! 🌻';
  const sub = failed
    ? "You couldn't fund the next season's mini-deck."
    : 'You worked the whole deck to the last card.';
  return `
  <div class="overlay" data-overlay>
    <div class="overlay-card">
      <div class="overlay-emoji">${failed ? '🏦🌧️' : '🌾🐄🏆'}</div>
      <h2>${title}</h2>
      <p>${sub}</p>
      <div class="overlay-stats">
        <div><span>🏆 Score</span><b>${state.score}</b></div>
        <div><span>🐄 Cashed</span><b>${state.cattleCashed}</b></div>
        <div><span>🌾 Grain</span><b>${state.grain}</b></div>
      </div>
      <button class="btn btn--primary" data-action="new" type="button">Start a New Farm</button>
    </div>
  </div>`;
}
