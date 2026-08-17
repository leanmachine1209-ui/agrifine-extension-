import './style.css';
import {
  GameState,
  FoldMode,
  newGame,
  placeFromHand,
  sellCard,
  drawMiniDeck,
  foldRow,
  playExpansion,
  playBoom,
} from './game/rules';
import { isInstant } from './game/cards';
import { boardHTML, overOverlayHTML, RenderModel } from './ui/render';

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

  private currentSelection(): string | null {
    if (this.selectedId && this.state.hand.some((c) => c.id === this.selectedId)) {
      return this.selectedId;
    }
    return this.state.hand.find((c) => !isInstant(c))?.id ?? this.state.hand[0]?.id ?? null;
  }

  private newGame(): void {
    this.state = newGame(this.seed);
    this.selectedId = null;
    this.render();
  }

  private bindEvents(): void {
    this.root.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const el = target.closest<HTMLElement>('[data-action]');
      if (!el || el.dataset.action === 'noop') return;

      const action = el.dataset.action!;
      const rowIndex = el.dataset.row !== undefined ? Number(el.dataset.row) : -1;
      const id = el.dataset.id ?? el.dataset.cardId ?? undefined;

      switch (action) {
        case 'select':
          if (id) this.selectedId = id;
          break;
        case 'expansion': {
          if (!id) break;
          if (playExpansion(this.state, id)) this.selectedId = null;
          else this.selectedId = id;
          break;
        }
        case 'boom':
          if (id) this.selectedId = id;
          break;
        case 'boom-grain': {
          const sel = this.currentSelection();
          if (sel && playBoom(this.state, sel, 'grain')) this.selectedId = null;
          break;
        }
        case 'boom-cow': {
          const sel = this.currentSelection();
          if (sel && playBoom(this.state, sel, 'cow')) this.selectedId = null;
          break;
        }
        case 'place': {
          const sel = this.currentSelection();
          if (sel && placeFromHand(this.state, sel, rowIndex)) this.selectedId = null;
          break;
        }
        case 'sell': {
          const sel = this.currentSelection();
          if (sel) sellCard(this.state, sel);
          this.selectedId = null;
          break;
        }
        case 'draw-mini':
        case 'loan':
          drawMiniDeck(this.state);
          this.selectedId = null;
          break;
        case 'fold-grain':
          foldRow(this.state, rowIndex, 'grain' as FoldMode);
          break;
        case 'fold-cattle':
          foldRow(this.state, rowIndex, 'cattle' as FoldMode);
          break;
        case 'new':
          this.newGame();
          return;
      }
      this.render();
    });
  }

  private render(): void {
    const model: RenderModel = { state: this.state, selectedId: this.currentSelection() };
    let html = boardHTML(model);
    if (this.state.over) html += overOverlayHTML(this.state);
    this.root.innerHTML = html;
  }
}

const app = document.getElementById('app');
if (app) new Agritaire(app);
