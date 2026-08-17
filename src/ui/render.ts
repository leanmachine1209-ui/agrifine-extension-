// Pure HTML builders for AGRITAIRE (v6): production chains + temperature gauge.

import { Card, SUIT_INFO, SEASON_INFO, SeasonName, isInstant } from '../game/cards';
import {
  GameState,
  Row,
  currentSeason,
  nextNeeded,
  canPlace,
  canFold,
  canDrawMiniDeck,
  anyValidPlacement,
  feedCost,
  sellValue,
  MINI_DECK_COST,
  CATTLE_CASHOUT,
  ROW_CAP,
} from '../game/rules';

export interface RenderModel {
  state: GameState;
  selectedId: string | null;
}

function cardFace(card: Card): { emoji: string; pip: string } {
  const info = SUIT_INFO[card.suit];
  if (card.suit === 'seed' && card.season) {
    return { emoji: info.emoji, pip: SEASON_INFO[card.season].emoji };
  }
  return { emoji: info.emoji, pip: info.label.slice(0, 4) };
}

function cardAria(card: Card): string {
  if (card.suit === 'seed' && card.season) return `${SEASON_INFO[card.season].label} Seed`;
  return SUIT_INFO[card.suit].label;
}

function cardHTML(card: Card, cls = '', action?: string): string {
  const info = SUIT_INFO[card.suit];
  const face = cardFace(card);
  if (action === 'noop') {
    return `
    <div class="card card--${info.color} ${cls}" aria-label="${cardAria(card)}">
      <span class="card-suit">${face.emoji}</span>
      <span class="card-rank">${face.pip}</span>
    </div>`;
  }
  const act = action ?? (isInstant(card) ? card.suit : 'select');
  return `
    <button type="button" class="card card--${info.color} ${cls}" data-card-id="${card.id}"
      data-action="${act}" data-id="${card.id}" aria-label="${cardAria(card)}">
      <span class="card-suit">${face.emoji}</span>
      <span class="card-rank">${face.pip}</span>
    </button>`;
}

function selectedCard(state: GameState, selectedId: string | null): Card | null {
  return state.hand.find((c) => c.id === selectedId) ?? state.hand[0] ?? null;
}

function rowHintText(row: Row, season: SeasonName): string {
  const need = nextNeeded(row);
  if (need === 'field') return 'needs Field';
  if (need === 'seed') return `needs Seed (${SEASON_INFO[season].label})`;
  if (need === 'equipment') return 'needs Equipment';
  const extras = row.cards.filter((c) => c.suit === 'livestock').length;
  return extras ? `ready to fold · ${extras} livestock bonus` : 'ready to fold';
}

function rowHTML(state: GameState, index: number, sel: Card | null, season: SeasonName): string {
  const row = state.rows[index];
  const placeable = Boolean(sel && !isInstant(sel) && canPlace(sel, row, season));
  const valid = placeable ? ' is-valid' : '';
  const ripe = canFold(row) ? ' is-ripe' : '';
  const cards = row.cards.length
    ? row.cards.map((cc) => cardHTML(cc, 'card--on-row', 'noop')).join('')
    : '<div class="row-empty">Empty field</div>';
  const fold = canFold(row)
    ? `<div class="row-fold">
         <button class="mini mini--grain" data-action="fold-grain" data-row="${index}" type="button">🌾 Harvest</button>
         <button class="mini mini--cattle" data-action="fold-cattle" data-row="${index}" type="button">🐄 Cattle</button>
       </div>`
    : `<div class="row-fold"><span class="row-hint">${rowHintText(row, season)}</span></div>`;
  return `
    <article class="row${valid}${ripe}" data-action="place" data-row="${index}">
      <header class="row-head"><span>Row ${index + 1}</span><small>${rowHintText(row, season)}</small></header>
      <div class="row-cards">${cards}</div>
      ${fold}
    </article>`;
}

