import './style.css';
import {
  GameState,
  FoldMode,
  newGame,
  placeHand,
  discardHand,
  foldRow,
} from './game/rules';
import { boardHTML, overOverlayHTML, RenderModel } from './ui/render';

export class Agritaire {
  private root: HTMLElement;
  private state: GameState;
  private seed: number | undefined;

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

  private newGame(): void {
    this.state = newGame(this.seed);
    this.render();
  }

  private bindEvents(): void {
    this.root.addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
      if (!el) return;
      const action = el.dataset.action!;
      const rowAttr = el.dataset.row;
      const row = rowAttr !== undefined ? Number(rowAttr) : -1;

      switch (action) {
        case 'place':
          placeHand(this.state, row);
          break;
        case 'discard':
          discardHand(this.state);
          break;
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
    const model: RenderModel = { state: this.state };
    let html = boardHTML(model);
    if (this.state.over) html += overOverlayHTML(this.state);
    this.root.innerHTML = html;
  }
}

const app = document.getElementById('app');
if (app) new Agritaire(app);
