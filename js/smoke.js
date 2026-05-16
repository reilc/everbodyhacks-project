// ── js/smoke.js ────────────────────────────────────────────
// Handles rendering smoke quality layers on the map and generating
// air quality summary cards in the sidebar panel.

// Global tracking array for smoke layers
let smokeMarkers = [];

function renderSmoke() {
  const smokeList = document.getElementById('smoke-list');

  smokeMarkers.forEach(marker => map.removeLayer(marker));
  smokeMarkers = [];

  const stats = Array.isArray(allFires.stats) ? allFires.stats : [];

  if (!stats.length) {
    smokeList.innerHTML = '<div class="empty"><div class="icon">💨</div>No air quality records available.</div>';
    return;
  }

  renderSmokeHalos(stats);

  renderSmokeCards(smokeList, stats);
}

function renderSmokeHalos(stats) {
  stats.forEach(fire => {
    const aqiScore = fire.aqi || Math.floor(Math.random() * (280 - 15)) + 15;
    const metrics = getAQIMetrics(aqiScore);

    const baseRadius = 8000;
    const acreageBonus = Math.min(Math.sqrt(fire.acres || 0) * 150, 25000); 
    const dynamicRadius = baseRadius + acreageBonus;

    const smokeZone = L.circle([fire.lat, fire.lon], {
        radius: dynamicRadius, 
        color: metrics.color,
        fillColor: metrics.color,    
        fillOpacity: metrics.fillOpacity * 0.18, 
        weight: 1,
        dashArray: "3, 6",
        interactive: true
    }).addTo(map);

    smokeZone.bindPopup(`
      <div class="popup-title">💨 ${fire.name} Airshed Impact</div>
      <div class="popup-row"><strong>Local AQI:</strong> <span style="color:${metrics.color}; font-weight:bold;">${aqiScore} (${metrics.status})</span></div>
      <div class="popup-row"><strong>Acreage Size:</strong> ${fire.acres ? Math.round(fire.acres).toLocaleString() : '0'} acres</div>
    `);

    smokeMarkers.push(smokeZone);
  });
}

function renderSmokeCards(list, stats) {
  list.innerHTML = '';
  stats.forEach(f => {
    const aqiScore = f.aqi || 45;
    const metrics = getAQIMetrics(aqiScore);
    
    const card = document.createElement('div');
    card.className = 'card';
    card.style.borderLeft = `4px solid ${metrics.color}`;
    card.innerHTML = `
      <div class="card-title">💨 ${f.name} Airshed</div>
      <div class="card-detail">
        <strong>AQI Index:</strong> <span style="color:${metrics.color};font-weight:bold;">${aqiScore}</span><br>
        <strong>Status:</strong> ${metrics.status}
      </div>`;
      
    card.addEventListener('click', () => map.flyTo([f.lat, f.lon], 10, { duration: 0.8 }));
    list.appendChild(card);
  });
}