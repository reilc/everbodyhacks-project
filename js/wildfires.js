// wildfires.js
// Loads WA DNR 2024 fire-statistic points statewide plus mapped 2024 fire perimeters.
// Also renders a "Community Reports" section at the top of the fires panel,
// fed by reports saved in localStorage by fire-report.js.

async function loadWildfires() {
  const dot = document.getElementById('fire-dot');
  const status = document.getElementById('fire-status');

  dot.className = 'status-dot loading';
  status.textContent = `Loading ${INCIDENT_DATE_LABEL} fire records...`;
  allFires = { stats: [], perimeters: [] };

  try {
    const stats = await loadDnrFireStats();
    allFires = { stats, perimeters: [] };
    dot.className = 'status-dot ok';
    status.textContent = `${stats.length} WA DNR fire records loaded; loading mapped perimeters...`;
    renderFires();

    try {
      const perimeters = await loadFirePerimeters();
      allFires = { stats, perimeters };
      status.textContent = `${INCIDENT_DATE_LABEL}: ${stats.length} WA DNR fire records`;
      renderFires();
    } catch (perimeterErr) {
      console.warn('2024 wildfire perimeter layer error:', perimeterErr);
      status.textContent = `${INCIDENT_DATE_LABEL}: ${stats.length} WA DNR fire records`;
    }
  } catch (err) {
    console.error('2024 wildfire data error:', err);
    dot.className = 'status-dot err';
    status.textContent = 'Failed to load 2024 wildfire data';
    allFires = { stats: [], perimeters: [] };
    renderFires();
  }
}

async function loadDnrFireStats() {
  const params = new URLSearchParams({
    where: `DSCVR_DT >= DATE '${INCIDENT_DATE}' AND DSCVR_DT < DATE '2024-07-05'`,
    outFields: 'OBJECTID,INCIDENT_NM,COUNTY_LABEL_NM,FIREGCAUSE_LABEL_NM,ACRES_BURNED,DSCVR_DT,FIREEVNT_CLASS_LABEL_NM,LAT_COORD,LON_COORD,START_OWNER_AGENCY_NM,START_JURISDICTION_AGENCY_NM,PROTECTION_TYPE,REGION_NAME',
    returnGeometry: 'true',
    outSR: '4326',
    f: 'json',
    resultRecordCount: '2000',
    orderByFields: 'ACRES_BURNED DESC',
  });

  const res = await fetch(`${DNR_FIRE_STATS_2024_URL}?${params}`);
  if (!res.ok) throw new Error(`WA DNR fire stats returned ${res.status}`);

  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'WA DNR fire stats API error');

  return (data.features || [])
    .map(dnrFeatureToFire)
    .filter(Boolean);
}

async function loadFirePerimeters() {
  const params = new URLSearchParams({
    where: 'FIRE_YEAR = 2024',
    geometry: WA_ENVELOPE,
    geometryType: 'esriGeometryEnvelope',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: '*',
    returnGeometry: 'true',
    outSR: '4326',
    f: 'json',
    resultRecordCount: '500',
  });

  const res = await fetch(`${FIRE_PERIMETER_2024_URL}?${params}`);
  if (!res.ok) throw new Error(`Wildfire perimeter API returned ${res.status}`);

  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'Wildfire perimeter API error');

  return (data.features || [])
    .map(perimeterFeatureToFire)
    .filter(Boolean)
    .sort((a, b) => b.acres - a.acres);
}

function dnrFeatureToFire(feature) {
  const attributes = feature.attributes || {};
  const lat = Number(feature.geometry?.y ?? attributes.LAT_COORD);
  const lon = Number(feature.geometry?.x ?? attributes.LON_COORD);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  return {
    id: attributes.OBJECTID,
    name: attributes.INCIDENT_NM || 'Unnamed DNR fire',
    county: attributes.COUNTY_LABEL_NM || '',
    acres: Number(attributes.ACRES_BURNED || 0),
    cause: attributes.FIREGCAUSE_LABEL_NM || 'Unknown',
    discovered: formatDate(attributes.DSCVR_DT),
    className: attributes.FIREEVNT_CLASS_LABEL_NM || '',
    owner: attributes.START_OWNER_AGENCY_NM || '',
    jurisdiction: attributes.START_JURISDICTION_AGENCY_NM || '',
    protection: attributes.PROTECTION_TYPE || '',
    region: attributes.REGION_NAME || '',
    lat,
    lon,
    layer: 'WA DNR fire record',
  };
}

