// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { Agritaire } from './main';

function click(el: Element | null): void {
  el?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

describe('AGRITAIRE UI wiring', () => {
  let root: HTMLElement;
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    root = document.getElementById('app')!;
  });

  it('renders the board: brand, a hand card, 4 rows, zeroed HUD', () => {
    new Agritaire(root, 3);
    expect(root.querySelector('.brand')?.textContent).toContain('AGRITAIRE');
    expect(root.querySelector('.hand-slot .card-rank')).toBeTruthy();
    expect(root.querySelectorAll('.row')).toHaveLength(4);
    expect(root.querySelector('.hud .stat b')?.textContent).toBe('0'); // score
    expect(root.querySelector('.stat--warn b')?.textContent).toBe('0/12'); // spoiled
  });

  it('places the hand on an empty row and advances the turn', () => {
    new Agritaire(root, 3);
    click(root.querySelector('[data-action="place"][data-row="0"]'));
    expect(root.querySelector('.row[data-row="0"] .row-cards .card')).toBeTruthy();
    expect(root.querySelector('.hand-info .hand-title')?.textContent).toContain('Turn 2');
  });

  it('discard loses the card and increments the spoiled counter', () => {
    new Agritaire(root, 3);
    click(root.querySelector('[data-action="discard"]'));
    expect(root.querySelector('.stat--warn b')?.textContent).toBe('1/12');
    expect(root.querySelector('.hand-info .hand-title')?.textContent).toContain('Turn 2');
  });

  it('New Farm resets the board', () => {
    new Agritaire(root, 3);
    click(root.querySelector('[data-action="discard"]'));
    click(root.querySelector('[data-action="place"][data-row="1"]'));
    click(root.querySelector('[data-action="new"]'));
    expect(root.querySelector('.hand-info .hand-title')?.textContent).toContain('Turn 1');
    expect(root.querySelector('.stat--warn b')?.textContent).toBe('0/12');
    expect(root.querySelectorAll('.row .row-cards .card')).toHaveLength(0);
  });
});
