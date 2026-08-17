import { Card, SUIT_INFO, SUITS, Suit, RANK_MAX, cardLabel, rankLabel, isFieldCard } from '../game/cards';
import {
  GameState,
  PileRef,
  topOf,
  validTargets,
  targetKey,
  fieldProgress,
  suitsCompleted,
  isWon,
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
  const info = SUIT_INFO[card.suit];
  if (!card.faceUp) {
    return `<div class="card card--back" aria-hidden="true"></div>`;
  }
  const selected = opts.selected ? ' is-selected' : '';
  const fieldCls = isFieldCard(card) ? ' card--plot' : '';
  const action = opts.action ?? 'select';
  const buried = opts.buried ? ' card--buried' : '';
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

function fieldHTML(state: GameState, suit: Suit, valid: Set<string>): string {
  const pile = state.fields[suit];
  const info = SUIT_INFO[suit];
  const top = topOf(pile);
  const key = targetKey({ type: 'field', suit });
  const validCls = valid.has(key) ? ' is-valid' : '';
  const done = pile.length === RANK_MAX ? ' is-done' : '';
  const body = top
    ? cardHTML(top, { action: 'noop' })
    : `<div class="slot-empty">${info.emoji}<small>Field</small></div>`;
  return `
    <article class="field-slot field-slot--${info.color}${validCls}${done}" ${pileAttr({ type: 'field', suit })} data-action="drop">
      <header class="slot-head">${info.emoji} ${info.label} <b>${pile.length}/${RANK_MAX}</b></header>
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
          }),
        )
        .join('')
    : '<div class="slot-empty slot-empty--hold"><small>Hold</small></div>';
  return `
    <article class="hold-col${validCls}${emptyCls}" ${pileAttr({ type: 'hold', index })} data-action="drop">
      <div class="hold-stack">${cards}</div>
    </article>`;
}

export function boardHTML(model: RenderModel): string {
  const s = model.state;
  const valid = new Set(model.selectedId ? validTargets(s, model.selectedId).map(targetKey) : []);
  const wasteTop = topOf(s.waste);
  const progress = Math.round(fieldProgress(s) * 100);
  const done = suitsCompleted(s);

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
      ? 'Tap a glowing Field or holding pile to play the card.'
      : 'That card has nowhere to go — pick another, or draw.'
    : 'Tap a face-up card, then a Field (start with F) or a holding pile.';

  return `
  <div class="game">
    <header class="topbar">
      <div class="brand"><span class="brand-mark">🌱</span> AGRITAIRE</div>
      <div class="hud">
        <div class="stat"><span>🏆</span><b>${s.score}</b></div>
        <div class="stat"><span>🃏</span><b>${s.moves}</b></div>
        <div class="stat"><span>📐</span><b>${done}/4</b></div>
      </div>
    </header>

    <section class="stock-row" aria-label="Stock and waste">
      <div class="stock-box">
        <div class="bank-label">Stock · ${s.stock.length}</div>
        ${stockFace}
      </div>
      <div class="stock-box">
        <div class="bank-label">Waste · ${s.waste.length}</div>
        ${wasteFace}
      </div>
      <div class="stock-box stock-box--progress">
        <div class="bank-label">Fields set</div>
        <div class="bank-value">${progress}%</div>
        <p class="season-copy">Play a <b>F</b> Field to open a plot, then stack that 14-card suit in order.</p>
      </div>
    </section>

    <section class="fields-row" aria-label="Fields">
      ${SUITS.map((suit) => fieldHTML(s, suit, valid)).join('')}
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
        <span class="legend">F = Field · ★ = Harvest</span>
      </div>
      <div class="hand-actions">
        <button class="btn" data-action="auto" type="button">🌾 Auto-set Fields</button>
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
      <h2>All four fields harvested!</h2>
      <p>You stacked every 14-card suit on its Field.</p>
      <div class="overlay-stats">
        <div><span>🏆 Score</span><b>${state.score}</b></div>
        <div><span>🃏 Moves</span><b>${state.moves}</b></div>
      </div>
      <button class="btn btn--primary" data-action="new" type="button">Start a New Farm</button>
    </div>
  </div>`;
}