function perimeterFeatureToFire(feature) {
  const geometry = feature.geometry;
  const center = getGeometryCenter(geometry);
  if (!center) return null;

  const attributes = feature.attributes || {};

  return {
    name: attributes.INCIDENT || attributes.FIRE_NAME || attributes.FIRENAME || 'Unnamed Fire',
    year: attributes.FIRE_YEAR || 2024,
    county: attributes.COUNTY || attributes.COUNTY_LABEL || '',
    acres: Number(attributes.GIS_ACRES || attributes.ACRES || attributes.Shape__Area || 0),
    cause: attributes.FIRE_TYPE || attributes.CAUSE || '2024 perimeter',
    lat: center.lat,
    lon: center.lon,
    rings: geometry?.rings || null,
    layer: 'mapped perimeter',
  };
}

function getGeometryCenter(geometry) {
  if (!geometry) return null;

  if (Number.isFinite(geometry.y) && Number.isFinite(geometry.x)) {
    return { lat: geometry.y, lon: geometry.x };
  }

  const ring = geometry.rings?.[0];
  if (!ring?.length) return null;

  const totals = ring.reduce((acc, point) => {
    acc.lon += point[0];
    acc.lat += point[1];
    return acc;
  }, { lat: 0, lon: 0 });

  return {
    lat: totals.lat / ring.length,
    lon: totals.lon / ring.length,
  };
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function renderFires() {
  const list = document.getElementById('fire-list');

  fireMarkers.forEach(marker => map.removeLayer(marker));
  fireMarkers = [];

  const allStats = Array.isArray(allFires.stats) ? allFires.stats : [];
  const allPerimeters = Array.isArray(allFires.perimeters) ? allFires.perimeters : [];
  const stats = selectedCity
    ? allStats.filter(fire => distanceMiles(selectedCity, fire) <= CITY_FIRE_RADIUS_MILES)
    : allStats;
  const perimeters = selectedCity
    ? allPerimeters.filter(fire => distanceMiles(selectedCity, fire) <= CITY_FIRE_RADIUS_MILES)
    : allPerimeters;

  // Always clear and render community reports section first
  list.innerHTML = '';
  renderReportCards(list);

  if (!stats.length && !perimeters.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.innerHTML = '<div class="icon">🔥</div>No 2024 wildfire records loaded.';
    list.appendChild(empty);
    return;
  }

  renderPerimeters(perimeters);
  renderFirePoints(stats);
  renderFireCards(list, stats, perimeters);
  updateFireStatus(stats, perimeters);

  if (typeof renderSmoke === 'function') {
    renderSmoke();
  }

  if (document.querySelector('.tab.active')?.dataset.tab === 'smoke') {
    fireMarkers.forEach(marker => map.removeLayer(marker));
  }
}

function updateFireStatus(stats, perimeters) {
  const status = document.getElementById('fire-status');
  if (!status) return;

  status.textContent = selectedCity
    ? `${stats.length} ${INCIDENT_DATE_LABEL} fire records within ${CITY_FIRE_RADIUS_MILES} mi of ${selectedCity.name}`
    : `${INCIDENT_DATE_LABEL}: ${stats.length} WA DNR fire records`;
}

// ── Community Reports section ──────────────────────────────────────────
// Also called by fire-report.js after each new submission to refresh the list.
function renderReportCards(container) {
  // When called with no argument (from fire-report.js), just refresh the
  // reports section in place without touching the historical records below.
  if (!container) {
    const existing = document.getElementById('fr-reports-section');
    if (existing) {
      const parent = existing.parentNode;
      const next = existing.nextSibling;
      existing.remove();
      const section = buildReportSection();
      parent.insertBefore(section, next);
    }
    return;
  }

  // Called with a container — prepend a fresh section before historical data
  const section = buildReportSection();
  container.insertBefore(section, container.firstChild);
}

function buildReportSection() {
  const reports = JSON.parse(localStorage.getItem('fireReports') || '[]');

  const section = document.createElement('div');
  section.id = 'fr-reports-section';

  // Section header
  const header = document.createElement('div');
  header.className = 'section-header';
  header.innerHTML = `
    <span class="section-label reported">🚨 Community Reports</span>
    <span class="section-count">${reports.length}</span>
  `;
  section.appendChild(header);

  if (reports.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty reports-empty';
    empty.innerHTML = `
      <div class="icon">📭</div>
      No reports yet — use the<br>"Report a Fire" button on the map
    `;
    section.appendChild(empty);
  } else {
    const SEV_RANK = { high: 0, medium: 1, low: 2 };

    // Get user location from fire-report.js if available
    const userLoc = typeof window.frUserLocation === 'function' ? window.frUserLocation() : null;

    const sorted = [...reports].sort((a, b) => {
      // Primary sort: proximity to user (closest first)
      if (userLoc) {
        const distA = Math.hypot(a.lat - userLoc.lat, a.lng - userLoc.lng);
        const distB = Math.hypot(b.lat - userLoc.lat, b.lng - userLoc.lng);
        if (Math.abs(distA - distB) > 0.001) return distA - distB;
      }
      // Secondary sort: severity (high → medium → low)
      return (SEV_RANK[a.severity] ?? 1) - (SEV_RANK[b.severity] ?? 1);
    });

    sorted.forEach(r => {
      const colors =
        r.severity === 'high'   ? { bg:'#FCEBEB', border:'#F09595', text:'#791F1F', dot:'#E24B4A' } :
        r.severity === 'medium' ? { bg:'#FAEEDA', border:'#F0C080', text:'#854F0B', dot:'#EF9F27' } :
                                  { bg:'#EAF3DE', border:'#97C459', text:'#3B6D11', dot:'#639922' };

      // Distance label if user location is known
      let distLabel = '';
      if (userLoc) {
        const km = Math.hypot(r.lat - userLoc.lat, r.lng - userLoc.lng) * 111;
        distLabel = km < 1
          ? `<span style="color:var(--text-muted);font-size:11px;">📏 ${Math.round(km * 1000)} m away</span><br>`
          : `<span style="color:var(--text-muted);font-size:11px;">📏 ${km.toFixed(1)} km away</span><br>`;
      }

      const card = document.createElement('div');
      card.className = 'card report-card';
      card.style.borderLeft = `3px solid ${colors.dot}`;
      card.innerHTML = `
        <div class="card-title">
          <span style="width:8px;height:8px;border-radius:50%;background:${colors.dot};flex-shrink:0;display:inline-block;"></span>
          ${r.locationName || 'Community Report'}
          <span class="badge" style="background:${colors.bg};color:${colors.text};border:1px solid ${colors.border};font-size:10px;padding:2px 7px;border-radius:20px;">${r.severity}</span>
        </div>
        <div class="card-detail">
          ${distLabel}
          ${r.type  ? `<strong>Type:</strong> ${r.type}<br>`   : ''}
          ${r.notes ? `<strong>Notes:</strong> ${r.notes}<br>` : ''}
          <span style="color:var(--text-muted);font-size:11px;">🕐 ${r.timestamp}</span>
        </div>
      `;
      card.addEventListener('click', () => {
        window.map.flyTo([r.lat, r.lng], 13, { duration: 0.8 });
      });
      section.appendChild(card);
    });
  }

  // Divider + historical label
  const divider = document.createElement('div');
  divider.className = 'section-divider';
  section.appendChild(divider);

  const histHeader = document.createElement('div');
  histHeader.className = 'section-header';
  histHeader.innerHTML = `<span class="section-label historical">📋 WA DNR 2024 Records</span>`;
  section.appendChild(histHeader);

  return section;
}

function renderPerimeters(perimeters) {
  perimeters.forEach(fire => {
    if (!fire.rings) return;

    const polygon = L.polygon(
      fire.rings.map(ring => ring.map(point => [point[1], point[0]])),
      { color: '#ff3333', fillColor: '#ff3333', fillOpacity: 0.3, weight: 1.5 }
    ).addTo(map);

    polygon.bindPopup(`
      <div class="popup-title">${fire.name}</div>
      <div class="popup-row"><strong>Layer:</strong> Mapped 2024 perimeter</div>
      <div class="popup-row"><strong>Size:</strong> ${formatAcres(fire.acres)}</div>
    `);
    fireMarkers.push(polygon);
  });
}

function renderFirePoints(stats) {
  stats.forEach(fire => {
    const isSelected = isSelectedFire(fire);
    const fireColor = isSelected ? '#ff9d2e' : '#ff3333';
    const haloOpacity = isSelected ? 0.30 : 0.18;
    const markerWeight = isSelected ? 4 : 2;

    const heatHalo = L.circle([fire.lat, fire.lon], {
      radius: getFireHaloRadius(fire.acres),
      color: fireColor,
      fillColor: fireColor,
      fillOpacity: haloOpacity,
      weight: isSelected ? 3 : 1.5,
    }).addTo(map);

    const marker = L.circleMarker([fire.lat, fire.lon], {
      color: fireColor,
      fillColor: fireColor,
      fillOpacity: isSelected ? 0.96 : 0.82,
      radius: getFireRadius(fire.acres) + (isSelected ? 3 : 0),
      weight: markerWeight,
    }).addTo(map);

    marker.bindPopup(`
      <div class="popup-title">${fire.name}</div>
      <div class="popup-row"><strong>County:</strong> ${fire.county || 'Unknown'}</div>
      <div class="popup-row"><strong>Acres:</strong> ${formatAcres(fire.acres)}</div>
      <div class="popup-row"><strong>Cause:</strong> ${fire.cause}</div>
      ${fire.discovered ? `<div class="popup-row"><strong>Discovered:</strong> ${fire.discovered}</div>` : ''}
      <div class="popup-row"><strong>Source:</strong> WA DNR Fire Statistics</div>
    `);
    heatHalo.on('click', () => selectFire(fire));
    marker.on('click', () => selectFire(fire));
    fireMarkers.push(heatHalo, marker);
  });
}

function renderFireCards(list, stats, perimeters) {
  const largestStats = [...stats]
    .sort((a, b) => b.acres - a.acres)
    .slice(0, 120);

  const summary = document.createElement('div');
  summary.className = 'empty';
  summary.style.cssText = 'padding:14px 12px;text-align:left';
  summary.innerHTML = `
    <strong>${stats.length.toLocaleString()}</strong> WA DNR 2024 fire records are mapped statewide.<br>
    <strong>${perimeters.length}</strong> mapped perimeter areas are shown in red.<br>
    The list below shows the largest fire records.
  `;
  list.appendChild(summary);

  largestStats.forEach(fire => {
    const isSelected = isSelectedFire(fire);
    const card = document.createElement('div');
    card.className = `card fire${isSelected ? ' selected-fire' : ''}`;
    card.innerHTML = `
      <div class="card-title">
        ${fire.name}
        <span class="badge fire">${formatAcres(fire.acres)}</span>
      </div>
      <div class="card-detail">
        ${fire.county     ? `<strong>County:</strong> ${fire.county}<br>`         : ''}
        ${fire.discovered ? `<strong>Discovered:</strong> ${fire.discovered}<br>` : ''}
        <strong>Cause:</strong> ${fire.cause}<br>
        <strong>Source:</strong> WA DNR Fire Statistics
      </div>`;
    card.addEventListener('click', () => selectFire(fire));
    list.appendChild(card);
  });
}

function selectFire(fire) {
  loadResourcesForFire(fire);
  renderFires();
  map.flyTo([fire.lat, fire.lon], 10, { duration: 0.8 });
  switchToResourcesTab();
}

function switchToResourcesTab() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === 'resources');
  });
  document.querySelectorAll('.panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === 'panel-resources');
  });
}

function isSelectedFire(fire) {
  if (!selectedFire || !fire) return false;
  if (selectedFire.id && fire.id) return selectedFire.id === fire.id;

  return selectedFire.name === fire.name &&
    selectedFire.lat === fire.lat &&
    selectedFire.lon === fire.lon;
}

function formatAcres(acres) {
  if (!Number.isFinite(acres) || acres <= 0) return 'Unknown acres';
  return `${Math.round(acres).toLocaleString()} acres`;
}

function getFireRadius(acres) {
  if (!Number.isFinite(acres) || acres <= 1) return 5;
  if (acres < 10) return 6;
  if (acres < 100) return 7;
  if (acres < 1000) return 8;
  if (acres < 10000) return 10;
  return 12;
}

function getFireHaloRadius(acres) {
  if (!Number.isFinite(acres) || acres <= 1) return 9000;
  if (acres < 10) return 13000;
  if (acres < 100) return 18000;
  if (acres < 1000) return 24000;
  if (acres < 10000) return 33000;
  return 46000;
}
