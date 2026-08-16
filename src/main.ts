import './style.css';
import { Suit } from './game/cards';
import {
  GameState,
  PileRef,
  newGame,
  cloneState,
  attemptMove,
  drawFromStock,
  sendToFoundation,
  autoHarvest,
  isWon,
  getMovableCards,
  validTargets,
} from './game/rules';
import { boardHTML, winOverlayHTML, formatClock, RenderModel } from './ui/render';

class Agritaire {
  private root: HTMLElement;
  private state: GameState;
  private selectedId: string | null = null;
  private history: GameState[] = [];
  private elapsed = 0;
  private running = false;
  private clock: number | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    this.state = newGame();
    this.startClock();
    this.running = true;
    this.bindEvents();
    this.render();
  }

  // ── Timer ────────────────────────────────────────────────────────────────
  private startClock(): void {
    if (this.clock !== null) return;
    this.clock = window.setInterval(() => {
      if (this.running) {
        this.elapsed++;
        this.patchClock();
      }
    }, 1000);
  }

  private patchClock(): void {
    const el = document.getElementById('hud-time');
    if (el) el.textContent = formatClock(this.elapsed);
  }

  // ── Move plumbing ─────────────────────────────────────────────────────────
  /** Run a mutator, recording an undo snapshot only if it changed the game. */
  private perform(mutator: () => boolean): boolean {
    const snapshot = cloneState(this.state);
    const changed = mutator();
    if (changed) this.history.push(snapshot);
    return changed;
  }

  private commit(): void {
    if (isWon(this.state)) {
      this.running = false;
      this.selectedId = null;
    }
    this.render();
  }

  private newGame(): void {
    this.state = newGame();
    this.selectedId = null;
    this.history = [];
    this.elapsed = 0;
    this.running = true;
    this.render();
  }

  private undo(): void {
    const prev = this.history.pop();
    if (!prev) return;
    this.state = prev;
    this.selectedId = null;
    if (!isWon(this.state)) this.running = true;
    this.render();
  }

  private draw(): void {
    if (this.perform(() => drawFromStock(this.state))) this.selectedId = null;
    this.commit();
  }

  private auto(): void {
    if (this.perform(() => autoHarvest(this.state) > 0)) this.selectedId = null;
    this.commit();
  }

  private handleTap(cardId: string | null, pile: PileRef | null): void {
    if (this.selectedId) {
      if (cardId && cardId === this.selectedId) {
        this.selectedId = null;
        this.render();
        return;
      }
      if (pile && (pile.type === 'foundation' || pile.type === 'tableau')) {
        const selected = this.selectedId;
        const moved = this.perform(() => attemptMove(this.state, selected, pile));
        if (moved) {
          this.selectedId = null;
          this.commit();
          return;
        }
      }
      // Move failed or non-target tapped: reselect if the tapped card is grabbable.
      this.selectedId = cardId && getMovableCards(this.state, cardId) ? cardId : null;
      this.render();
      return;
    }

    if (cardId && getMovableCards(this.state, cardId)) {
      this.selectedId = cardId;
      this.render();
    }
  }

  private sendToSilo(cardId: string): void {
    if (this.perform(() => sendToFoundation(this.state, cardId))) this.selectedId = null;
    this.commit();
  }

  // ── Events (delegated on the root) ─────────────────────────────────────────
  private bindEvents(): void {
    this.root.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const actionEl = target.closest<HTMLElement>('[data-action]');
      if (actionEl) {
        this.runAction(actionEl.dataset.action!);
        return;
      }
      const pileEl = target.closest<HTMLElement>('[data-pile]');
      const cardEl = target.closest<HTMLElement>('[data-card-id]');
      this.handleTap(
        cardEl?.getAttribute('data-card-id') ?? null,
        pileEl ? this.parsePile(pileEl) : null,
      );
    });

    this.root.addEventListener('dblclick', (e) => {
      const target = e.target as HTMLElement;
      const cardEl = target.closest<HTMLElement>('[data-card-id][data-face="up"]');
      if (cardEl) this.sendToSilo(cardEl.getAttribute('data-card-id')!);
    });
  }

  private runAction(action: string): void {
    switch (action) {
      case 'new':
        this.newGame();
        break;
      case 'undo':
        this.undo();
        break;
      case 'draw':
        this.draw();
        break;
      case 'auto':
        this.auto();
        break;
    }
  }

  private parsePile(el: HTMLElement): PileRef {
    const type = el.dataset.pile;
    switch (type) {
      case 'tableau':
        return { type: 'tableau', index: Number(el.dataset.index) };
      case 'foundation':
        return { type: 'foundation', suit: el.dataset.suit as Suit };
      case 'waste':
        return { type: 'waste' };
      default:
        return { type: 'stock' };
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  private render(): void {
    const model: RenderModel = {
      state: this.state,
      selectedId: this.selectedId,
      targets: this.selectedId ? validTargets(this.state, this.selectedId) : [],
    };
    let html = boardHTML(model);
    if (isWon(this.state)) html += winOverlayHTML(this.state, this.elapsed);
    this.root.innerHTML = html;
    this.patchClock();
  }
}

const app = document.getElementById('app');
if (app) new Agritaire(app);
