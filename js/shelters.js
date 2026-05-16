// shelters.js
// City-first search against confirmed 2024 Washington wildfire shelter/resource records.

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

function loadSheltersForCity(city) {
  allShelters = HISTORICAL_2024_SHELTERS
    .map(shelter => ({
      ...shelter,
      distance: distanceMiles(city, shelter),
    }))
    .filter(shelter => shelter.distance <= SHELTER_SEARCH_RADIUS_MILES)
    .sort((a, b) => a.distance - b.distance);

  setShelterStatus('ok', `${allShelters.length} confirmed 2024 wildfire shelters/resources near ${city.name}`);
  renderShelters();
}

function renderShelters() {
  const list = document.getElementById('shelter-list');

  shelterMarkers.forEach(marker => map.removeLayer(marker));
  shelterMarkers = [];

  if (!searchQuery) {
    setShelterStatus('ok', `${HISTORICAL_2024_SHELTERS.length} confirmed 2024 wildfire shelters/resources loaded`);
    list.innerHTML = '<div class="empty"><div class="icon">Search</div>Type a Washington city to find confirmed 2024 wildfire shelters and support resources.</div>';
    return;
  }

  const exactCitySelected =
    selectedCity && selectedCity.name.toLowerCase() === searchQuery.toLowerCase();

  if (!exactCitySelected) {
    renderCityMatches(list);
    return;
  }

  if (!allShelters.length) {
    list.innerHTML = `<div class="empty"><div class="icon">Shelters</div>No confirmed 2024 wildfire shelter/resource records found within ${SHELTER_SEARCH_RADIUS_MILES} miles of ${selectedCity.name}.</div>`;
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
        <strong>Fire:</strong> ${shelter.fire}<br>
        <strong>Distance:</strong> ${shelter.distance.toFixed(1)} mi<br>
        <strong>2024 status:</strong> ${shelter.opened}<br>
        <strong>Address:</strong> ${shelter.address}<br>
        <strong>Source:</strong> <a href="${shelter.sourceUrl}" target="_blank" rel="noopener noreferrer">${shelter.sourceName}</a>
      </div>`;

    card.addEventListener('click', () => map.flyTo([shelter.lat, shelter.lon], 13, { duration: 0.8 }));
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
      <div class="popup-row"><strong>Fire:</strong> ${shelter.fire}</div>
      <div class="popup-row"><strong>Type:</strong> ${shelter.type}</div>
      <div class="popup-row"><strong>Distance:</strong> ${shelter.distance.toFixed(1)} mi</div>
      <div class="popup-row"><strong>Address:</strong> ${shelter.address}</div>
    `);

    shelterMarkers.push(marker);
  });
}

function renderCityMatches(list) {
  const cities = matchingCities().slice(0, 12);

  if (!cities.length) {
    setShelterStatus('ok', 'No Washington cities match that search');
    list.innerHTML = '<div class="empty"><div class="icon">Search</div>No city matches. Try Chelan, Naches, Omak, Republic, White Salmon, or Cheney.</div>';
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
