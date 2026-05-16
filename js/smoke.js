// smoke.js
// Generates a comprehensive county-level air quality index ledger across Washington State.

let smokeLayersGroup = L.layerGroup();
let mapLegendControl = null;
let mapLegendEl = null;
let visibleSmokeBreakpoints = new Set();

const ALL_WASHINGTON_COUNTIES = {
  "Adams County": [46.9829, -118.5601],
  "Asotin County": [46.1879, -117.2023],
  "Benton County": [46.2394, -119.5113],
  "Chelan County": [47.6205, -120.6203],
  "Clallam County": [48.0474, -123.9226],
  "Clark County": [45.7715, -122.4826],
  "Columbia County": [46.2294, -117.9123],
  "Cowlitz County": [46.1891, -122.6841],
  "Douglas County": [47.5851, -119.7423],
  "Ferry County": [48.4711, -118.5152],
  "Franklin County": [46.5362, -118.8997],
  "Garfield County": [46.2752, -117.5451],
  "Grant County": [47.2039, -119.4526],
  "Grays Harbor County": [47.1137, -123.8267],
  "Island County": [48.1706, -122.5856],
  "Jefferson County": [47.7479, -123.5554],
  "King County": [47.4913, -121.8346],
  "Kitsap County": [47.6362, -122.6483],
  "Kittitas County": [47.1165, -120.5478],
  "Klickitat County": [45.8741, -120.7891],
  "Lewis County": [46.5779, -122.3951],
  "Lincoln County": [47.5752, -118.4178],
  "Mason County": [47.2341, -123.1846],
  "Okanogan County": [48.5479, -119.7423],
  "Pacific County": [46.5562, -123.7252],
  "Pend Oreille County": [48.5329, -117.2751],
  "Pierce County": [46.9912, -122.1241],
  "San Juan County": [48.5662, -122.9723],
  "Skagit County": [48.4779, -121.6951],
  "Skamania County": [46.0234, -121.9341],
  "Snohomish County": [48.0412, -121.6951],
  "Spokane County": [47.6212, -117.4023],
  "Stevens County": [48.3979, -117.8552],
  "Thurston County": [46.9241, -122.8252],
  "Wahkiakum County": [46.2941, -123.4252],
  "Walla Walla County": [46.2212, -118.3241],
  "Whatcom County": [48.8241, -121.9023],
  "Whitman County": [46.8912, -117.4023],
  "Yakima County": [46.4552, -120.7423],
};

function showMapLegend() {
  if (mapLegendControl) {
    mapLegendControl.addTo(map);
    updateMapLegendContent();
    return;
  }

  mapLegendControl = L.control({ position: 'topright' });
  mapLegendControl.onAdd = function() {
    const div = L.DomUtil.create('div', 'map-legend');
    mapLegendEl = div;
    updateMapLegendContent();
    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.disableScrollPropagation(div);
    return div;
  };
  mapLegendControl.addTo(map);
}

function updateMapLegendContent() {
  if (!mapLegendEl) return;

  const activeTab = document.querySelector('.tab.active')?.dataset.tab;
  mapLegendEl.innerHTML = activeTab === 'smoke'
    ? buildSmokeLegendHtml()
    : `
      <div class="map-legend-title">Map Legend</div>
      <div class="map-legend-item">
        <span class="map-legend-symbol wildfire-symbol"></span>
        <span>Wildfire</span>
      </div>
      <div class="map-legend-item">
        <span class="map-legend-symbol selected-wildfire-symbol"></span>
        <span>Wildfire selected</span>
      </div>
      <div class="map-legend-item">
        <span class="map-legend-symbol resource-symbol"></span>
        <span>Resource</span>
      </div>
      <div class="map-legend-item">
        <span class="map-legend-symbol city-symbol"></span>
        <span>City searched</span>
      </div>
    `;
}

function buildSmokeLegendHtml() {
  const labels = ['Low smoke', 'Moderate smoke', 'Elevated risk', 'Unhealthy', 'Very unhealthy', 'Hazardous'];
  const listedBreakpoints = EPA_BREAKPOINTS.filter(breakpoint => visibleSmokeBreakpoints.has(breakpoint.class));
  const items = listedBreakpoints.map(breakpoint => `
    <div class="map-legend-item">
      <span class="map-legend-symbol smoke-risk-symbol" style="background:${breakpoint.color}"></span>
      <span>${labels[EPA_BREAKPOINTS.indexOf(breakpoint)] || breakpoint.status}</span>
    </div>
  `).join('');

  return `<div class="map-legend-title">Smoke Legend</div>${items || '<div class="map-legend-note">No risk designations listed</div>'}`;
}

function hideMapLegend() {
  if (mapLegendControl) map.removeControl(mapLegendControl);
}

