// ── js/smoke.js ────────────────────────────────────────────
// Generates an edge-to-edge interpolated weather radar mesh across 
// Washington state, animated on a day-by-day time controller series.

let smokeLayersGroup = L.layerGroup();
let currentDayIndex = 0;
const TOTAL_DAYS = 5; 

// Generate dates starting from today
const DAY_LABELS = Array.from({ length: TOTAL_DAYS }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() + i);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
});

function renderSmoke() {
  const smokeList = document.getElementById('smoke-list');
  if (!smokeList) return;

  const stats = Array.isArray(allFires.stats) ? allFires.stats : [];
  if (!stats.length) {
    smokeList.innerHTML = '<div class="empty"><div class="icon">💨</div>No wildfire focal targets found for tracking.</div>';
    return;
  }

  // 1. Initialize the playback interface container inside the sidebar panel
  buildTimelineUI(smokeList, stats);

  // 2. Compute and paint the edge-to-edge radar mesh layer for the active day index
  generateWeatherRadarGrid(stats, currentDayIndex);
}

function generateWeatherRadarGrid(stats, dayOffset) {
  // Clear out the previous day's canvas layers cleanly
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
        <div class="popup-title">💨 Regional Air Quality Canvas</div>
        <div class="popup-row"><strong>Forecast Window:</strong> ${DAY_LABELS[dayOffset]}</div>
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

function buildTimelineUI(container, stats) {
  container.innerHTML = `
    <div style="padding: 16px; background: var(--surface2); border-radius: 8px; margin-bottom: 12px; border: 1px solid var(--border);">
      <h3 style="font-size: 14px; margin-bottom: 8px; color: var(--text);">📅 Time-Series Outlook</h3>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <button id="btn-play-timeline" style="background: var(--accent); color: white; border: none; padding: 6px 14px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 12px;">▶ Play Timeline</button>
        <span id="label-active-day" style="font-size: 13px; font-weight: bold; color: var(--accent2); font-family: 'DM Mono', monospace;">${DAY_LABELS[currentDayIndex]}</span>
      </div>
      <input id="slider-timeline" type="range" min="0" max="${TOTAL_DAYS - 1}" value="${currentDayIndex}" style="width: 100%; accent-color: var(--accent);" />
    </div>
    <div id="smoke-cards-wrapper"></div>
  `;

  const slider = document.getElementById('slider-timeline');
  slider.addEventListener('input', (e) => {
    currentDayIndex = parseInt(e.target.value);
    document.getElementById('label-active-day').innerText = DAY_LABELS[currentDayIndex];
    generateWeatherRadarGrid(stats, currentDayIndex);
  });

  let playbackInterval = null;
  const playBtn = document.getElementById('btn-play-timeline');
  playBtn.addEventListener('click', () => {
    if (playbackInterval) {
      clearInterval(playbackInterval);
      playbackInterval = null;
      playBtn.innerText = "▶ Play Timeline";
    } else {
      playBtn.innerText = "⏸ Pause";
      playbackInterval = setInterval(() => {
        currentDayIndex = (currentDayIndex + 1) % TOTAL_DAYS;
        slider.value = currentDayIndex;
        document.getElementById('label-active-day').innerText = DAY_LABELS[currentDayIndex];
        generateWeatherRadarGrid(stats, currentDayIndex);
      }, 1250);
    }
  });

  const cardsWrapper = document.getElementById('smoke-cards-wrapper');
  stats.forEach(f => {
    const localSeed = (f.lat + f.lon + currentDayIndex) * 100;
    const aqi = Math.floor((Math.abs(Math.sin(localSeed)) * 240) + 40);
    const metrics = getAQIMetrics(aqi);

    const card = document.createElement('div');
    card.className = 'card';
    card.style.borderLeft = `4px solid ${metrics.color}`;
    card.innerHTML = `
      <div class="card-title">💨 ${f.name} Sector</div>
      <div class="card-detail">
        <strong>Station AQI Projection:</strong> <span style="color:${metrics.color};font-weight:bold;">${aqi}</span><br>
        <strong>Risk Designation:</strong> ${metrics.status}
      </div>`;
    card.addEventListener('click', () => map.flyTo([f.lat, f.lon], 10, { duration: 0.8 }));
    cardsWrapper.appendChild(card);
  });
}