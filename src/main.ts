import './style.css';
import {
  GameState,
  FoldMode,
  newGame,
  drawCard,
  placeFromHand,
  discardFromHand,
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

  /** The selected held card, defaulting to the first in hand. */
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
      // Selecting a held card (cards live inside the [data-hand] container).
      const handCard = target.closest<HTMLElement>('[data-hand] [data-card-id]');
      if (handCard && (!el || el.dataset.action !== 'place')) {
        this.selectedId = handCard.getAttribute('data-card-id');
        this.render();
        return;
      }
      if (!el) return;

      const action = el.dataset.action!;
      const row = el.dataset.row !== undefined ? Number(el.dataset.row) : -1;
      switch (action) {
        case 'draw':
          drawCard(this.state);
          break;
        case 'place': {
          const sel = this.currentSelection();
          if (sel && placeFromHand(this.state, sel, row)) this.selectedId = null;
          break;
        }
        case 'discard': {
          const sel = this.currentSelection();
          if (sel) discardFromHand(this.state, sel);
          this.selectedId = null;
          break;
        }
        case 'fold-grain':
          this.fold(row, 'grain');
          return;
        case 'fold-cattle':
          this.fold(row, 'cattle');
          return;
        case 'new':
          this.newGame();
          return;
      }
      this.render();
    });
  }

  private fold(rowIndex: number, mode: FoldMode): void {
    foldRow(this.state, rowIndex, mode);
    this.render();
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
