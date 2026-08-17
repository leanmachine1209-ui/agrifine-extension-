// Pure HTML builders for AGRITAIRE (v7): vertical suit stacks + collapsing assets.

import { Card, SUIT_INFO, SEASON_INFO, SeasonName, Suit, isInstant, assetTier } from '../game/cards';
import {
  GameState,
  Column,
  currentSeason,
  canPlace,
  canFold,
  canDrawMiniDeck,
  anyValidPlacement,
  feedCost,
  sellValue,
  loanCost,
  capitalBurn,
  barnCapacity,
  tractorPower,
  CATTLE_CASHOUT,
  COLUMN_CAP,
  MERGE_COUNT,
} from '../game/rules';

export interface RenderModel {
  state: GameState;
  selectedId: string | null;
}

function cardFace(card: Card): { emoji: string; pip: string } {
  const asset = assetTier(card);
  if (asset) {
    if (card.suit === 'seed' && card.season && card.tier === 1) {
      return { emoji: asset.emoji, pip: SEASON_INFO[card.season].emoji };
    }
    return { emoji: asset.emoji, pip: asset.short };
  }
  const info = SUIT_INFO[card.suit];
  return { emoji: info.emoji, pip: info.label.slice(0, 4) };
}

function cardAria(card: Card): string {
  const asset = assetTier(card);
  if (card.suit === 'seed' && card.season && card.tier === 1) {
    return `${SEASON_INFO[card.season].label} Seed`;
  }
  if (asset) return asset.label;
  return SUIT_INFO[card.suit].label;
}

function cardHTML(card: Card, cls = '', action?: string): string {
  const info = SUIT_INFO[card.suit];
  const face = cardFace(card);
  const tierCls = card.tier > 1 ? ` card--tier-${card.tier}` : '';
  if (action === 'noop') {
    return `
    <div class="card card--${info.color}${tierCls} ${cls}" aria-label="${cardAria(card)}">
      <span class="card-suit">${face.emoji}</span>
      <span class="card-rank">${face.pip}</span>
    </div>`;
  }
  const act = action ?? (isInstant(card) ? card.suit : 'select');
  return `
    <button type="button" class="card card--${info.color}${tierCls} ${cls}" data-card-id="${card.id}"
      data-action="${act}" data-id="${card.id}" aria-label="${cardAria(card)}">
      <span class="card-suit">${face.emoji}</span>
      <span class="card-rank">${face.pip}</span>
    </button>`;
}

function selectedCard(state: GameState, selectedId: string | null): Card | null {
  return state.hand.find((c) => c.id === selectedId) ?? state.hand[0] ?? null;
}

function columnTitle(col: Column, index: number): string {
  if (col.suit) return SUIT_INFO[col.suit].label;
  return index < 4 ? 'Open' : 'Extra';
}

function columnHint(col: Column, season: SeasonName): string {
  if (!col.suit) return 'play any suit to lock';
  if (col.suit === 'field') {
    return col.cards.length
      ? `${MERGE_COUNT} same → bigger barn`
      : 'wood barn · 3 → steel';
  }
  if (col.suit === 'equipment') {
    return col.cards.length
      ? `${MERGE_COUNT} same → bigger tractor`
      : 'small tractor · 3 → utility';
  }
  if (col.suit === 'seed') {
    return col.cards.length
      ? 'ready to harvest'
      : `needs ${SEASON_INFO[season].label} seed`;
  }
  return col.cards.length ? 'fold into pasture' : 'stack cattle here';
}

function columnHTML(state: GameState, index: number, sel: Card | null, season: SeasonName): string {
  const col = state.columns[index];
  const placeable = Boolean(sel && !isInstant(sel) && canPlace(sel, col, season));
  const valid = placeable ? ' is-valid' : '';
  const ripe = canFold(col, 'grain') || canFold(col, 'cattle') ? ' is-ripe' : '';
  const suitCls = col.suit ? ` suit-col--${col.suit}` : ' suit-col--open';
  const cards = col.cards.length
    ? col.cards.map((cc) => cardHTML(cc, 'card--on-row', 'noop')).join('')
    : '<div class="col-empty">Empty</div>';

  let fold = `<div class="col-fold"><span class="col-hint">${columnHint(col, season)}</span></div>`;
  if (canFold(col, 'grain')) {
    fold = `<div class="col-fold">
      <button class="mini mini--grain" data-action="fold-grain" data-col="${index}" type="button">🌾 Harvest</button>
    </div>`;
  } else if (canFold(col, 'cattle')) {
    fold = `<div class="col-fold">
      <button class="mini mini--cattle" data-action="fold-cattle" data-col="${index}" type="button">🐄 Cattle</button>
    </div>`;
  }

  const emoji = col.suit ? SUIT_INFO[col.suit].emoji : '📐';
  return `
    <article class="suit-col${suitCls}${valid}${ripe}" data-action="place" data-col="${index}">
      <header class="col-head"><span>${emoji} ${columnTitle(col, index)}</span></header>
      <div class="suit-stack">${cards}</div>
      ${fold}
    </article>`;
}