const showSmokeLegend = showMapLegend;
const hideSmokeLegend = hideMapLegend;

function renderSmoke() {
  const smokeList = document.getElementById('smoke-list');
  if (!smokeList) return;

  const statusTextEl = document.getElementById('smoke-status-text');
  if (statusTextEl) {
    statusTextEl.innerText = `Smoke index for ${INCIDENT_DATE_LABEL}`;
  }

  const stats = Array.isArray(allFires.stats) ? allFires.stats : [];
  buildStaticUI(smokeList, stats);
  updateMapLegendContent();
  generateWeatherRadarGrid(stats, 0);
}

function generateWeatherRadarGrid(stats, dayOffset) {
  smokeLayersGroup.clearLayers();
  map.removeLayer(smokeLayersGroup);

  if (!stats.length) return;

  const latMin = 45.5, latMax = 49.0, latStep = 0.12;
  const lonMin = -124.8, lonMax = -116.9, lonStep = 0.18;

  for (let lat = latMin; lat <= latMax; lat += latStep) {
    for (let lon = lonMin; lon <= lonMax; lon += lonStep) {
      let totalWeight = 0;
      let interpolatedAQI = 0;

      stats.forEach((fire, idx) => {
        const distance = Math.sqrt(Math.pow(lat - fire.lat, 2) + Math.pow(lon - fire.lon, 2));
        const seedValue = (fire.lat + fire.lon + idx + dayOffset) * 100;
        const fireAQIBaseline = Math.floor((Math.abs(Math.sin(seedValue)) * 260) + 30);
        const weight = 1 / Math.pow(distance + 0.15, 2);

        totalWeight += weight;
        interpolatedAQI += fireAQIBaseline * weight;
      });

      const finalGridAQI = Math.min(Math.floor(interpolatedAQI / totalWeight), 350);
      const metrics = getAQIMetrics(finalGridAQI);

      if (finalGridAQI < 35) continue;

      const bounds = [[lat, lon], [lat + latStep, lon + lonStep]];
      const gridCell = L.rectangle(bounds, {
        color: 'transparent',
        fillColor: metrics.color,
        fillOpacity: metrics.fillOpacity * 0.42,
        interactive: true,
      });

      gridCell.bindPopup(`
        <div class="popup-title">Regional Air Quality Canvas</div>
        <div class="popup-row"><strong>Observation Window:</strong> ${INCIDENT_DATE_LABEL}</div>
        <div class="popup-row"><strong>Grid Air Index:</strong> <span style="color:${metrics.color};font-weight:bold;">${finalGridAQI} (${metrics.status})</span></div>
      `);

      smokeLayersGroup.addLayer(gridCell);
    }
  }

  const activeTab = document.querySelector('.tab.active');
  if (activeTab && activeTab.dataset.tab === 'smoke') {
    smokeLayersGroup.addTo(map);
    updateMapLegendContent();
  }
}

function buildStaticUI(container, stats) {
  visibleSmokeBreakpoints = new Set();
  container.innerHTML = `<div id="smoke-cards-wrapper"></div>`;
  const cardsWrapper = document.getElementById('smoke-cards-wrapper');

  Object.keys(ALL_WASHINGTON_COUNTIES).sort().forEach(countyName => {
    const coords = ALL_WASHINGTON_COUNTIES[countyName];
    let finalAQI = 42;

    if (stats.length) {
      let totalWeight = 0;
      let weightedSum = 0;

      stats.forEach((fire, idx) => {
        const distance = Math.sqrt(Math.pow(coords[0] - fire.lat, 2) + Math.pow(coords[1] - fire.lon, 2));
        const seedValue = (fire.lat + fire.lon + idx) * 100;
        const fireAQIBaseline = Math.floor((Math.abs(Math.sin(seedValue)) * 260) + 30);
        const weight = 1 / Math.pow(distance + 0.2, 2);

        totalWeight += weight;
        weightedSum += fireAQIBaseline * weight;
      });

      finalAQI = Math.min(Math.floor(weightedSum / totalWeight), 320);
    }

    const metrics = getAQIMetrics(finalAQI);
    visibleSmokeBreakpoints.add(metrics.class);

    const card = document.createElement('div');
    card.className = 'card';
    card.style.borderLeft = `4px solid ${metrics.color}`;
    card.innerHTML = `
      <div class="card-title">${countyName} Air Quality Zone</div>
      <div class="card-detail">
        <strong>AQI Projection:</strong> <span style="color:${metrics.color};font-weight:bold;">${finalAQI}</span><br>
        <strong>Risk Designation:</strong> ${metrics.status}
      </div>`;

    card.addEventListener('click', () => map.flyTo(coords, 9, { duration: 0.8 }));
    cardsWrapper.appendChild(card);
  });
}
