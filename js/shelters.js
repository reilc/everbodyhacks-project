// shelters.js
// City-first search. Shelter/resource pins only appear after a city is selected.

function distanceMiles(from, to) {
  const toRad = degrees => degrees * Math.PI / 180;
  const earthMiles = 3958.8;
  const dLat = toRad(to.lat - from.lat);
  const dLon = toRad(to.lon - from.lon);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return earthMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function setShelterStatus(kind, message) {
  const dot = document.getElementById('shelter-dot');
  const status = document.getElementById('shelter-status');

  dot.className = `status-dot ${kind}`;
  status.textContent = message;
}

function selectCity(city) {
  selectedCity = city;
  searchQuery = city.name;
  document.getElementById('search-input').value = city.name;

  if (selectedCityMarker) {
    map.removeLayer(selectedCityMarker);
    selectedCityMarker = null;
  }

  selectedCityMarker = L.circleMarker([city.lat, city.lon], {
    color: '#2f80ed',
    fillColor: '#2f80ed',
    fillOpacity: 0.95,
    radius: 9,
    weight: 3,
  }).addTo(map);

  selectedCityMarker.bindPopup(`
    <div class="popup-title">${city.name}</div>
    <div class="popup-row">${city.region}</div>
  `);

  map.flyTo([city.lat, city.lon], 9, { duration: 0.6 });
  loadSheltersForCity(city);
}

async function loadSheltersForCity(city) {
  allShelters = [];
  renderShelters();
  setShelterStatus('loading', `Searching confirmed mapped shelter/resource places near ${city.name}...`);

  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="shelter"](around:${SHELTER_SEARCH_RADIUS_METERS},${city.lat},${city.lon});
      way["amenity"="shelter"](around:${SHELTER_SEARCH_RADIUS_METERS},${city.lat},${city.lon});
      relation["amenity"="shelter"](around:${SHELTER_SEARCH_RADIUS_METERS},${city.lat},${city.lon});
      node["emergency"="assembly_point"](around:${SHELTER_SEARCH_RADIUS_METERS},${city.lat},${city.lon});
      way["emergency"="assembly_point"](around:${SHELTER_SEARCH_RADIUS_METERS},${city.lat},${city.lon});
      relation["emergency"="assembly_point"](around:${SHELTER_SEARCH_RADIUS_METERS},${city.lat},${city.lon});
    );
    out center tags;
  `;

  try {
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: new URLSearchParams({ data: query }),
    });
    if (!res.ok) throw new Error(`Overpass returned ${res.status}`);

    const data = await res.json();
    const seen = new Set();

    allShelters = (data.elements || [])
      .map(element => overpassElementToShelter(element, city))
      .filter(Boolean)
      .filter(place => {
        const key = `${place.name}|${place.lat.toFixed(5)}|${place.lon.toFixed(5)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 25);

    setShelterStatus('ok', `${allShelters.length} confirmed mapped shelter/resource places near ${city.name}`);
  } catch (err) {
    console.error('Shelter search error:', err);
    setShelterStatus('err', 'Could not load shelter/resource places right now');
  }

  renderShelters();
}

function overpassElementToShelter(element, city) {
  const tags = element.tags || {};
  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;
  const name = tags.name || tags.operator;
  const labelText = `${tags.name || ''} ${tags.operator || ''} ${tags.description || ''}`;

  const hasReliableName = Boolean(name);
  const isShelterOrAssembly =
    tags.amenity === 'shelter' ||
    tags.emergency === 'assembly_point' ||
    /shelter|evacuation|emergency/i.test(labelText);

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !hasReliableName || !isShelterOrAssembly) {
    return null;
  }

  const place = {
    name,
    type: tags.emergency === 'assembly_point' ? 'assembly point' : 'shelter',
    address: formatAddress(tags),
    operator: tags.operator || '',
    lat,
    lon,
  };

  place.distance = distanceMiles(city, place);
  return place;
}

function formatAddress(tags) {
  return [
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:city'],
    tags['addr:state'],
  ].filter(Boolean).join(' ');
}

function renderShelters() {
  const list = document.getElementById('shelter-list');

  shelterMarkers.forEach(marker => map.removeLayer(marker));
  shelterMarkers = [];

  if (!searchQuery) {
    setShelterStatus('ok', 'Type a Washington city to find nearby resources');
    list.innerHTML = '<div class="empty"><div class="icon">Search</div>Type a Washington city to find nearby shelter/resource places.</div>';
    return;
  }

  const exactCitySelected =
    selectedCity && selectedCity.name.toLowerCase() === searchQuery.toLowerCase();

  if (!exactCitySelected) {
    renderCityMatches(list);
    return;
  }

  if (!allShelters.length) {
    list.innerHTML = `<div class="empty"><div class="icon">Shelters</div>No confirmed mapped shelter/resource places found near ${selectedCity.name} yet.</div>`;
    return;
  }

  list.innerHTML = '';
  allShelters.forEach(shelter => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-title">
        ${shelter.name}
        <span class="badge open">${shelter.type}</span>
      </div>
      <div class="card-detail">
        <strong>Distance:</strong> ${shelter.distance.toFixed(1)} mi<br>
        ${shelter.address ? `<strong>Address:</strong> ${shelter.address}<br>` : ''}
        ${shelter.operator ? `<strong>Operator:</strong> ${shelter.operator}` : ''}
      </div>`;

    card.addEventListener('click', () => map.flyTo([shelter.lat, shelter.lon], 14, { duration: 0.8 }));
    list.appendChild(card);

    const marker = L.circleMarker([shelter.lat, shelter.lon], {
      color: '#4caf72',
      fillColor: '#4caf72',
      fillOpacity: 0.9,
      radius: 7,
      weight: 2,
    }).addTo(map);

    marker.bindPopup(`
      <div class="popup-title">${shelter.name}</div>
      <div class="popup-row"><strong>Type:</strong> ${shelter.type}</div>
      <div class="popup-row"><strong>Distance:</strong> ${shelter.distance.toFixed(1)} mi</div>
      ${shelter.address ? `<div class="popup-row"><strong>Address:</strong> ${shelter.address}</div>` : ''}
    `);

    shelterMarkers.push(marker);
  });
}

function renderCityMatches(list) {
  const cities = matchingCities().slice(0, 12);

  if (!cities.length) {
    setShelterStatus('ok', 'No Washington cities match that search');
    list.innerHTML = '<div class="empty"><div class="icon">Search</div>No city matches. Try Seattle, Wenatchee, Yakima, Omak, or Spokane.</div>';
    return;
  }

  setShelterStatus('ok', `${cities.length} matching Washington cities`);
  list.innerHTML = '';

  cities.forEach(city => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-title">${city.name}</div>
      <div class="card-detail">${city.region}</div>`;
    card.addEventListener('click', () => selectCity(city));
    list.appendChild(card);
  });
}
