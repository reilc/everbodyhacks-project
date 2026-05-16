# 🔥 Wildfire Community Response Hub

A web app built for **Everybody Hacks 2026** that helps Washington State residents affected by wildfires find nearby shelters, understand historical fire data, and access verified information quickly.

---

## What It Does

- **Live FEMA shelter data** — fetches currently open emergency shelters in Washington state directly from FEMA's public API
- **Historical wildfire data** — displays past WA wildfire perimeters and details from Washington State's geographic database
- **Interactive map** — click any shelter or fire card in the sidebar to fly to it on the map
- **Search & filters** — filter shelters by status (Open/Closed) and fires by year, or search by name/location
- **Fallback data** — if FEMA has no active shelters (no declared disaster), the app shows known WA emergency venues so the map is never empty

---

## Getting Started

### Prerequisites
You just need Python installed (comes pre-installed on most Macs).

### Running the app

1. Clone the repo:
   ```bash
   git clone https://github.com/reilc/everbodyhacks-project.git
   cd everbodyhacks-project
   ```

2. Start a local server:
   ```bash
   python3 -m http.server 8080
   ```

3. Open your browser and go to:
   ```
   http://localhost:8080
   ```

> ⚠️ Do **not** open `index.html` directly as a file (`File:///...`) — the APIs won't load. Always use `localhost`.

---

## Project Structure

```
everbodyhacks-project/
├── index.html          # HTML skeleton — sidebar, panels, map container
├── css/
│   └── style.css       # All styling and CSS variables
└── js/
    ├── config.js       # API URLs, shared state, fallback shelter data
    ├── map.js          # Leaflet map setup, tile layer, WA outline
    ├── shelters.js     # FEMA shelter fetching and rendering
    ├── wildfires.js    # WA wildfire fetching and rendering
    └── ui.js           # Tabs, filters, search, app boot
```

### Who owns what
| File | Responsible for |
|---|---|
| `index.html` | Page structure, adding new panels or sections |
| `css/style.css` | Visual design, colors, layout |
| `js/config.js` | API endpoints, adding new data sources |
| `js/map.js` | Map behaviour, zoom, overlays |
| `js/shelters.js` | Shelter data fetching and sidebar cards |
| `js/wildfires.js` | Wildfire data fetching and sidebar cards |
| `js/ui.js` | User interactions — filters, search, tab switching |

---

## Data Sources

| Data | Source | Requires API Key? |
|---|---|---|
| Live FEMA shelters | [FEMA NSS OpenShelters MapServer](https://gis.fema.gov/arcgis/rest/services/NSS/OpenShelters/MapServer) | No |
| WA historical wildfires | [Washington State Geo Portal](https://geo.wa.gov/datasets/dabefcb8f03549b49bee7564d4c3c4b5_2) | No |

Both APIs are free and publicly accessible — no keys or accounts needed.

> **Note on FEMA data:** FEMA only populates their live shelter feed during active declared disasters. Outside of a disaster, the app automatically falls back to a list of known WA emergency venues (marked as "sample") so the map always has something useful to show.

---

## Hackathon Context

**Event:** Everybody Hacks 2026  
**Track:** 🌍 Disaster Response and Resilience (presented by Notion@UW)  
**Judging criteria:** Real-World Impact · Feasibility · Data Integration · Adaptability

### Planned features
- [ ] User location detection (show nearest shelter automatically)
- [ ] Danger level zone overlay
- [ ] Evacuation route guidance
- [ ] Community needs reporting form

---

## Team

Built by a team of 5 at Everybody Hacks 2026.