function pastureHTML(state: GameState): string {
  if (state.herd.length === 0) {
    return '<div class="pasture-empty">no livestock yet — fold a chain as 🐄</div>';
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
  const season = currentSeason(s.season);
  const seasonMeta = SEASON_INFO[season];
  const sel = selectedCard(s, model.selectedId);
  const handEmpty = s.hand.length === 0;
  const feed = feedCost(s);

  const handCards = handEmpty
    ? '<div class="card card--empty"></div>'
    : s.hand
        .map((cc) =>
          cardHTML(cc, `${cc.id === sel?.id ? 'is-selected' : ''} ${isInstant(cc) ? 'card--instant' : ''}`),
        )
        .join('');

  const noPlay = !handEmpty && !anyValidPlacement(s);
  const hint = handEmpty
    ? `Season over — take the operating loan (−${MINI_DECK_COST}🌱) for a new mini-deck.`
    : sel?.suit === 'boom'
      ? 'Boom: pick grain or a cow — or sell this card.'
      : sel?.suit === 'expansion'
        ? s.rows.length < ROW_CAP
          ? 'Tap Expansion again to add a field row.'
          : 'Fields are at the cap — sell Expansion for seeds.'
        : noPlay
          ? 'No row fits — fold a chain, or sell this card for 🌱.'
          : 'Pick a card, then tap a row — or sell it for 🌱.';

  const boomChoice =
    sel?.suit === 'boom'
      ? `<div class="boom-choice">
           <button class="mini mini--grain" data-action="boom-grain" type="button">+1d6 grain</button>
           <button class="mini mini--cattle" data-action="boom-cow" type="button">+1 cow</button>
         </div>`
      : '';

  const actions = handEmpty
    ? `<button class="btn btn--seed" data-action="draw-mini" type="button" ${canDrawMiniDeck(s) ? '' : 'disabled'}>
         🌱 Take Loan · Draw Season ${s.season + 1} <small>(−${MINI_DECK_COST})</small>
       </button>`
    : `<button class="btn btn--sell" data-action="sell" type="button">💰 Sell <small>(+${sel ? sellValue(sel) : 1}🌱)</small></button>`;

  const suitLegend = (['field', 'seed', 'equipment', 'livestock', 'expansion', 'boom'] as const)
    .map((k) => `<span class="legend"><i>${SUIT_INFO[k].emoji}</i>${SUIT_INFO[k].label}</span>`)
    .join('');

  const pips = (['spring', 'summer', 'fall', 'winter'] as const)
    .map(
      (name) =>
        `<li class="${name === season ? 'on' : ''}" title="${SEASON_INFO[name].label}">${SEASON_INFO[name].emoji}</li>`,
    )
    .join('');

  return `
  <div class="game">
    <header class="topbar">
      <div class="brand"><span class="brand-mark">🌱</span> AGRITAIRE</div>
      <div class="hud">
        <div class="stat"><span>🏆</span><b>${s.score}</b></div>
        <div class="stat stat--seed"><span>🌱</span><b>${s.seeds}</b></div>
        <div class="stat"><span>📅</span><b>${s.season}</b></div>
      </div>
    </header>

    <section class="bank gauges" aria-label="Farm gauges">
      <div class="bank-box">
        <div class="bank-label gauge-kicker">🌾 Grain Bank</div>
        <div class="bank-value">${s.grain}<small>${feed > 0 ? ` · −${feed}/season` : ''}</small></div>
      </div>
      <div class="bank-box bank-box--herd">
        <div class="bank-label gauge-kicker">🐄 Pasture <span class="cashout-note">(+${CATTLE_CASHOUT} at cash-out)</span></div>
        <div class="pasture">${pastureHTML(s)}</div>
      </div>
      <div class="bank-box season-gauge" data-season="${season}">
        <div class="bank-label gauge-kicker">Temperature</div>
        <div class="bank-value season-value">${seasonMeta.emoji} ${seasonMeta.label}</div>
        <p class="season-copy">Only ${seasonMeta.label} Seed cards plant this mini-deck.</p>
        <ol class="season-pips">${pips}</ol>
      </div>
    </section>

    <section class="hand-panel">
      <div class="hand-cards" data-hand>${handCards}</div>
      <div class="hand-info">
        <div class="hand-title">Season ${s.season} · ${s.deck.length} in deck · hand ${s.hand.length}</div>
        <div class="hand-sub ${noPlay ? 'is-stuck' : ''}">${hint}</div>
        ${boomChoice}
        <div class="hand-actions">${actions}</div>
      </div>
    </section>

    <section class="fields-wrap" aria-label="Fields">
      <div class="fields-slope" aria-hidden="true"></div>
      <div class="rows">
        ${s.rows.map((_, i) => rowHTML(s, i, sel, season)).join('')}
      </div>
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
