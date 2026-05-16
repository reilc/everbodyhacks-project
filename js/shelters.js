// ── shelters.js ────────────────────────────────────────────
// Fetches live FEMA shelter data for Washington state and renders
// cards in the sidebar + green circle markers on the map.

async function loadShelters() {
  const dot    = document.getElementById('shelter-dot');
  const status = document.getElementById('shelter-status');

  try {
    const params = new URLSearchParams({
      where: "state = 'WA'",
      outFields: 'SHELTER_NAME,address_1,city,state,zip,shelter_status,evacuation_capacity',
      returnGeometry: 'true',
      outSR: '4326',
      f: 'json',
      resultRecordCount: '500',
    });

    const res  = await fetch(`${FEMA_URL}?${params}`);
    const data = await res.json();

    allShelters = (data.features || [])
      .filter(f => f.geometry)
      .map(f => ({
        name:     f.attributes.SHELTER_NAME || 'Unnamed Shelter',
        address:  [f.attributes.address_1, f.attributes.city, f.attributes.zip].filter(Boolean).join(', '),
        status:   f.attributes.shelter_status || 'Unknown',
        capacity: f.attributes.evacuation_capacity,
        lat:      f.geometry.y,
        lon:      f.geometry.x,
        mock:     false,
      }));

    // FEMA only has data during active declared disasters —
    // fall back to known WA venues so the map is never empty.
    if (allShelters.length === 0) {
      allShelters = FALLBACK_SHELTERS;
      dot.className    = 'status-dot ok';
      status.textContent = 'No active FEMA shelters — showing known WA sites';
    } else {
      dot.className    = 'status-dot ok';
      status.textContent = `${allShelters.length} live FEMA shelters (WA state)`;
    }
  } catch (err) {
    console.error('FEMA error:', err);
    allShelters        = FALLBACK_SHELTERS;
    dot.className      = 'status-dot ok';
    status.textContent = 'FEMA unavailable — showing known WA sites';
  }

  renderShelters();
}

function renderShelters() {
  const list = document.getElementById('shelter-list');

  // Remove old markers from map
  shelterMarkers.forEach(m => map.removeLayer(m));
  shelterMarkers = [];

  const q = searchQuery.toLowerCase();
  const filtered = allShelters.filter(s => {
    const matchStatus = shelterFilter === 'all' || s.status === shelterFilter;
    const matchSearch = !q || s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  if (!filtered.length) {
    list.innerHTML = '<div class="empty"><div class="icon">🏕</div>No shelters match filters.</div>';
    return;
  }

  list.innerHTML = '';
  filtered.forEach(s => {
    // ── Sidebar card ──
    const card    = document.createElement('div');
    card.className = 'card';
    const mockTag  = s.mock
      ? '<span class="badge" style="background:rgba(255,184,48,0.2);color:#ffb830">sample</span>'
      : '';

    card.innerHTML = `
      <div class="card-title">
        🏕 ${s.name}
        <span class="badge open">${s.status || 'Unknown'}</span>
        ${mockTag}
      </div>
      <div class="card-detail">
        <strong>Address:</strong> ${s.address || 'N/A'}<br>
        ${s.capacity ? `<strong>Capacity:</strong> ${s.capacity}` : ''}
      </div>`;

    // Clicking a card flies the map to that shelter
    card.addEventListener('click', () => map.flyTo([s.lat, s.lon], 14, { duration: 0.8 }));
    list.appendChild(card);

    // ── Map marker ──
    const marker = L.circleMarker([s.lat, s.lon], {
      color: '#4caf72', fillColor: '#4caf72', fillOpacity: 0.85,
      radius: 8, weight: 2,
    }).addTo(map);

    marker.bindPopup(`
      <div class="popup-title">🏕 ${s.name}</div>
      <div class="popup-row"><strong>Status:</strong> ${s.status || 'Unknown'}</div>
      <div class="popup-row"><strong>Address:</strong> ${s.address || 'N/A'}</div>
      ${s.capacity ? `<div class="popup-row"><strong>Capacity:</strong> ${s.capacity}</div>` : ''}
    `);

    shelterMarkers.push(marker);
  });
}