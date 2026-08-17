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

  it('renders board with seed count, a hand card, 4 rows', () => {
    new Agritaire(root, 3);
    expect(root.querySelector('.brand')?.textContent).toContain('AGRITAIRE');
    expect(root.querySelector('.stat--seed b')?.textContent).toBe('3'); // seeds
    expect(root.querySelector('[data-hand] .card')).toBeTruthy();
    expect(root.querySelectorAll('.row')).toHaveLength(4);
  });

  it('spends a seed to draw a card into the hand', () => {
    new Agritaire(root, 3);
    expect(root.querySelectorAll('[data-hand] .card')).toHaveLength(1);
    click(root.querySelector('[data-action="draw"]'));
    expect(root.querySelector('.stat--seed b')?.textContent).toBe('2');
    expect(root.querySelectorAll('[data-hand] .card')).toHaveLength(2);
  });

  it('selecting a held card highlights it', () => {
    new Agritaire(root, 3);
    const card = root.querySelector('[data-hand] .card');
    click(card);
    expect(root.querySelector('[data-hand] .card')?.classList.contains('is-selected')).toBe(true);
  });

  it('places the selected card on an empty row; seeds grow that turn', () => {
    new Agritaire(root, 3);
    click(root.querySelector('[data-action="place"][data-row="0"]'));
    expect(root.querySelector('.row[data-row="0"] .row-cards .card')).toBeTruthy();
    expect(root.querySelector('.hand-info .hand-title')?.textContent).toContain('Turn 2');
    expect(root.querySelector('.stat--seed b')?.textContent).toBe('4'); // grew from 3
  });

  it('discard loses the card and increments the spoiled counter', () => {
    new Agritaire(root, 3);
    click(root.querySelector('[data-action="discard"]'));
    expect(root.querySelector('.stat--warn b')?.textContent).toBe('1/12');
  });

  it('New Farm resets the board', () => {
    new Agritaire(root, 3);
    click(root.querySelector('[data-action="draw"]'));
    click(root.querySelector('[data-action="new"]'));
    expect(root.querySelector('.hand-info .hand-title')?.textContent).toContain('Turn 1');
    expect(root.querySelector('.stat--seed b')?.textContent).toBe('3');
    expect(root.querySelector('.stat--warn b')?.textContent).toBe('0/12');
  });
});
