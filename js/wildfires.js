// wildfires.js
// Loads WA DNR 2024 fire-statistic points statewide plus mapped 2024 fire perimeters.

async function loadWildfires() {
  const dot = document.getElementById('fire-dot');
  const status = document.getElementById('fire-status');

  dot.className = 'status-dot loading';
  status.textContent = 'Loading WA DNR 2024 wildfire records...';

  try {
    const [stats, perimeters] = await Promise.all([
      loadDnrFireStats(),
      loadFirePerimeters(),
    ]);

    allFires = { stats, perimeters };

    dot.className = 'status-dot ok';
    status.textContent = `${stats.length.toLocaleString()} WA DNR 2024 fire records + ${perimeters.length} mapped perimeters`;
  } catch (err) {
    console.error('2024 wildfire data error:', err);
    dot.className = 'status-dot err';
    status.textContent = 'Failed to load 2024 wildfire data';
    allFires = { stats: [], perimeters: [] };
  }

  renderFires();
}

async function loadDnrFireStats() {
  const params = new URLSearchParams({
    where: "DSCVR_DT >= DATE '2024-01-01' AND DSCVR_DT < DATE '2025-01-01'",
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

  const stats = Array.isArray(allFires.stats) ? allFires.stats : [];
  const perimeters = Array.isArray(allFires.perimeters) ? allFires.perimeters : [];

  if (!stats.length && !perimeters.length) {
    list.innerHTML = '<div class="empty"><div class="icon">Fire</div>No 2024 wildfire records loaded.</div>';
    return;
  }

  renderPerimeters(perimeters);
  renderFirePoints(stats);
  renderFireCards(list, stats, perimeters);

  if (typeof renderSmoke === 'function') {
    renderSmoke();
  }
}

function renderPerimeters(perimeters) {
  perimeters.forEach(fire => {
    if (!fire.rings) return;

    const polygon = L.polygon(
      fire.rings.map(ring => ring.map(point => [point[1], point[0]])),
      {
        color: '#ff3333',
        fillColor: '#ff3333',
        fillOpacity: 0.3,
        weight: 1.5,
      }
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
    const marker = L.circleMarker([fire.lat, fire.lon], {
      color: '#ff9d42',
      fillColor: '#ff9d42',
      fillOpacity: 0.65,
      radius: getFireRadius(fire.acres),
      weight: 1,
    }).addTo(map);

    marker.bindPopup(`
      <div class="popup-title">${fire.name}</div>
      <div class="popup-row"><strong>County:</strong> ${fire.county || 'Unknown'}</div>
      <div class="popup-row"><strong>Acres:</strong> ${formatAcres(fire.acres)}</div>
      <div class="popup-row"><strong>Cause:</strong> ${fire.cause}</div>
      ${fire.discovered ? `<div class="popup-row"><strong>Discovered:</strong> ${fire.discovered}</div>` : ''}
      <div class="popup-row"><strong>Source:</strong> WA DNR Fire Statistics</div>
    `);

    fireMarkers.push(marker);
  });
}

function renderFireCards(list, stats, perimeters) {
  const largestStats = [...stats]
    .sort((a, b) => b.acres - a.acres)
    .slice(0, 120);

  list.innerHTML = `
    <div class="empty" style="padding:14px 12px;text-align:left">
      <strong>${stats.length.toLocaleString()}</strong> WA DNR 2024 fire records are mapped statewide.<br>
      <strong>${perimeters.length}</strong> mapped perimeter areas are shown in red.<br>
      The list below shows the largest fire records.
    </div>`;

  largestStats.forEach(fire => {
    const card = document.createElement('div');
    card.className = 'card fire';
    card.innerHTML = `
      <div class="card-title">
        ${fire.name}
        <span class="badge fire">${formatAcres(fire.acres)}</span>
      </div>
      <div class="card-detail">
        ${fire.county ? `<strong>County:</strong> ${fire.county}<br>` : ''}
        ${fire.discovered ? `<strong>Discovered:</strong> ${fire.discovered}<br>` : ''}
        <strong>Cause:</strong> ${fire.cause}<br>
        <strong>Source:</strong> WA DNR Fire Statistics
      </div>`;

    card.addEventListener('click', () => map.flyTo([fire.lat, fire.lon], 11, { duration: 0.8 }));
    list.appendChild(card);
  });
}

function formatAcres(acres) {
  if (!Number.isFinite(acres) || acres <= 0) return 'Unknown acres';
  return `${Math.round(acres).toLocaleString()} acres`;
}

function getFireRadius(acres) {
  if (!Number.isFinite(acres) || acres <= 1) return 3;
  if (acres < 10) return 4;
  if (acres < 100) return 5;
  if (acres < 1000) return 6;
  if (acres < 10000) return 8;
  return 10;
}
