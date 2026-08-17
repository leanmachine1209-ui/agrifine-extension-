import {
  Card,
  SUIT_INFO,
  SUITS,
  RANK_MAX,
  EVENT_INFO,
  EVENT_COUNT,
  cardLabel,
  rankLabel,
  isFieldCard,
  isEvent,
  isRanked,
  isBoost,
} from '../game/cards';
import {
  GameState,
  PileRef,
  topOf,
  validTargets,
  targetKey,
  fieldTenure,
  ownedFarms,
  leasedFields,
  canRecallFromLease,
  hasCrew,
  advise,
  isWon,
  ownedCropFarms,
  ownedHerdFarms,
} from '../game/rules';

export interface RenderModel {
  state: GameState;
  selectedId: string | null;
}

function pileAttr(ref: PileRef): string {
  if (ref.type === 'field') return `data-dest="field" data-suit="${ref.suit}"`;
  if (ref.type === 'hold') return `data-dest="hold" data-col="${ref.index}"`;
  return `data-dest="${ref.type}"`;
}

function cardHTML(card: Card, opts: { selected?: boolean; action?: string; buried?: boolean }): string {
  if (!card.faceUp) {
    return `<div class="card card--back" aria-hidden="true"></div>`;
  }
  const selected = opts.selected ? ' is-selected' : '';
  const buried = opts.buried ? ' card--buried' : '';
  const action = opts.action ?? (isEvent(card) ? 'resolve' : 'select');

  if (isEvent(card)) {
    const info = EVENT_INFO[card.event];
    const polar = isBoost(card) ? 'boost' : 'hinder';
    if (action === 'noop') {
      return `
      <div class="card card--event card--${polar}${buried}" aria-label="${cardLabel(card)}">
        <span class="card-suit">${info.emoji}</span>
        <span class="card-rank">${info.label}</span>
      </div>`;
    }
    return `
    <button type="button" class="card card--event card--${polar}${selected}${buried}"
      data-action="${action}" data-id="${card.id}" aria-label="${cardLabel(card)}">
      <span class="card-suit">${info.emoji}</span>
      <span class="card-rank">${info.label}</span>
    </button>`;
  }

  const info = SUIT_INFO[card.suit];
  const fieldCls = isFieldCard(card) ? ' card--plot' : '';
  if (action === 'noop') {
    return `
    <div class="card card--${info.color}${fieldCls}${buried}" aria-label="${cardLabel(card)}">
      <span class="card-suit">${info.emoji}</span>
      <span class="card-rank">${rankLabel(card.rank)}</span>
    </div>`;
  }
  return `
    <button type="button" class="card card--${info.color}${fieldCls}${selected}${buried}"
      data-action="${action}" data-id="${card.id}" aria-label="${cardLabel(card)}">
      <span class="card-suit">${info.emoji}</span>
      <span class="card-rank">${rankLabel(card.rank)}</span>
    </button>`;
}

function fieldHTML(state: GameState, suit: (typeof SUITS)[number], valid: Set<string>, selectedId: string | null): string {
  const pile = state.fields[suit];
  const info = SUIT_INFO[suit];
  const top = topOf(pile);
  const tenure = fieldTenure(pile);
  const key = targetKey({ type: 'field', suit });
  const validCls = valid.has(key) ? ' is-valid' : '';
  const tenureCls = ` is-${tenure}`;
  const recall = tenure === 'leased' && canRecallFromLease(state);
  const pick =
    info.family === 'herd'
      ? `Pick ${info.label.toLowerCase()} · ${info.land}`
      : `Pick ${info.label.toLowerCase()} crops`;
  const label =
    tenure === 'owned'
      ? 'Owned farm'
      : tenure === 'leased'
        ? `Leased ${pile.length}/${RANK_MAX}`
        : pick;
  const body = top && isRanked(top)
    ? cardHTML(top, { action: recall ? 'select' : 'noop', selected: top.id === selectedId })
    : `<div class="slot-empty">${info.emoji}<small>${tenure === 'vacant' ? 'Plot' : 'Lease'}</small></div>`;
  return `
    <article class="field-slot field-slot--${info.color}${validCls}${tenureCls}" ${pileAttr({ type: 'field', suit })} data-action="drop">
      <header class="slot-head">${info.emoji} ${info.label} <b>${label}</b></header>
      ${body}
    </article>`;
}

function holdHTML(state: GameState, index: number, selectedId: string | null, valid: Set<string>): string {
  const pile = state.holding[index];
  const key = targetKey({ type: 'hold', index });
  const validCls = valid.has(key) ? ' is-valid' : '';
  const emptyCls = pile.length === 0 ? ' is-empty' : ' has-cards';
  const cards = pile.length
    ? pile
        .map((card, i) =>
          cardHTML(card, {
            selected: card.id === selectedId,
            buried: i < pile.length - 1,
            action: i < pile.length - 1 && !card.faceUp ? 'select' : undefined,
          }),
        )
        .join('')
    : '<div class="slot-empty slot-empty--hold"><small>Hold</small></div>';
  return `
    <article class="hold-col${validCls}${emptyCls}" ${pileAttr({ type: 'hold', index })} data-action="drop">
      <div class="hold-stack">${cards}</div>
    </article>`;
}

