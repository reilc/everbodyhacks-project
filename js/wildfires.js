// ── wildfires.js ───────────────────────────────────────────
// Fetches historical WA wildfire data and renders cards in the
// sidebar + orange polygon/circle markers on the map.

async function loadWildfires() {
  const dot    = document.getElementById('fire-dot');
  const status = document.getElementById('fire-status');
  let data     = null;

  const params = new URLSearchParams({
    where: '1=1',
    outFields: 'FIRE_NAME,YEAR_,COUNTY,GIS_ACRES,CAUSE,ALARM_DATE',
    returnGeometry: 'true',
    outSR: '4326',
    f: 'json',
    resultRecordCount: '200',
    orderByFields: 'YEAR_ DESC',
  });

  // Try primary WA wildfire endpoint
  try {
    const res = await fetch(`${WA_FIRE_URL}?${params}`);
    data = await res.json();
    if (!data.features) throw new Error('No features in response');
  } catch {
    // Try fallback WA DNR endpoint
    try {
      const fbParams = new URLSearchParams({
        where: '1=1', outFields: '*',
        returnGeometry: 'true', outSR: '4326',
        f: 'json', resultRecordCount: '200',
      });
      const res2 = await fetch(`${WA_FIRE_FALLBACK}?${fbParams}`);
      data = await res2.json();
    } catch (err2) {
      dot.className      = 'status-dot err';
      status.textContent = 'Failed to load wildfire data';
      document.getElementById('fire-list').innerHTML =
        '<div class="empty"><div class="icon">⚠️</div>Could not reach WA wildfire API.<br>Check your connection.</div>';
      console.error('WA fire error:', err2);
      return;
    }
  }

  allFires = (data.features || [])
    .filter(f => f.geometry)
    .map(f => {
      const a = f.attributes;

      // Polygons have rings; points have x/y — handle both
      let lat, lon;
      if (f.geometry.rings) {
        const ring = f.geometry.rings[0];
        lon = ring.reduce((s, p) => s + p[0], 0) / ring.length;
        lat = ring.reduce((s, p) => s + p[1], 0) / ring.length;
      } else {
        lat = f.geometry.y;
        lon = f.geometry.x;
      }

      return {
        name:  a.FIRE_NAME  || a.FIRENAME || 'Unnamed Fire',
        year:  a.YEAR_      || a.YEAR     || a.FIREYEAR,
        county: a.COUNTY    || a.COUNTYFIPS || '',
        acres: a.GIS_ACRES  || a.TOTALACRES || 0,
        cause: a.CAUSE      || '',
        startDate: a.ALARM_DATE,
        lat, lon,
        rings: f.geometry.rings || null,
      };
    })
    .filter(f => !isNaN(f.lat) && !isNaN(f.lon));

  allFires = enrichLocationData(allFires);

  dot.className      = 'status-dot ok';
  status.textContent = `${allFires.length} historical fires loaded`;
  renderFires();

  dot.className      = 'status-dot ok';
  status.textContent = `${allFires.length} historical fires loaded`;
  renderFires();
}

function renderFires() {
  const list = document.getElementById('fire-list');

  // Remove old markers from map
  fireMarkers.forEach(m => map.removeLayer(m));
  fireMarkers = [];

  const q = searchQuery.toLowerCase();
  const filtered = allFires.filter(f => {
    const matchYear   = fireYearFilter === 'all' || String(f.year) === fireYearFilter;
    const matchSearch = !q || (f.name || '').toLowerCase().includes(q) || (f.county || '').toLowerCase().includes(q);
    return matchYear && matchSearch;
  });

  if (!filtered.length) {
    list.innerHTML = '<div class="empty"><div class="icon">🔥</div>No fires match filters.</div>';
    return;
  }

  list.innerHTML = '';
  filtered.forEach(f => {
    const acres = f.acres ? `${Math.round(f.acres).toLocaleString()} acres` : '';

    // ── Sidebar card ──
    const card    = document.createElement('div');
    card.className = 'card fire';
    card.innerHTML = `
      <div class="card-title">
        🔥 ${f.name || 'Unnamed'}
        <span class="badge fire">${f.year || '—'}</span>
      </div>
      <div class="card-detail">
        ${f.county ? `<strong>County:</strong> ${f.county}<br>` : ''}
        ${acres    ? `<strong>Size:</strong> ${acres}<br>`      : ''}
        ${f.cause  ? `<strong>Cause:</strong> ${f.cause}`       : ''}
      </div>`;

    card.addEventListener('click', () => map.flyTo([f.lat, f.lon], 11, { duration: 0.8 }));
    list.appendChild(card);

    const metrics = getAQIMetrics(f.aqi);
    
    const smokeZone = L.circle([f.lat, f.lon], {
        radius: 22000,
        color: metrics.color,
        fillColor: metrics.color,    
        fillOpacity: metrics.fillOpacity * 0.25,
        weight: 1,
        dashArray: "4, 4",
        interactive: false
    }).addTo(map);
    
    fireMarkers.push(smokeZone);
    

    // ── Map marker — polygon if we have ring data, circle otherwise ──
    if (f.rings) {
      const latlngs = f.rings[0].map(p => [p[1], p[0]]);
      const poly    = L.polygon(latlngs, {
        color: '#ff6b35', fillColor: '#ff6b35', fillOpacity: 0.3, weight: 1.5,
      }).addTo(map);
      poly.bindPopup(`
        <div class="popup-title">🔥 ${f.name}</div>
        <div class="popup-row"><strong>Year:</strong> ${f.year}</div>
        <div class="popup-row"><strong>County:</strong> ${f.county || 'N/A'}</div>
        ${acres ? `<div class="popup-row"><strong>Size:</strong> ${acres}</div>` : ''}
      `);
      fireMarkers.push(poly);
    } else {
      const m = L.circleMarker([f.lat, f.lon], {
        color: '#ff6b35', fillColor: '#ff6b35', fillOpacity: 0.7, radius: 7, weight: 2,
      }).addTo(map);
      m.bindPopup(`<div class="popup-title">🔥 ${f.name}</div>`);
      fireMarkers.push(m);
    }
  });
}