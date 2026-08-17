# 🌱 AGRITAIRE

A farming-simulator twist on **solitaire**. Plant seeds, build silos, and harvest
your whole farm. Mobile-first web game built with **Vite + TypeScript** (no engine,
DOM-rendered), so it runs anywhere Chrome/Safari does and can be wrapped for native
iOS/Android with Capacitor later.

## Gameplay

A **turn-based**, sequential stacking game. Four suits:

- 🐄 **Livestock** — folds into cattle (points, but cattle need grain to survive)
- 🌾 **Grain** — folds into the grain bank (grain preserves cattle)
- 🏞️ **Field** — the very sequential backbone; adds bonus points
- ⭐ **Wildcard** — fills any slot in a run

### Seeds, seasons & operating loans

- Cards arrive in **mini-decks of 5** — one season's hand. The **first is free**.
- Each new mini-deck is an **operating loan** paid in **🌱 seeds** (−2). You start
  with 5 seeds.
- When your hand empties: if the **deck is empty you're done** (season complete); if
  you **can't afford the next loan you go bankrupt** — so bank seeds before you run out.
- **Sell cards** for seeds (+1, wild +2) to fund the next season. Harvesting grain also
  returns a couple of seeds.

### How you play a hand

- **Place a card** on one of the **four rows**, which build **strictly ascending
  consecutive runs** (each card exactly one rank higher than the top). A ⭐ wild fills
  any slot.
- Or **sell** the card for seeds. Every card is either placed or sold, so the hand
  always clears and you move to the next season.

### Folding a set

A row of **3+ cards** can be folded:

- 🌾 **Harvest** → fills the **Grain Bank** (and returns some seeds).
- 🐄 **Cattle** → adds live animals to your **Pasture**.

### The living herd

The Pasture is alive. Every new season each animal **eats grain** from the Grain Bank
(`1 grain each`). If you can't feed them, animals **starve** (the ones furthest from
payoff go first). Animals **age**, and when their lifespan (3 seasons) ends they leave
the board and **cash out for big points** (+8). Any survivors are sold for a bonus when
the deck runs out. So grain is your feed reserve — harvest enough to keep the herd alive
until it pays off.

**Suit bonuses on fold:** grain cards boost harvests, livestock cards add more animals,
field cards add bonus points.

### Controls (touch + mouse)

- **Tap a held card** to select it, then **tap a row** to place it (valid rows glow green).
- **💰 Sell** converts the selected card into seeds.
- When the hand is empty, **🌱 Take Loan** draws the next season's mini-deck.
- **🌾 / 🐄** buttons on a foldable run bank it as grain or cattle. **🌱 New Farm** reshuffles.
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
