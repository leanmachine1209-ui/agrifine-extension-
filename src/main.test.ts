// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { Agritaire } from './main';
import { newGame } from './game/rules';
import { isFieldCard } from './game/cards';

function click(el: Element | null | undefined): void {
  el?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

function findSeed(predicate: (s: ReturnType<typeof newGame>) => boolean, max = 8000): number {
  for (let i = 1; i <= max; i++) {
    if (predicate(newGame(i))) return i;
  }
  throw new Error('no matching deal seed');
}

const FIELD_ON_WASTE = findSeed((s) => {
  const first = s.stock[s.stock.length - 1];
  return Boolean(first && isFieldCard(first));
});

describe('AGRITAIRE solitaire UI', () => {
  let root: HTMLElement;
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    root = document.getElementById('app')!;
  });

  it('deals four empty fields and a 7-pile holding set', () => {
    new Agritaire(root, 3);
    expect(root.querySelector('.brand')?.textContent).toContain('AGRITAIRE');
    expect(root.querySelectorAll('.field-slot')).toHaveLength(4);
    expect(root.querySelectorAll('.hold-col')).toHaveLength(7);
    expect(root.querySelectorAll('.hold-col .card, .hold-col .card--back').length).toBeGreaterThan(7);
    expect(root.querySelector('[data-action="draw"]')).toBeTruthy();
    expect(root.textContent).toMatch(/Play a/);
  });

  it('selecting a face-up holding card highlights it', () => {
    new Agritaire(root, 3);
    const face = root.querySelector('.hold-col .card[data-action="select"]');
    expect(face).toBeTruthy();
    click(face);
    expect(root.querySelector('.card.is-selected')).toBeTruthy();
  });

  it('drawing the stock puts a Field onto waste, then tapping it sets that field', () => {
    new Agritaire(root, FIELD_ON_WASTE);
    click(root.querySelector('[data-action="draw"]'));
    const wasteField = root.querySelector('.stock-box .card--plot');
    expect(wasteField).toBeTruthy();
    click(wasteField);
    const suit = [...root.querySelectorAll('.field-slot')].find((slot) =>
      slot.classList.contains('is-valid'),
    );
    expect(suit).toBeTruthy();
    click(suit);
    expect(root.querySelector('.field-slot .card--plot')).toBeTruthy();
    expect(root.textContent).toMatch(/1\/14/);
  });

  it('New Farm restores empty fields and a fresh holding set', () => {
    new Agritaire(root, 3);
    click(root.querySelector('[data-action="draw"]'));
    click(root.querySelector('[data-action="new"]'));
    expect(root.querySelectorAll('.field-slot .card--plot')).toHaveLength(0);
    expect(root.querySelectorAll('.hold-col')).toHaveLength(7);
    expect(root.querySelector('.stat b')?.textContent).toBe('0');
  });
});
