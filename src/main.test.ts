// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { Agritaire } from './main';

function click(el: Element | null): void {
  el?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

describe('tap-to-move UI wiring', () => {
  let root: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    root = document.getElementById('app')!;
  });

  it('renders the board with a fresh seeded deal', () => {
    new Agritaire(root, 1);
    expect(root.querySelector('.brand')?.textContent).toContain('AGRITAIRE');
    // seed 1 puts the Tomato Ace and Wheat Ace face-up on tableau tops
    expect(root.querySelector('[data-card-id="tomato-1"][data-face="up"]')).toBeTruthy();
    expect(root.querySelector('[data-card-id="wheat-1"][data-face="up"]')).toBeTruthy();
    // coins start at 0
    expect(root.querySelector('.hud .stat b')?.textContent).toBe('0');
  });

  it('selects a card on tap and highlights its valid silo', () => {
    new Agritaire(root, 1);
    click(root.querySelector('[data-card-id="tomato-1"]'));
    expect(
      root.querySelector('[data-card-id="tomato-1"]')?.classList.contains('is-selected'),
    ).toBe(true);
    expect(
      root
        .querySelector('[data-pile="foundation"][data-suit="tomato"]')
        ?.classList.contains('is-target'),
    ).toBe(true);
  });

  it('harvests an Ace into its silo via tap-to-move and awards coins', () => {
    new Agritaire(root, 1);
    click(root.querySelector('[data-card-id="tomato-1"]')); // pick up
    click(root.querySelector('[data-pile="foundation"][data-suit="tomato"]')); // place

    const silo = root.querySelector('[data-pile="foundation"][data-suit="tomato"]');
    expect(silo?.querySelector('[data-card-id="tomato-1"]')).toBeTruthy();
    expect(root.querySelector('.hud .stat b')?.textContent).toBe('5');
  });

  it('draws from the stock into the waste', () => {
    new Agritaire(root, 1);
    const before = root.querySelector('.stock-count')?.textContent;
    click(root.querySelector('[data-pile="stock"]'));
    const after = root.querySelector('.stock-count')?.textContent;
    expect(Number(after)).toBe(Number(before) - 1);
    expect(root.querySelector('.waste .card--up')).toBeTruthy();
  });

  it('auto-harvest sends reachable seeds to silos', () => {
    new Agritaire(root, 1);
    click(root.querySelector('[data-action="auto"]'));
    // seed 1 exposes at least the two Aces; auto-harvest banks them
    const coins = Number(root.querySelector('.hud .stat b')?.textContent);
    expect(coins).toBeGreaterThanOrEqual(10);
  });
});
