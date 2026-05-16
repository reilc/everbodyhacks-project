// ── map.js ─────────────────────────────────────────────────
// Sets up the Leaflet map, base tile layer, and WA state outline.
// The `map` variable is global so shelters.js and wildfires.js can add markers.

const map = window.map = L.map('map', { zoomControl: false });

// Put zoom controls in bottom-right so they don't clash with the sidebar
L.control.zoom({ position: 'bottomright' }).addTo(map);

// Minimal light basemap with visible blue water.
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  subdomains: 'abcd',
  maxZoom: 19,
}).addTo(map);

// Fit map to Washington state on load
const WA_BOUNDS = [[45.45, -124.95], [49.05, -116.85]];
map.fitBounds(WA_BOUNDS, { padding: [20, 20] });

// Draw a subtle outline around Washington state
const WA_OUTLINE = [
  [49.0, -123.32], [48.78, -123.02], [48.52, -123.25], [48.38, -124.72],
  [47.9, -124.73],  [47.25, -124.55], [46.28, -124.05], [46.18, -123.2],
  [45.54, -122.78], [45.54, -117.48], [45.94, -117.03], [49.0, -117.03],
  [49.0, -123.32],
];

L.polygon(WA_OUTLINE, {
  color: '#8f98a3',
  fillColor: '#f7f7f7',
  fillOpacity: 0.08,
  weight: 1.5,
}).addTo(map);

// Notify fire-report.js that the map is ready
window.dispatchEvent(new Event('mapReady'));
