// ── js/smoke.js ────────────────────────────────────────────
// Generates a static, edge-to-edge interpolated weather radar mesh 
// across Washington State locked specifically to the July 4, 2024 simulation.

let smokeLayersGroup = L.layerGroup();

const WASHINGTON_COUNTY_COORDINATES = {
  "Chelan County": [47.4235, -120.3103],
  "Stevens County": [48.5448, -117.9052],
  "Yakima County": [46.6021, -120.5059],
  "Okanogan County": [48.3617, -119.5786],
  "Ferry County": [48.6479, -118.6019],
  "Walla Walla County": [46.0646, -118.3430],
  "Kittitas County": [46.9965, -120.5478],
  "Douglas County": [47.4851, -119.7423]
};

function renderSmoke() {
  const smokeList = document.getElementById('smoke-list');
  if (!smokeList) return;

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
        <div class="popup-title">Regional Air Quality Canvas</div>
        <div class="popup-row"><strong>Observation Window:</strong> July 4, 2024</div>
        <div class="popup-row"><strong>Grid Air Index:</strong> <span style="color:${metrics.color};font-weight:bold;">${finalGridAQI} (${metrics.status})</span></div>
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

  const seenCounties = new Set();

  stats.forEach(f => {
    let countyName = f.county || "Washington State";
    if (countyName !== "Washington State" && !countyName.toLowerCase().includes("county")) {
      countyName += " County";
    }

    if (seenCounties.has(countyName)) return;
    seenCounties.add(countyName);

    const localSeed = (f.lat + f.lon + 0) * 100;
    const aqi = Math.floor((Math.abs(Math.sin(localSeed)) * 240) + 40);
    const metrics = getAQIMetrics(aqi);

    const panCoordinates = WASHINGTON_COUNTY_COORDINATES[countyName] || [f.lat, f.lon];

    const card = document.createElement('div');
    card.className = 'card';
    card.style.borderLeft = `4px solid ${metrics.color}`;
    card.innerHTML = `
      <div class="card-title">${countyName} Air Quality Zone</div>
      <div class="card-detail">
        <strong>Station AQI Projection:</strong> <span style="color:${metrics.color};font-weight:bold;">${aqi}</span><br>
        <strong>Risk Designation:</strong> ${metrics.status}
      </div>`;
    
    card.addEventListener('click', () => map.flyTo(panCoordinates, 9, { duration: 0.8 }));
    cardsWrapper.appendChild(card);
  });
}
