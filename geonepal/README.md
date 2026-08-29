# GeoNepal — Disaster Intelligence Archive

## Project structure

```
geonepal/
├── index.html          # page markup
├── css/
│   └── style.css        # all styling (design tokens, layout, components)
├── js/
│   ├── data.js           # provinces/districts, demo data generator, USGS fetch
│   ├── render.js          # filtering + all rendering (grid, map, modal, timeline)
│   └── main.js             # state wiring, event listeners, YouTube fetch, init
└── README.md
```

## ⚠️ Important — don't just double-click index.html

Opening the file directly from disk (`file://...`) will likely break the **live USGS earthquake fetch** and the **YouTube API calls**, because browsers treat local files as a "null" origin and many APIs (including USGS's) refuse requests from it. This is almost certainly why the USGS fetch failed for you earlier.

Run it through a real local server instead — takes 30 seconds:

**Option A — VS Code Live Server extension (easiest)**
1. In VS Code, install the extension **"Live Server"** (by Ritwick Dey).
2. Right-click `index.html` in the file explorer → **"Open with Live Server"**.
3. It opens at something like `http://127.0.0.1:5500` — fetches will now work properly.

**Option B — Python (if you have it installed)**
```bash
cd geonepal
python3 -m http.server 8000
```
Then open `http://localhost:8000` in your browser.

**Option C — Node (if you have it installed)**
```bash
npx serve geonepal
```

## Editing

- **Colors, fonts, spacing, animations** → `css/style.css` (CSS variables are at the very top under `:root`)
- **Nepal geography (provinces/districts), demo data generation, USGS fetch logic** → `js/data.js`
- **How things render on screen (grid tiles, map markers, modal content, timeline)** → `js/render.js`
- **Filter/search behavior, button clicks, YouTube API calls, page init** → `js/main.js`
- **Page structure/sections** → `index.html`

## YouTube API key

Paste it into the ⚙ settings panel inside the running site — it's stored only in `sessionStorage` in your browser tab, never written to any file or sent anywhere except Google's API. It resets when you close the tab.

## Data status

| Category | Status |
|---|---|
| Earthquakes | **Live** — fetched from the USGS Earthquake Catalog on load |
| Floods | Demo — structured placeholder data (real provinces/districts) |
| Landslides | Demo — structured placeholder data (real provinces/districts) |
| Images | Demo — placeholder photography |
| News | Demo — placeholder headlines |
| Videos | Demo, unless a YouTube API key is added in ⚙ settings |

See the earlier conversation for how to pull real BIPAD, ReliefWeb, and DHM data to replace the demo categories.
