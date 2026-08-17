// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { Agritaire } from './main';
import { newGame } from './game/rules';

function click(el: Element | null | undefined): void {
  el?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

function findSeed(predicate: (s: ReturnType<typeof newGame>) => boolean, max = 4000): number {
  for (let i = 1; i <= max; i++) {
    if (predicate(newGame(i))) return i;
  }
  throw new Error('no matching deal seed');
}

const FIELD_SEED_DEAL = findSeed((s) => {
  const field = s.hand.some((c) => c.suit === 'field');
  const seed = s.hand.some((c) => c.suit === 'seed' && c.season === 'spring');
  return field && seed;
});

const THREE_BARNS_DEAL = findSeed((s) => s.hand.filter((c) => c.suit === 'field').length >= 3);

const BOOM_DEAL = findSeed((s) => s.hand.some((c) => c.suit === 'boom'));
const EXPANSION_DEAL = findSeed((s) => s.hand.some((c) => c.suit === 'expansion'));

describe('AGRITAIRE UI wiring', () => {
  let root: HTMLElement;
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    root = document.getElementById('app')!;
  });

  it('renders the season gauge, grain bank, empty pasture, and 4 vertical suit columns', () => {
    new Agritaire(root, 3);
    expect(root.querySelector('.brand')?.textContent).toContain('AGRITAIRE');
    expect(root.querySelector('.season-gauge')?.getAttribute('data-season')).toBe('spring');
    expect(root.querySelector('.season-gauge .season-value')?.textContent).toMatch(/Spring/);
    expect(root.querySelector('.stat--seed b')?.textContent).toBe('5');
    expect(root.querySelector('.bank-value')?.textContent).toContain('0');
    expect(root.querySelector('.pasture-empty')).toBeTruthy();
    expect(root.querySelector('[data-upkeep]')?.textContent).toMatch(/No capital upkeep/);
    expect(root.querySelectorAll('[data-hand] .card')).toHaveLength(5);
    expect(root.querySelectorAll('.suit-col')).toHaveLength(4);
    expect(root.querySelector('.suit-col--field')?.textContent).toMatch(/Barns/);
    expect(root.querySelector('.suit-col--equipment')?.textContent).toMatch(/Tractors/);
  });

  it('selecting a held card highlights it', () => {
    new Agritaire(root, 3);
    const second = root.querySelectorAll('[data-hand] .card')[1];
    click(second);
    expect(root.querySelector('[data-hand] .card.is-selected')).toBeTruthy();
  });

  it('places a Field on Barns and a matching-season Seed on Crops', () => {
    new Agritaire(root, FIELD_SEED_DEAL);
    const field = [...root.querySelectorAll('[data-hand] .card')].find((el) =>
      el.classList.contains('card--field'),
    );
    click(field);
    click(root.querySelector('.suit-col[data-col="0"]'));
    expect(root.querySelector('.suit-col[data-col="0"] .suit-stack .card--field')).toBeTruthy();
    const seed = [...root.querySelectorAll('[data-hand] .card')].find((el) =>
      el.classList.contains('card--seed'),
    );
    click(seed);
    click(root.querySelector('.suit-col[data-col="1"]'));
    expect(root.querySelector('.suit-col[data-col="1"] .suit-stack .card--seed')).toBeTruthy();
    expect(root.querySelector('[data-action="fold-grain"]')).toBeTruthy();
  });

  it('collapses three wood barns into a steel barn', () => {
    new Agritaire(root, THREE_BARNS_DEAL);
    const barnCol = () => root.querySelector('.suit-col[data-col="0"]');
    for (let i = 0; i < 3; i++) {
      const field = [...root.querySelectorAll('[data-hand] .card')].find((el) =>
        el.classList.contains('card--field'),
      );
      click(field);
      click(barnCol());
    }
    const stacked = barnCol()?.querySelectorAll('.suit-stack .card') ?? [];
    expect(stacked.length).toBe(1);
    expect(stacked[0].classList.contains('card--tier-2')).toBe(true);
    expect(stacked[0].getAttribute('aria-label')).toBe('Steel barn');
    expect(root.querySelector('[data-upkeep]')?.textContent).toMatch(/idle barns/);
  });

  it('shows Boom grain/cow buttons and Expansion instant action', () => {
    new Agritaire(root, BOOM_DEAL);
    const boom = [...root.querySelectorAll('[data-hand] .card')].find((el) =>
      el.classList.contains('card--boom'),
    );
    click(boom);
    expect(root.querySelector('[data-action="boom-grain"]')).toBeTruthy();
    expect(root.querySelector('[data-action="boom-cow"]')).toBeTruthy();

    document.body.innerHTML = '<div id="app"></div>';
    root = document.getElementById('app')!;
    new Agritaire(root, EXPANSION_DEAL);
    expect(root.querySelector('[data-action="expansion"]')).toBeTruthy();
    const before = root.querySelectorAll('.suit-col').length;
    click(root.querySelector('[data-action="expansion"]'));
    expect(root.querySelectorAll('.suit-col').length).toBe(before + 1);
  });

  it('selling a card raises seeds and shrinks the hand', () => {
    new Agritaire(root, 3);
    const before = Number(root.querySelector('.stat--seed b')?.textContent);
    click(root.querySelector('[data-action="sell"]'));
    expect(Number(root.querySelector('.stat--seed b')?.textContent)).toBeGreaterThan(before);
    expect(root.querySelectorAll('[data-hand] .card')).toHaveLength(4);
  });

  it('emptying the hand then taking the loan draws the next season', () => {
    new Agritaire(root, 3);
    for (let i = 0; i < 5; i++) click(root.querySelector('[data-action="sell"]'));
    const loanBtn = root.querySelector('[data-action="draw-mini"]') as HTMLButtonElement;
    expect(loanBtn?.disabled).toBe(false);
    const seedsBefore = Number(root.querySelector('.stat--seed b')?.textContent);
    click(loanBtn);
    expect(root.querySelector('.hand-title')?.textContent).toContain('Season 2');
    expect(root.querySelector('.season-gauge')?.getAttribute('data-season')).toBe('summer');
    expect(Number(root.querySelector('.stat--seed b')?.textContent)).toBe(seedsBefore - 2);
  });

  it('New Farm resets to season 1', () => {
    new Agritaire(root, 3);
    click(root.querySelector('[data-action="sell"]'));
    click(root.querySelector('[data-action="new"]'));
    expect(root.querySelector('.hand-title')?.textContent).toContain('Season 1');
    expect(root.querySelector('.stat--seed b')?.textContent).toBe('5');
  });
});
