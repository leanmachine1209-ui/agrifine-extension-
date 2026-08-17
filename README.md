# 🌱 AGRITAIRE

A farming-simulator twist on **solitaire**. Plant a production chain, watch the
season's temperature, and keep a living herd fed. Mobile-first web game built with
**Vite + TypeScript** (no engine, DOM-rendered).

## Gameplay

Cards arrive in **mini-decks of 5** — one season's hand. Place them as a
**production chain**, fire a wildcard, or **sell** them for seeds.

### Card classes (~45-card deck)

| Class | Count | Role |
| --- | --- | --- |
| 🏞️ **Field** | 10 | Starts a row |
| 🌱 **Seed** | 12 (3 per season) | Second step; **must match the current season** |
| 🚜 **Equipment** | 8 | Third step; the row becomes foldable |
| 🐄 **Livestock** | 8 | Extra on a completed chain (boosts a cattle fold), or sold |
| 📐 **Expansion** | 3 | Instant: add a row (cap 6) |
| 💥 **Boom** | 4 | Instant: pick **+1d6 grain** or **+1 cow** |

### Temperature

Current season is **Spring → Summer → Fall → Winter**, cycling each time you
draw a mini-deck. Wrong-season Seeds cannot be planted — sell them instead.

### Production chain

Empty row → **Field** → **Seed** (matching season) → **Equipment**. Completing
Equipment makes the row foldable. Livestock may sit on a completed chain as a
bonus before you fold; they are not a fourth required step.

- 🌾 **Harvest** → Grain Bank (plus a couple of seeds)
- 🐄 **Cattle** → live animals in the Pasture (livestock extras add more cows)

### Seeds, seasons & operating loans

- The **first mini-deck is free**. Each later one is an **operating loan** paid
  in **🌱 seeds** (−2). You start with 5 seeds.
- When your hand empties: if the **deck is empty you're done**; if you **can't
  afford the next loan you go bankrupt**.
- **Sell** a card for seeds (+1, Expansion/Boom +2). Harvesting also returns seeds.

### The living herd

Every new season each animal **eats 1 grain**. Unfed animals **starve** (those
furthest from payoff first). Animals **age**, and at the end of their 3-season
life they **cash out** (+8). Survivors are sold for a bonus when the deck runs out.

### Controls (touch + mouse)

- **Tap a held card**, then **tap a row** to plant it (legal rows glow green).
- **Tap Expansion** to add a field. **Tap Boom**, then pick grain or a cow.
- **💰 Sell** converts the selected card into seeds.
- When the hand is empty, **🌱 Take Loan** draws the next season's mini-deck and
  feeds/ages the herd.
- **🌾 Harvest / 🐄 Cattle** fold a completed chain. **🌱 New Farm** reshuffles.
- Add `?seed=N` to the URL for a reproducible (shareable) deal.

## Development

```bash
npm ci          # install dependencies
npm run dev      # start Vite dev server (http://localhost:5173)
npm test         # run the rules-engine + UI tests (Vitest)
npm run build    # type-check + production build to dist/
npm run preview  # serve the production build
```

## Deploy (Render)

`render.yaml` defines a static-site blueprint. On Render, create a new **Blueprint**
from this repo (or a **Static Site** manually) with:

- **Build command:** `npm ci && npm run build`
- **Publish directory:** `dist`

Render builds the Vite bundle and serves `dist/`, so the deployed URL plays the same
game as `npm run dev`. `?seed=N` works on the hosted URL too.

## Project layout

```
src/
  game/
    cards.ts        # classes, seasons, deck, seeded shuffle
    rules.ts        # production chain, instants, loans, living herd
    rules.test.ts   # unit tests for the engine
  ui/
    render.ts       # HTML builders for the board
  main.ts           # controller: taps, instants, loans
  style.css         # cardboard tabletop + sloped fields panel
```