function cycleCopy(state: GameState): string {
  const owned = ownedFarms(state);
  const crops = ownedCropFarms(state);
  const herd = ownedHerdFarms(state);
  if (owned === 0) {
    return 'Play <b>F</b> to pick a plot: annual, perennial, beef pasture, or dairy barn.';
  }
  if (state.droughtMoves > 0) {
    return `Drought: fields closed for <b>${state.droughtMoves}</b> move${state.droughtMoves === 1 ? '' : 's'}.`;
  }
  if (owned >= 4) {
    return `Deeds are done. Resolve the remaining events (${state.resolved.length}/${EVENT_COUNT}).`;
  }
  const bits: string[] = [];
  if (owned >= 1) bits.push('Recall from a lease');
  if (herd >= 1) bits.push('herd manure is richer');
  if (crops >= 1) bits.push('crops feed herd F & 2s');
  if (owned >= 3) bits.push('crew plays F & 2s');
  return bits.join(' · ') + '.';
}

export function boardHTML(model: RenderModel): string {
  const s = model.state;
  const valid = new Set(model.selectedId ? validTargets(s, model.selectedId).map(targetKey) : []);
  const wasteTop = topOf(s.waste);
  const owned = ownedFarms(s);
  const leased = leasedFields(s);
  const tip = advise(s);

  const stockFace =
    s.stock.length > 0
      ? `<button type="button" class="card card--back card--stock" data-action="draw" aria-label="Draw from stock, ${s.stock.length} left"></button>`
      : s.waste.length > 0
        ? `<button type="button" class="slot-empty slot-empty--recycle" data-action="draw" aria-label="Recycle waste into stock">♻️</button>`
        : `<div class="slot-empty">—</div>`;

  const wasteFace = wasteTop
    ? cardHTML(wasteTop, { selected: wasteTop.id === model.selectedId })
    : `<div class="slot-empty"><small>Waste</small></div>`;

  const hint = model.selectedId
    ? valid.size
      ? 'Tap a glowing lease or holding pile. Prefer a move that flips a buried card.'
      : 'That card has nowhere to go — pick another, or draw.'
    : tip.text;

  const fertilizeDisabled = s.manure < 1 ? ' disabled' : '';

  return `
  <div class="game">
    <header class="topbar">
      <div class="brand"><span class="brand-mark">🌱</span> AGRITAIRE</div>
      <div class="hud">
        <div class="stat"><span>🏆</span><b>${s.score}</b></div>
        <div class="stat"><span>🃏</span><b>${s.moves}</b></div>
        <div class="stat"><span>🏡</span><b>${owned}/4</b></div>
        <div class="stat"><span>💩</span><b>${s.manure}</b></div>
      </div>
    </header>

    <section class="stock-row" aria-label="Stock, waste, and manure cycle">
      <div class="stock-box">
        <div class="bank-label">Stock · ${s.stock.length}</div>
        ${stockFace}
      </div>
      <div class="stock-box">
        <div class="bank-label">Waste · ${s.waste.length}</div>
        ${wasteFace}
      </div>
      <div class="stock-box stock-box--progress">
        <div class="bank-label">Cycle · ${leased} leased · events ${s.resolved.length}/${EVENT_COUNT}</div>
        <div class="bank-value">${owned}/4</div>
        <p class="season-copy">${cycleCopy(s)}</p>
      </div>
    </section>

    <section class="fields-row" aria-label="Fields">
      ${SUITS.map((suit) => fieldHTML(s, suit, valid, model.selectedId)).join('')}
    </section>

    <p class="upkeep">${hint}</p>

    <section class="holding-wrap" aria-label="Holding set">
      <div class="fields-slope" aria-hidden="true"></div>
      <div class="holding">
        ${s.holding.map((_, i) => holdHTML(s, i, model.selectedId, valid)).join('')}
      </div>
    </section>

    <footer class="controls">
      <div class="legend-row">
        ${SUITS.map((suit) => `<span class="legend"><i>${SUIT_INFO[suit].emoji}</i>${SUIT_INFO[suit].label}</span>`).join('')}
        <span class="legend">Crops overlay herd · 7 holds${hasCrew(s) ? ' · Crew on' : ''}${s.rainSafe ? ' · Rain' : ''}</span>
      </div>
      <div class="hand-actions">
        <button class="btn" data-action="auto" type="button">🌾 Play F &amp; 2s</button>
        <button class="btn" data-action="fertilize" type="button"${fertilizeDisabled}>💩 Fertilize</button>
        <button class="btn btn--primary" data-action="new" type="button">🌱 New Farm</button>
      </div>
    </footer>
  </div>`;
}

export function overOverlayHTML(state: GameState): string {
  if (!isWon(state)) return '';
  return `
  <div class="overlay" data-overlay>
    <div class="overlay-card">
      <div class="overlay-emoji">🌾🐄🏆</div>
      <h2>The farm cycles</h2>
      <p>All four plots are deeds, the 14 events are home, and manure has returned to the fields.</p>
      <div class="overlay-stats">
        <div><span>🏆 Score</span><b>${state.score}</b></div>
        <div><span>🃏 Moves</span><b>${state.moves}</b></div>
      </div>
      <button class="btn btn--primary" data-action="new" type="button">Start a New Farm</button>
    </div>
  </div>`;
}
