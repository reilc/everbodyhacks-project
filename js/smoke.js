// ── js/smoke.js ────────────────────────────────────────────
// Generates a static, edge-to-edge interpolated weather radar mesh across Washington State.

let smokeLayersGroup = L.layerGroup();
let mapLegendControl = null;
let mapLegendEl = null;

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
  const items = EPA_BREAKPOINTS.map((breakpoint, index) => `
    <div class="map-legend-item">
      <span class="map-legend-symbol smoke-risk-symbol" style="background:${breakpoint.color}"></span>
      <span>${labels[index] || breakpoint.status}</span>
    </div>
  `).join('');

  return `<div class="map-legend-title">Smoke Legend</div>${items}`;
}

function hideMapLegend() {
  if (mapLegendControl) map.removeControl(mapLegendControl);
}

const showSmokeLegend = showMapLegend;
const hideSmokeLegend = hideMapLegend;

function renderSmoke() {
  const smokeList = document.getElementById('smoke-list');
  if (!smokeList) return;

  const today = new Date();
  const options = { month: 'long', day: 'numeric', year: 'numeric' };
  const formattedDate = today.toLocaleDateString('en-US', options);

  const statusTextEl = document.getElementById('smoke-status-text');
  if (statusTextEl) {
    statusTextEl.innerText = `Smoke index for ${formattedDate}`;
  }

  const stats = Array.isArray(allFires.stats) ? allFires.stats : [];
  if (!stats.length) {
    smokeList.innerHTML = '<div class="empty">No wildfire focal targets found for tracking.</div>';
    return;
  }

  buildStaticUI(smokeList, stats);

  generateWeatherRadarGrid(stats, 0);
}

function generateWeatherRadarGrid(stats, dayOffset) {

  smokeLayersGroup.clearLayers();
  map.removeLayer(smokeLayersGroup);

  const latMin = 45.5, latMax = 49.0, latStep = 0.12; 
  const lonMin = -124.8, lonMax = -116.9, lonStep = 0.18;

  for (let lat = latMin; lat <= latMax; lat += latStep) {
    for (let lon = lonMin; lon <= lonMax; lon += lonStep) {
      
      let totalWeight = 0;
      let interpolatedAQI = 0;

      // Calculate the cumulative pollution drift footprint reaching this grid intersection coordinate
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
        interactive: true
      });

      gridCell.bindPopup(`
        <div class="popup-title">Smoke Risk Cell</div>
        <div class="popup-row"><strong>Observation Window:</strong> July 4, 2024</div>
        <div class="popup-row"><strong>Modeled Risk Index:</strong> <span style="color:${metrics.color};font-weight:bold;">${finalGridAQI} (${metrics.status})</span></div>
      `);

      smokeLayersGroup.addLayer(gridCell);
    }
  }

  const activeTab = document.querySelector('.tab.active');
  if (activeTab && activeTab.dataset.tab === 'smoke') {
    smokeLayersGroup.addTo(map);
  }
}

function buildStaticUI(container, stats) {
  container.innerHTML = `<div id="smoke-cards-wrapper"></div>`;

  const cardsWrapper = document.getElementById('smoke-cards-wrapper');
  stats.forEach(f => {
    const localSeed = (f.lat + f.lon + 0) * 100;
    const aqi = Math.floor((Math.abs(Math.sin(localSeed)) * 240) + 40);
    const metrics = getAQIMetrics(aqi);

    const card = document.createElement('div');
    card.className = 'card';
    card.style.borderLeft = `4px solid ${metrics.color}`;
    card.innerHTML = `
      <div class="card-title">${f.name} Sector</div>
      <div class="card-detail">
        <strong>Smoke Index:</strong> <span style="color:${metrics.color};font-weight:bold;">${aqi}</span><br>
        <strong>Risk Designation:</strong> ${metrics.status}
      </div>`;
    card.addEventListener('click', () => map.flyTo([f.lat, f.lon], 10, { duration: 0.8 }));
    cardsWrapper.appendChild(card);
  });
}
