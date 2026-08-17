# 🌱 AGRITAIRE

A farming-simulator twist on **solitaire**. Stack vertically aligned suits,
collapse them into bigger barns and tractors, and keep crops or cattle paying
the bills. Mobile-first web game built with **Vite + TypeScript** (no engine,
DOM-rendered).

## Gameplay

Cards arrive in **mini-decks of 5** — one season's hand. Place them on their
**suit column**, fire a wildcard, or **sell** them for seeds.

### Vertically aligned suits

The board is four columns, one per suit. Cards stack top-to-bottom like a
tableau pile. Expansion adds an extra column that locks to the first suit you
play on it.

| Column | Suit | Role |
| --- | --- | --- |
| 🏚️ **Barns** | Field | Capital. Holds cattle. |
| 🌱 **Crops** | Seed | Production. Season-gated. Harvest for grain. |
| 🚜 **Tractors** | Equipment | Capital. Lifts harvest yield. |
| 🐄 **Cattle** | Livestock | Production. Fold into the Pasture. |

📐 **Expansion** and 💥 **Boom** stay instant (add a column, or pick grain / a cow).

### Stacks collapse into bigger assets

Three of the **same tier** in a column collapse into the next asset. That is
how you level up how much you can manage:

| Suit | Tier 1 | 3× → Tier 2 | 3× → Tier 3 |
| --- | --- | --- | --- |
| Barns | Wood barn | Steel barn | Modern barn |
| Tractors | Compact | Utility | Combine |
| Crops | Seedling | Standing crop | Bumper crop |
| Cattle | Cow | Herd | Feedlot |

- **Bigger barns** hold more cattle (wood +1, steel +3, modern +6, on top of a
  base of 2).
- **Bigger tractors** add that much extra grain when you harvest.

### Idle token burn

Barns and tractors are capital: they **burn 🌱 tokens** every operating loan
(wood/compact 1, steel/utility 2, modern/combine 4).

If **no cattle** are paying for the barns, barn burn **doubles**. If **no crops
or grain** are paying for the tractors, tractor burn **doubles**. Overbuilding
without production is how farms go bankrupt.

### Temperature

Current season is **Spring → Summer → Fall → Winter**, cycling each time you
draw a mini-deck. Wrong-season Seeds cannot be planted — sell them instead.

### Seeds, seasons & operating loans

- The **first mini-deck is free**. Each later one costs **2 seeds plus capital
  burn**. You start with 5 seeds.
- When your hand empties: if the **deck is empty you're done**; if you **can't
  afford the next loan you go bankrupt**.
- **Sell** a card for seeds (+1, Expansion/Boom +2). Harvesting also returns seeds.

### The living herd

Every new season each animal **eats 1 grain**. Unfed animals **starve** (those
furthest from payoff first). Animals **age**, and at the end of their 3-season
life they **cash out** (+8). Herd size is capped by barn capacity. Survivors
are sold for a bonus when the deck runs out.

### Controls (touch + mouse)

- **Tap a held card**, then **tap its suit column** to stack it (legal columns
  glow green). Three of a kind collapse automatically.
- **Tap Expansion** to add a column. **Tap Boom**, then pick grain or a cow.
- **💰 Sell** converts the selected card into seeds.
- When the hand is empty, **🌱 Take Loan** draws the next season's mini-deck,
  charges upkeep, and feeds/ages the herd.
- **🌾 Harvest** folds the crop column. **🐄 Cattle** folds livestock into the
  pasture. **🌱 New Farm** reshuffles.
- Add `?seed=N` to the URL for a reproducible (shareable) deal.

## Development

```bash
npm ci          # install dependencies
npm run dev      # start Vite dev server (http://localhost:5173)
npm test         # run the rules-engine + UI tests (Vitest)
npm run build    # type-check + production build to dist/
npm run preview  # serve the production build
```

## Deploy (Render, free)

AGRITAIRE is a Vite + TypeScript game. If you created a **Python Web Service**
(Render's default language), the build command is `pip install -r requirements.txt`.
This repo includes that file plus a small Gunicorn app (`your_application.wsgi`)
that serves the committed game files in `your_application/static/` (a copy of
`dist/`). That is what makes a Python-only deploy actually load — Render's
default build never runs Vite, so `dist/` is empty on the server.

### Already created a Python Web Service?

Keep the dashboard defaults. After this lands on the deployed branch:

- **Build command:** `pip install -r requirements.txt`
- **Start command:** `gunicorn your_application.wsgi`

Gunicorn binds `0.0.0.0:$PORT` via `gunicorn.conf.py` and serves
`your_application/static/` immediately (no npm at boot). To refresh that
folder after game changes, run `npm run build` and commit the updated static
files. Optional deploy-time build:

```bash
pip install -r requirements.txt && npm ci --include=dev && npm run build
```

### New service (Blueprint or Static Site)

`render.yaml` defines a free Python web service that installs Gunicorn, builds
the Vite bundle, and starts Gunicorn. Or create a **Static Site** instead:

- **Plan:** Free
- **Build command:** `npm ci --include=dev && npm run build`
- **Publish directory:** `./dist`
- **Node:** 20

`?seed=N` works on the hosted URL. There is no login or paywall — the game is
free to play at the `onrender.com` URL.

## Project layout

```
requirements.txt            # Render Python build (`pip install -r requirements.txt`)
your_application/wsgi.py    # `gunicorn your_application.wsgi` serves static/
your_application/static/    # committed Vite build so Python deploys can load
src/
  game/
    cards.ts        # suits, asset tiers, seasons, deck, seeded shuffle
    rules.ts        # vertical stacks, collapse, capacity, idle burn, herd
    rules.test.ts   # unit tests for the engine
  ui/
    render.ts       # HTML builders for the board
  main.ts           # controller: taps, instants, loans
  style.css         # cardboard tabletop + vertical suit columns
```
