import './style.css';
import { Suit } from './game/cards';
import {
  GameState,
  PileRef,
  newGame,
  moveCards,
  drawFromStock,
  sendToField,
  autoPlayFields,
  developAfterMove,
  resolveEvent,
  fertilize,
  isWon,
} from './game/rules';
import { boardHTML, overOverlayHTML, RenderModel } from './ui/render';

function destFromEl(el: HTMLElement): PileRef | null {
  const dest = el.dataset.dest;
  if (dest === 'field' && el.dataset.suit) return { type: 'field', suit: el.dataset.suit as Suit };
  if (dest === 'hold' && el.dataset.col !== undefined) return { type: 'hold', index: Number(el.dataset.col) };
  return null;
}

export class Agritaire {
  private root: HTMLElement;
  private state: GameState;
  private seed: number | undefined;
  private selectedId: string | null = null;

  constructor(root: HTMLElement, seedOverride?: number) {
    this.root = root;
    const raw = new URLSearchParams(location.search).get('seed');
    const fromUrl =
      raw !== null && raw.trim() !== '' && Number.isFinite(Number(raw)) ? Number(raw) : undefined;
    this.seed = seedOverride ?? fromUrl;
    this.state = newGame(this.seed);
    this.bindEvents();
    this.render();
  }

  private restart(): void {
    this.state = newGame(this.seed);
    this.selectedId = null;
    this.render();
  }

  private bindEvents(): void {
    this.root.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const el = target.closest<HTMLElement>('[data-action]');
      if (!el) return;
      if (el instanceof HTMLButtonElement && el.disabled) return;

      const action = el.dataset.action!;
      const id = el.dataset.id;

      switch (action) {
        case 'select':
          if (!id) break;
          if (this.selectedId === id) {
            if (sendToField(this.state, id)) developAfterMove(this.state);
            this.selectedId = null;
            break;
          }
          if (this.selectedId && sendToField(this.state, this.selectedId)) {
            developAfterMove(this.state);
            this.selectedId = null;
            break;
          }
          this.selectedId = id;
          break;
        case 'drop': {
          const dest = destFromEl(el);
          if (dest && this.selectedId && moveCards(this.state, this.selectedId, dest)) {
            developAfterMove(this.state);
            this.selectedId = null;
          }
          break;
        }
        case 'draw':
          drawFromStock(this.state);
          developAfterMove(this.state);
          this.selectedId = null;
          break;
        case 'resolve':
          if (id && resolveEvent(this.state, id)) developAfterMove(this.state);
          this.selectedId = null;
          break;
        case 'fertilize':
          if (fertilize(this.state)) developAfterMove(this.state);
          this.selectedId = null;
          break;
        case 'auto':
          autoPlayFields(this.state);
          developAfterMove(this.state);
          this.selectedId = null;
          break;
        case 'new':
          this.restart();
          return;
      }
      this.render();
    });
  }

  private render(): void {
    const model: RenderModel = { state: this.state, selectedId: this.selectedId };
    let html = boardHTML(model);
    if (isWon(this.state)) html += overOverlayHTML(this.state);
    this.root.innerHTML = html;
  }
}

const app = document.getElementById('app');
if (app) new Agritaire(app);
