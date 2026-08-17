# 🌱 AGRITAIRE

A farming-simulator twist on **Klondike solitaire**. **Lease** a Field (`F`),
stack that **14-card suit**, and **own the farm** when the suit is complete.
Late-game deeds unlock recall, an extra yard, and a crew that plays Aces and
twos. Mobile-first web game built with **Vite + TypeScript**.

## Gameplay

The deal is Klondike: **7 holding piles** (1 through 7, top face-up) plus a
**stock**. Play follows optimal Klondike — flip buried cards first, put Aces
and twos up, and do not empty a pile unless a Harvest (`★`) can fill it.

### Lease a field, own a farm

Each suit is 14 ranks. **Rank 1 is the Field** (`F`). Playing it **leases**
that plot. Stack **2 → ★** of the same suit. When the 14th card lands, the
lease becomes an **owned farm** — that is the late-game engine.

| Owned farms | Unlock |
| --- | --- |
| 1 | **Recall** — pull the top card off a *leased* field when you need a builder (standard Klondike “play off the foundation”). |
| 2 | **Yard** — an 8th holding pile for late-game maneuvering. |
| 3 | **Crew** — F and 2s auto-play after every move (they almost never help the tableau). |
| 4 | You own the county. |

### 14-card suits

| Suit | Family | Emoji |
| --- | --- | --- |
| Grain | Gold | 🌾 |
| Orchard | Gold | 🍎 |
| Cattle | Rust | 🐄 |
| Tractors | Rust | 🚜 |

### Holding set

The seven piles are a solitaire tableau. Build **down by one rank** in the
**opposite family** (gold on rust, rust on gold). Empty holds only take a
Harvest (`★`), like a King. Face-up runs move together. Turning a pile over
flips the next card.

### Stock & waste

Tap the stock to turn one card onto the waste. Play the waste top onto a
Field or a holding pile. When the stock is empty, tap ♻️ to recycle the waste.

### Controls (touch + mouse)

- **Tap a face-up card**, then a **glowing Field or hold pile**.
- **Tap a selected card again** to send it to its Field if that is legal.
- **🌾 Play F & 2s** only promotes safe cards (Aces, twos, then ranks whose opposite-family cards below are already up). Do not dump the whole suit early.
- **🌱 New Farm** reshuffles. Add `?seed=N` for a reproducible deal.

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
    cards.ts        # 4 suits × 14 ranks; Field = rank 1
    rules.ts        # fields, holding set, stock/waste
    rules.test.ts   # unit tests for the engine
  ui/
    render.ts       # HTML builders for the board
  main.ts           # controller: select, drop, draw
  style.css         # cardboard tabletop + solitaire layout
```