function pastureHTML(state: GameState): string {
  if (state.herd.length === 0) {
    return '<div class="pasture-empty">no livestock yet — fold 🐄 into pasture</div>';
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

function upkeepCopy(state: GameState): string {
  const burn = capitalBurn(state);
  if (burn.total === 0) return 'No capital upkeep this loan.';
  const bits: string[] = [];
  if (burn.barns) bits.push(burn.idleBarns ? `idle barns −${burn.barns}🌱` : `barns −${burn.barns}🌱`);
  if (burn.tractors) {
    bits.push(burn.idleTractors ? `idle tractors −${burn.tractors}🌱` : `tractors −${burn.tractors}🌱`);
  }
  return bits.join(' · ');
}

export function boardHTML(model: RenderModel): string {
  const s = model.state;
  const season = currentSeason(s.season);
  const seasonMeta = SEASON_INFO[season];
  const sel = selectedCard(s, model.selectedId);
  const handEmpty = s.hand.length === 0;
  const feed = feedCost(s);
  const burn = capitalBurn(s);
  const cost = loanCost(s);
  const cap = barnCapacity(s);
  const power = tractorPower(s);

  const handCards = handEmpty
    ? '<div class="card card--empty"></div>'
    : s.hand
        .map((cc) =>
          cardHTML(cc, `${cc.id === sel?.id ? 'is-selected' : ''} ${isInstant(cc) ? 'card--instant' : ''}`),
        )
        .join('');

  const noPlay = !handEmpty && !anyValidPlacement(s);
  const hint = handEmpty
    ? `Season over — take the operating loan (−${cost}🌱) for a new mini-deck.`
    : sel?.suit === 'boom'
      ? 'Boom: pick grain or a cow — or sell this card.'
      : sel?.suit === 'expansion'
        ? s.columns.length < COLUMN_CAP
          ? 'Tap Expansion again to add an extra column.'
          : 'Columns are at the cap — sell Expansion for seeds.'
        : noPlay
          ? 'No column fits — harvest, fold cattle, or sell this card for 🌱.'
          : 'Pick a card, then tap its suit column — 3 of a kind collapse into a bigger asset.';

  const boomChoice =
    sel?.suit === 'boom'
      ? `<div class="boom-choice">
           <button class="mini mini--grain" data-action="boom-grain" type="button">+1d6 grain</button>
           <button class="mini mini--cattle" data-action="boom-cow" type="button">+1 cow</button>
         </div>`
      : '';

  const actions = handEmpty
    ? `<button class="btn btn--seed" data-action="draw-mini" type="button" ${canDrawMiniDeck(s) ? '' : 'disabled'}>
         🌱 Take Loan · Season ${s.season + 1} <small>(−${cost})</small>
       </button>`
    : `<button class="btn btn--sell" data-action="sell" type="button">💰 Sell <small>(+${sel ? sellValue(sel) : 1}🌱)</small></button>`;

  const suitLegend = (['field', 'seed', 'equipment', 'livestock', 'expansion', 'boom'] as Suit[])
    .map((k) => `<span class="legend"><i>${SUIT_INFO[k].emoji}</i>${SUIT_INFO[k].label}</span>`)
    .join('');

  const pips = (['spring', 'summer', 'fall', 'winter'] as const)
    .map(
      (name) =>
        `<li class="${name === season ? 'on' : ''}" title="${SEASON_INFO[name].label}">${SEASON_INFO[name].emoji}</li>`,
    )
    .join('');

  const idleCls = burn.idleBarns || burn.idleTractors ? ' is-idle' : '';

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
        <div class="bank-label gauge-kicker">🐄 Pasture <span class="cashout-note">${s.herd.length}/${cap} · +${CATTLE_CASHOUT} cash-out</span></div>
        <div class="pasture">${pastureHTML(s)}</div>
      </div>
      <div class="bank-box season-gauge" data-season="${season}">
        <div class="bank-label gauge-kicker">Temperature</div>
        <div class="bank-value season-value">${seasonMeta.emoji} ${seasonMeta.label}</div>
        <p class="season-copy">Only ${seasonMeta.label} Seed cards plant this mini-deck. Tractors ${power}.</p>
        <ol class="season-pips">${pips}</ol>
      </div>
    </section>

    <p class="upkeep${idleCls}" data-upkeep>${upkeepCopy(s)}</p>

    <section class="hand-panel">
      <div class="hand-cards" data-hand>${handCards}</div>
      <div class="hand-info">
        <div class="hand-title">Season ${s.season} · ${s.deck.length} in deck · hand ${s.hand.length}</div>
        <div class="hand-sub ${noPlay ? 'is-stuck' : ''}">${hint}</div>
        ${boomChoice}
        <div class="hand-actions">${actions}</div>
      </div>
    </section>

    <section class="fields-wrap" aria-label="Suit columns">
      <div class="fields-slope" aria-hidden="true"></div>
      <div class="suits">
        ${s.columns.map((_, i) => columnHTML(s, i, sel, season)).join('')}
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
    ? "You couldn't fund the next season — idle barns and tractors burn tokens when crops and cattle aren't paying."
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
