import './style.css';
import {
  GameState,
  FoldMode,
  newGame,
  placeFromHand,
  sellCard,
  drawMiniDeck,
  foldRow,
} from './game/rules';
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
    return this.state.hand[0]?.id ?? null;
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
      const handCard = target.closest<HTMLElement>('[data-hand] [data-card-id]');
      if (handCard && (!el || el.dataset.action !== 'place')) {
        this.selectedId = handCard.getAttribute('data-card-id');
        this.render();
        return;
      }
      if (!el) return;

      const action = el.dataset.action!;
      const rowIndex = el.dataset.row !== undefined ? Number(el.dataset.row) : -1;
      switch (action) {
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
          drawMiniDeck(this.state);
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
