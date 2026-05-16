// wildfires.js
// Loads real 2024 wildfire perimeter polygons for Washington and renders them in red.

async function loadWildfires() {
  const dot = document.getElementById('fire-dot');
  const status = document.getElementById('fire-status');

  dot.className = 'status-dot loading';
  status.textContent = 'Loading real 2024 WA wildfire perimeters...';

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

  try {
    const res = await fetch(`${FIRE_PERIMETER_2024_URL}?${params}`);
    if (!res.ok) throw new Error(`Wildfire API returned ${res.status}`);

    const data = await res.json();
    if (data.error) throw new Error(data.error.message || 'Wildfire API error');

    allFires = (data.features || [])
      .map(featureToFire)
      .filter(Boolean)
      .sort((a, b) => b.acres - a.acres);

    dot.className = 'status-dot ok';
    status.textContent = `${allFires.length} real 2024 wildfire perimeter areas in Washington`;
  } catch (err) {
    console.error('2024 wildfire perimeter error:', err);
    dot.className = 'status-dot err';
    status.textContent = 'Failed to load 2024 wildfire perimeter data';
    allFires = [];
  }

  renderFires();
}

function featureToFire(feature) {
  const geometry = feature.geometry;
  const center = getGeometryCenter(geometry);
  if (!center) return null;

  const attributes = feature.attributes || {};

  return {
    name: attributes.INCIDENT || attributes.FIRE_NAME || attributes.FIRENAME || 'Unnamed Fire',
    year: attributes.FIRE_YEAR || 2024,
    county: attributes.COUNTY || attributes.COUNTY_LABEL || '',
    acres: Number(attributes.GIS_ACRES || attributes.ACRES || attributes.Shape__Area || 0),
    cause: attributes.FIRE_TYPE || attributes.CAUSE || '2024 fire perimeter',
    lat: center.lat,
    lon: center.lon,
    rings: geometry?.rings || null,
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

function renderFires() {
  const list = document.getElementById('fire-list');

  fireMarkers.forEach(marker => map.removeLayer(marker));
  fireMarkers = [];

  const filtered = allFires.filter(fire =>
    fireYearFilter === 'all' || String(fire.year) === fireYearFilter
  );

  if (!filtered.length) {
    list.innerHTML = '<div class="empty"><div class="icon">Fire</div>No 2024 wildfire perimeter areas loaded.</div>';
    return;
  }

  list.innerHTML = '';

  filtered.forEach(fire => {
    const acres = fire.acres ? `${Math.round(fire.acres).toLocaleString()} acres` : '';
    const card = document.createElement('div');
    card.className = 'card fire';
    card.innerHTML = `
      <div class="card-title">
        ${fire.name}
        <span class="badge fire">${fire.year}</span>
      </div>
      <div class="card-detail">
        ${fire.county ? `<strong>County:</strong> ${fire.county}<br>` : ''}
        ${acres ? `<strong>Size:</strong> ${acres}<br>` : ''}
        <strong>Layer:</strong> 2024 perimeter
      </div>`;

    card.addEventListener('click', () => map.flyTo([fire.lat, fire.lon], 10, { duration: 0.8 }));
    list.appendChild(card);

    if (fire.rings) {
      const polygon = L.polygon(
        fire.rings.map(ring => ring.map(point => [point[1], point[0]])),
        {
          color: '#ff3333',
          fillColor: '#ff3333',
          fillOpacity: 0.35,
          weight: 2,
        }
      ).addTo(map);

      polygon.bindPopup(`
        <div class="popup-title">${fire.name}</div>
        <div class="popup-row"><strong>Year:</strong> ${fire.year}</div>
        ${acres ? `<div class="popup-row"><strong>Size:</strong> ${acres}</div>` : ''}
      `);
      fireMarkers.push(polygon);
    }
  });
}
