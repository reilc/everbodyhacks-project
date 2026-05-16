# 🌲 Evergreen Alert

A web app built for **Everybody Hacks 2026** that helps Washington State residents prepare for, respond to, and recover from wildfires. Simulated around the **July 4, 2024** WA wildfire event.

[(https://everbodyhacks26-project.vercel.app)]

---

## What It Does

**Resources tab** — finds confirmed food banks, wildfire shelters, and community resource centers near the user. Automatically loads resources based on the user's GPS location on page open, or searchable by any Washington city.

**Wildfires tab** — displays WA DNR 2024 wildfire fire records and mapped perimeters across Washington state, with sized markers based on acres burned. Includes a **Community Reports** section at the top where users can pin and report fires they see in real time.

**Smoke tab** — shows a simulated smoke risk overlay derived from the July 4, 2024 fire records, helping users understand air quality risk by area.

**Add Fire Note** — a collapsible panel on the map (top-right) that lets users report a fire by tapping a mini-map to pin its location. The mini-map centers on the user's GPS location with a blue "you are here" dot. Reports show up instantly in the Community Reports section of the Wildfires tab, sorted by proximity to the user and then by severity.

---

## Features

- 📍 **Auto-location** — prompts for GPS on load and automatically shows nearby resources and centers the map
- 🗺️ **Interactive Leaflet map** — click any card to fly the map to that location
- 🔥 **WA DNR 2024 fire data** — real fire records with sized markers and polygon perimeters
- 🏕️ **Verified resource data** — confirmed July 2024 food banks, shelters, and community centers
- 💨 **Smoke risk overlay** — simulated AQI risk zones from fire proximity
- 🚨 **Community fire reporting** — pin a fire location on a mini-map, add severity/type/notes, reverse-geocoded to a real place name
- 📋 **Report sorting** — community reports sorted by distance from user, then by severity
- 🔍 **City search** — search any Washington city to filter resources and fires to that area

---

## Getting Started

### Prerequisites
Python (pre-installed on most Macs) or any static file server.

### Run locally

```bash
git clone https://github.com/reilc/everbodyhacks-project.git
cd everbodyhacks-project
python3 -m http.server 8080
```

Then open **http://localhost:8080** in your browser.

> ⚠️ Do **not** open `index.html` directly as a file (`file:///...`) — the external APIs won't load due to browser CORS restrictions. Always use `localhost`.

When prompted, **allow location access** — this enables auto-loading nearby resources and the blue dot in the fire report mini-map.

---

## Project Structure

```
everbodyhacks-project/
├── index.html            # HTML structure — sidebar, tabs, panels, map
├── style.css             # All styling and CSS variables
└── js/
    ├── config.js         # API URLs, constants, shared state
    ├── map.js            # Leaflet map init, WA outline, tile layer
    ├── shelters.js       # Resource fetching, scoring, and rendering
    ├── wildfires.js      # WA DNR fire data, perimeters, community reports section
    ├── smoke.js          # Smoke risk overlay rendering
    ├── aqi-service.js    # AQI data service
    ├── ui.js             # Tabs, search, GPS auto-load, app boot
    └── fire-report.js    # "Add Fire Note" map control with mini-map picker
```

### Who owns what

| File | Responsible for |
|---|---|
| `index.html` | Page structure, tabs, panels |
| `style.css` | All visual design and CSS variables |
| `js/config.js` | API endpoints, simulation date, shared constants |
| `js/map.js` | Map setup, tile layer, WA state outline |
| `js/shelters.js` | Resource data, scoring, distance filtering, cards |
| `js/wildfires.js` | Fire data fetching, perimeters, community reports section |
| `js/smoke.js` | Smoke overlay layer |
| `js/ui.js` | Search, tabs, GPS auto-load on boot |
| `js/fire-report.js` | Report a fire panel, mini-map picker, blue dot, geocoding |

---

## Data Sources

| Data | Source | Key needed? |
|---|---|---|
| WA DNR 2024 fire statistics | [WA DNR ArcGIS](https://fortress.wa.gov/dnr/adminsa/gisdata/lidar/DNR_Fire_Statistics/) | No |
| 2024 wildfire perimeters | NIFC ArcGIS Feature Service | No |
| Reverse geocoding (place names) | [Nominatim / OpenStreetMap](https://nominatim.openstreetmap.org) | No |
| Map tiles | [CartoDB Voyager](https://carto.com/basemaps/) | No |

All data sources are free and publicly accessible — no API keys required.

---

## Git Workflow

With 5 people on the team, push directly to `main` causes constant diverged branch errors. Use feature branches instead:

```bash
# Before starting work, always pull latest main first
git checkout main
git pull origin main

# Create your own branch
git checkout -b your-name/what-youre-doing

# Work, commit, push to YOUR branch
git add .
git commit -m "description"
git push origin your-name/what-youre-doing

# Then open a Pull Request on GitHub to merge into main
```

**Rule: never push directly to `main`.** Always merge via Pull Request.

---

## Hackathon Context

**Event:** Everybody Hacks 2026
**Track:** 🌍 Disaster Response and Resilience (presented by Notion@UW)
**Judging criteria:** Real-World Impact · Feasibility · Data Integration · Adaptability

---

## Team

Built by a team of 5 at Everybody Hacks 2026 — University of Washington, Seattle.
