# 🌱 AGRITAIRE

A farming-simulator twist on **solitaire**. Plant seeds, build silos, and harvest
your whole farm. Mobile-first web game built with **Vite + TypeScript** (no engine,
DOM-rendered), so it runs anywhere Chrome/Safari does and can be wrapped for native
iOS/Android with Capacitor later.

## Gameplay

Classic Klondike solitaire, reskinned as a farm:

- **Crops are the suits** — 🌽 Corn & 🌾 Wheat (gold) and 🍅 Tomato & 🥕 Carrot (red).
  Tableau fields build **down** in alternating crop colors.
- **Silos are the foundations** — plant a seed (Ace) and build **up** by crop to the
  harvest (King). Completing a silo harvests that crop.
- **Farm economy** — each card sent to a silo earns 🪙 coins, completing a silo pays
  a harvest bonus, and the **Farm Growth** panel of plots visibly grows
  (🟫 → 🌱 → 🌿 → 🌾) as you play. Harvest all four crops to win.

### Controls (touch + mouse)

- **Tap a card** to pick it up, then **tap a silo or field** to place it.
- **Double-tap** a card to auto-send it to its silo.
- **Tap the stock** (soil pile) to draw; tap again when empty to recycle.
- **🚜 Auto-Harvest** sends every reachable card to its silo. **↩︎ Undo** / **🌱 New** as needed.

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
