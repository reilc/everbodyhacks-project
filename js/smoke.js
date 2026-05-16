// ── js/smoke.js ────────────────────────────────────────────
// Generates a static, edge-to-edge interpolated weather radar mesh 
// across Washington State locked specifically to the July 4, 2024 simulation.

let smokeLayersGroup = L.layerGroup();

// ── MAIN ENTRY POINT CALLED ON DATA LOAD ──
function renderSmoke() {
  const smokeList = document.getElementById('smoke-list');
  if (!smokeList) return;

  const stats = Array.isArray(allFires.stats) ? allFires.stats : [];
  if (!stats.length) {
    smokeList.innerHTML = '<div class="empty">No wildfire focal targets found for tracking.</div>';
    return;
  }

  // 1. Build a clean, static heading indicator without emojis or extra headers
  buildStaticUI(smokeList, stats);

  // 2. Compute and paint the edge-to-edge radar mesh layer for July 4th
  generateWeatherRadarGrid(stats, 0);
}

// ── WEATHER RADAR ENGINE: Inverse Distance Weighting (IDW) Grid Interpolation ──
function generateWeatherRadarGrid(stats, dayOffset) {
  // Clear out the previous canvas layers cleanly
  smokeLayersGroup.clearLayers();
  map.removeLayer(smokeLayersGroup);

  // Define bounding box limits spanning across the entirety of Washington State
  const latMin = 45.5, latMax = 49.0, latStep = 0.12; 
  const lonMin = -124.8, lonMax = -116.9, lonStep = 0.18;

  // Scan across the geographical coordinate matrix grid lines
  for (let lat = latMin; lat <= latMax; lat += latStep) {
    for (let lon = lonMin; lon <= lonMax; lon += lonStep) {
      
      let totalWeight = 0;
      let interpolatedAQI = 0;

      // Calculate the cumulative pollution drift footprint reaching this grid intersection coordinate
      stats.forEach((fire, idx) => {
        const distance = Math.sqrt(Math.pow(lat - fire.lat, 2) + Math.pow(lon - fire.lon, 2));
        
        // Static baseline AQI variance locked onto our fixed date seed pattern
        const seedValue = (fire.lat + fire.lon + idx + dayOffset) * 100;
        const fireAQIBaseline = Math.floor((Math.abs(Math.sin(seedValue)) * 260) + 30);
        
        // Inverse distance formula weight coefficient 
        const weight = 1 / Math.pow(distance + 0.15, 2); 
        totalWeight += weight;
        interpolatedAQI += fireAQIBaseline * weight;
      });

      const finalGridAQI = Math.min(Math.floor(interpolatedAQI / totalWeight), 350);
      const metrics = getAQIMetrics(finalGridAQI);

      // Skip painting grids that are entirely clean to keep map legible
      if (finalGridAQI < 35) continue; 

      // Render seamless rectangular tile grid cells to cover the full canvas scale
      const bounds = [[lat, lon], [lat + latStep, lon + lonStep]];
      const gridCell = L.rectangle(bounds, {
        color: 'transparent',
        fillColor: metrics.color,
        fillOpacity: metrics.fillOpacity * 0.42, // Balanced opacity contrast against dark tiles
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

  // Only project the layers if the smoke view panel is currently selected active
  const activeTab = document.querySelector('.tab.active');
  if (activeTab && activeTab.dataset.tab === 'smoke') {
    smokeLayersGroup.addTo(map);
  }
}

// ── STATIC INTERFACE GENERATOR ──
function buildStaticUI(container, stats) {
  // Completely removed the centered July 4, 2024 date box wrapper
  container.innerHTML = `<div id="smoke-cards-wrapper"></div>`;

  // Render supporting cards directly into the panel layout
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
        <strong>Station AQI Projection:</strong> <span style="color:${metrics.color};font-weight:bold;">${aqi}</span><br>
        <strong>Risk Designation:</strong> ${metrics.status}
      </div>`;
    card.addEventListener('click', () => map.flyTo([f.lat, f.lon], 10, { duration: 0.8 }));
    cardsWrapper.appendChild(card);
  });
}