# 🌱 AGRITAIRE

A farming-simulator twist on **Klondike solitaire**. Play a Field (`F`) to
**pick a land use** on a plot, stack that **13-card suit**, and **own the
farm**. Crops and herd overlay like red and black. Manure from pasture and
barn cycles back to the crop fields. The 66-card deck includes **14 event
wildcards**. Mobile-first web game built with **Vite + TypeScript**.

## Gameplay

The deal is Klondike: **7 holding piles** (1 through 7, top face-up) plus a
**stock**. Play follows optimal Klondike — flip buried cards first, put Aces
and twos up, and do not empty a pile unless a Harvest (`★`) can fill it.
The board **never grows extra columns**.

### Pick a plot, own a farm

Each land-use suit is 13 ranks. **Rank 1 is the Field** (`F`). Playing it
**leases** that plot as that land use. Stack **2 → ★** of the same suit.
When the 13th card lands, the lease becomes an **owned farm**.

| Plot | Family | Routes to |
| --- | --- | --- |
| Annual 🌾 | Crop (gold) | Crop field |
| Perennial 🍎 | Crop (gold) | Crop field |
| Pasture 🐄 | Herd (rust) | Beef |
| Barn 🥛 | Herd (rust) | Dairy |

Crops overlay the herd in the holding set the same way **red overlays black**
in solitaire. Annual and perennial are the two crop suits; pasture and barn
are the two herd suits.

### The manure cycle

The late-game is circular, not extra piles:

1. Beef cards build the **pasture**. Dairy cards build the **barn**.
2. Each herd card played onto those fields adds **manure** to the hopper
   (richer once a herd farm is owned).
3. **Fertilize** spends manure to promote a legal crop-field card (annual or
   perennial). If nothing is ready, the next field play is treated as safe.
4. Owning a **crop** farm feeds the herd: pasture and barn F and 2s auto-play.

| Owned farms | Unlock |
| --- | --- |
| 1 | **Recall** — pull the top card off a *leased* field when you need a builder. |
| Crop farm | **Feed** — herd F and 2s auto-play after moves. |
| Herd farm | **Richer manure** — pasture/barn plays add 2 manure. |
| 3 | **Crew** — all F and 2s auto-play (they almost never help the tableau). |
| 4 + 14 events | The cycle closes. You win. |

### 14 event wildcards

Events do **not** stack in the holding set. **Hinders** auto-resolve when they
become the waste top or a flipped hold top (you would skip them anyway).
**Boosts** stay until you tap them.

| Event | Kind | Effect |
| --- | --- | --- |
| Rain 🌧️ | Boost | Next field play is safe (and can open a drought). |
| Bumper 🌽 | Boost | Auto-play F and 2s. |
| Fair 🎪 | Boost | Extra draw from stock. |
| Drought ☀️ | Hinder | Fields close for 3 moves. |
| Blight 🦠 | Hinder | A leased top returns to waste. Owned farms are safe. |
| Storm 🌪️ | Hinder | A hold top blows onto waste. |
| Lien 📜 | Hinder | No recall for 4 moves. |

Win when all **52** ranked cards sit on the four plots **and** all **14**
events are resolved.

### Holding set

The seven piles are a solitaire tableau. Build **down by one rank** in the
**opposite family** (crops on herd, herd on crops). Empty holds only take a
Harvest (`★`), like a King. Face-up runs move together. Turning a pile over
flips the next card.

### Stock & waste

Tap the stock to turn one card onto the waste. Play the waste top onto a
Field or a holding pile. When the stock is empty, tap ♻️ to recycle the waste.

### Controls (touch + mouse)

- **Tap a face-up card**, then a **glowing Field or hold pile**.
- **Tap a selected card again** to send it to its Field if that is legal.
- **Tap an event** to resolve a boost (hinders fire on their own).
- **🌾 Play F & 2s** only promotes safe cards (Aces, twos, then ranks whose opposite-family cards below are already up).
- **💩 Fertilize** spends manure on the crop fields.
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
    cards.ts        # 4 land uses × 13 ranks + 14 events; Field = rank 1
    rules.ts        # fields, holding set, manure cycle, events
    rules.test.ts   # unit tests for the engine
  ui/
    render.ts       # HTML builders for the board
  main.ts           # controller: select, drop, draw, fertilize, events
  style.css         # cardboard tabletop + solitaire layout
```
