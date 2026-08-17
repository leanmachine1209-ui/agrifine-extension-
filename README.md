# 🌱 AGRITAIRE

A farming-simulator twist on **solitaire**. Plant seeds, build silos, and harvest
your whole farm. Mobile-first web game built with **Vite + TypeScript** (no engine,
DOM-rendered), so it runs anywhere Chrome/Safari does and can be wrapped for native
iOS/Android with Capacitor later.

## Gameplay

A **turn-based**, sequential stacking game. Four suits:

- 🐄 **Livestock** — folds into cattle (points, but cattle need grain to survive)
- 🌾 **Grain** — folds into the grain bank (grain preserves cattle)
- 🟩 **Field** — the very sequential backbone; adds bonus points
- ⭐ **Wildcard** — fills any slot in a run

### How a turn works

- Each turn you draw **one card** into your hand.
- Place it on one of the **four rows**. Rows build **strictly ascending consecutive
  runs** (each card must be exactly one rank higher than the row's top). A ⭐ wild
  fills any slot.
- If the card fits nowhere (or you choose), it **spoils** and is lost.
  Spoil too many (12) and the **farm fails**.

### Folding a set

A row of **3+ cards** can be folded for points:

- 🌾 **Harvest** → banks **grain**. Grain raises how many **cattle** you can keep.
- 🐄 **Cattle** → banks **cattle** (worth 2× points), but only up to your capacity
  (`base + grain / 2`). Cattle over capacity can't be preserved.

**Suit bonuses on fold:** grain cards boost harvests, livestock cards boost the herd,
field cards add bonus points. Surviving cattle pay a bonus when the deck runs out.

### Controls (touch + mouse)

- **Tap a row** to place the current card there (valid rows glow green).
- **🌾 / 🐄** buttons on a foldable row bank it as grain or cattle.
- **🗑 Discard** loses the current card on purpose. **🌱 New Farm** reshuffles.
- Add `?seed=N` to the URL for a reproducible (shareable) deal.

## Development

```bash
npm ci          # install dependencies
npm run dev      # start Vite dev server (http://localhost:5173)
npm test         # run the rules-engine unit tests (Vitest)
npm run build    # type-check + production build to dist/
npm run preview  # serve the production build
```

## Project layout

```
src/
  game/
    cards.ts        # crop/card model, deck, seeded shuffle
    rules.ts        # pure Klondike engine (moves, validation, economy, win)
    rules.test.ts   # unit tests for the engine
  ui/
    render.ts       # pure HTML builders for the board
  main.ts           # controller: state, input (tap-to-move), timer, undo
  style.css         # mobile-first farm theme
```
