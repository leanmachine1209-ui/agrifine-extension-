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

  it('renders season 1 with a 5-card mini-deck and starting seeds', () => {
    new Agritaire(root, 3);
    expect(root.querySelector('.brand')?.textContent).toContain('AGRITAIRE');
    expect(root.querySelector('.stat--seed b')?.textContent).toBe('5');
    expect(root.querySelectorAll('[data-hand] .card')).toHaveLength(5);
    expect(root.querySelector('.hand-title')?.textContent).toContain('Season 1');
    expect(root.querySelectorAll('.row')).toHaveLength(4);
  });

  it('selecting a held card highlights it', () => {
    new Agritaire(root, 3);
    click(root.querySelector('[data-hand] .card'));
    expect(root.querySelector('[data-hand] .card')?.classList.contains('is-selected')).toBe(true);
  });

  it('placing a card on an empty row removes it from the hand', () => {
    new Agritaire(root, 3);
    click(root.querySelector('[data-action="place"][data-row="0"]'));
    expect(root.querySelector('.row[data-row="0"] .row-cards .card')).toBeTruthy();
    expect(root.querySelectorAll('[data-hand] .card')).toHaveLength(4);
  });

  it('selling a card raises seeds and shrinks the hand', () => {
    new Agritaire(root, 3);
    const before = Number(root.querySelector('.stat--seed b')?.textContent);
    click(root.querySelector('[data-action="sell"]'));
    const after = Number(root.querySelector('.stat--seed b')?.textContent);
    expect(after).toBeGreaterThan(before);
    expect(root.querySelectorAll('[data-hand] .card')).toHaveLength(4);
  });

  it('emptying the hand then taking the loan draws the next season', () => {
    new Agritaire(root, 3);
    for (let i = 0; i < 5; i++) click(root.querySelector('[data-action="sell"]')); // sell whole hand
    expect(root.querySelectorAll('[data-hand] .card:not(.card--empty)')).toHaveLength(0);
    const loanBtn = root.querySelector('[data-action="draw-mini"]') as HTMLButtonElement;
    expect(loanBtn).toBeTruthy();
    expect(loanBtn.disabled).toBe(false);
    const seedsBefore = Number(root.querySelector('.stat--seed b')?.textContent);
    click(loanBtn);
    expect(root.querySelector('.hand-title')?.textContent).toContain('Season 2');
    expect(root.querySelectorAll('[data-hand] .card')).toHaveLength(5);
    expect(Number(root.querySelector('.stat--seed b')?.textContent)).toBe(seedsBefore - 2);
  });

  it('New Farm resets to season 1', () => {
    new Agritaire(root, 3);
    click(root.querySelector('[data-action="sell"]'));
    click(root.querySelector('[data-action="new"]'));
    expect(root.querySelector('.hand-title')?.textContent).toContain('Season 1');
    expect(root.querySelector('.stat--seed b')?.textContent).toBe('5');
    expect(root.querySelectorAll('[data-hand] .card')).toHaveLength(5);
  });
});
