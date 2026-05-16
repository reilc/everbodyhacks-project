// shelters.js
// City-first search against confirmed 2024 Washington food, shelter, and wildfire resource records.

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
  const dot = document.getElementById('resource-dot');
  const status = document.getElementById('resource-status');

  dot.className = `status-dot ${kind}`;
  status.textContent = message;
}

function clearShelterMarkers() {
  shelterMarkers.forEach(marker => map.removeLayer(marker));
  shelterMarkers = [];
}

function selectCity(city) {
  selectedCity = city;
  selectedFire = null;
  searchQuery = city.name;
  document.getElementById('search-input').value = city.name;
  clearShelterMarkers();

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
  loadResourcesForCity(city);
  renderFires();
}

function loadResourcesForCity(city) {
  const wildfireResources = HISTORICAL_2024_SHELTERS
    .filter(shelter => wasActiveOnSimulationDate(shelter))
    .filter(hasFullAddress)
    .map(shelter => ({
      ...shelter,
      dataset: 'Verified wildfire response',
      distance: distanceMiles(city, shelter),
    }));

  const communityResources = COMMUNITY_RESOURCE_SITES
    .filter(hasFullAddress)
    .map(resource => ({
      ...resource,
      fire: 'Food / basic needs resource',
      opened: 'Included for the July 4, 2024 simulation from documented 2024 food/resource service activity. Confirm real-time hours, shelter beds, and eligibility with the provider or WA 211 before traveling.',
      activeStart: resource.activeStart || '2024-07-01',
      activeEnd: resource.activeEnd || '2024-09-30',
      dataset: 'Confirmed July 2024 food/resource provider',
      distance: distanceMiles(city, resource),
    }));

  const nearby = [...wildfireResources, ...communityResources]
    .filter(resource => resource.distance <= SHELTER_SEARCH_RADIUS_MILES)
    .sort((a, b) => scoreResource(a) - scoreResource(b));

  allShelters = nearby.length >= 5
    ? nearby.slice(0, 12)
    : [...nearby, ...communityResources
        .filter(resource => !nearby.some(existing => existing.name === resource.name))
        .sort((a, b) => a.distance - b.distance)]
        .slice(0, 12);

  setShelterStatus('ok', `Showing ${allShelters.length} nearest July 4 resources for ${city.name}`);
  renderShelters();
}

function loadResourcesForFire(fire) {
  selectedFire = fire;
  selectedCity = null;
  searchQuery = fire.name || '';
  document.getElementById('search-input').value = fire.name || '';
  clearShelterMarkers();

  if (selectedCityMarker) {
    map.removeLayer(selectedCityMarker);
    selectedCityMarker = null;
  }

  const wildfireResources = HISTORICAL_2024_SHELTERS
    .filter(resource => wasActiveOnSimulationDate(resource))
    .filter(hasFullAddress)
    .map(resource => ({
      ...resource,
      dataset: 'Verified wildfire response',
      distance: distanceMiles(fire, resource),
    }));

  const communityResources = COMMUNITY_RESOURCE_SITES
    .filter(hasFullAddress)
    .map(resource => ({
      ...resource,
      fire: fire.name,
      opened: 'Included for the July 4, 2024 simulation from documented 2024 food/resource service activity near this fire area. Confirm real-time hours, shelter beds, and eligibility with the provider or WA 211 before traveling.',
      activeStart: resource.activeStart || '2024-07-01',
      activeEnd: resource.activeEnd || '2024-09-30',
      dataset: 'Confirmed July 2024 food/resource provider',
      distance: distanceMiles(fire, resource),
    }));

  const nearby = [...wildfireResources, ...communityResources]
    .filter(resource => resource.distance <= INCIDENT_RESOURCE_RADIUS_MILES)
    .sort((a, b) => scoreResource(a) - scoreResource(b));

  allShelters = nearby.length >= 5
    ? nearby.slice(0, 10)
    : [...nearby, ...communityResources
        .filter(resource => !nearby.some(existing => existing.name === resource.name))
        .sort((a, b) => a.distance - b.distance)]
        .slice(0, 10);

  setShelterStatus('ok', `Showing ${allShelters.length} nearest July 4 resources for ${fire.name || 'selected fire'}`);
  renderShelters();
}

function scoreResource(resource) {
  const datasetBoost = resource.dataset === 'Verified wildfire response' ? -1000 : 0;
  return datasetBoost + resource.distance;
}

function wasActiveOnSimulationDate(shelter) {
  return SIMULATION_FIRE_DATE >= shelter.activeStart && SIMULATION_FIRE_DATE <= shelter.activeEnd;
}

function hasFullAddress(resource) {
  return /^\d+\s+/.test(resource.address || '');
}

function renderShelters() {
  const list = document.getElementById('resource-list');

  clearShelterMarkers();

  if (selectedFire) {
    renderResourceCards(list);
    return;
  }

  if (!searchQuery) {
    const activeCount = [
      ...HISTORICAL_2024_SHELTERS,
      ...COMMUNITY_RESOURCE_SITES,
    ].filter(wasActiveOnSimulationDate).filter(hasFullAddress).length;
    setShelterStatus('ok', `${activeCount} resources included for the ${SIMULATION_FIRE_DATE_LABEL} simulation`);
    list.innerHTML = `<div class="empty"><div class="icon">Search</div>Type a Washington city to find confirmed food banks, resource centers, and documented wildfire shelters for the ${SIMULATION_FIRE_DATE_LABEL} simulation.</div>`;
    return;
  }

  const exactCitySelected =
    selectedCity && selectedCity.name.toLowerCase() === searchQuery.toLowerCase();

  if (!exactCitySelected) {
    renderCityMatches(list);
    return;
  }

  if (!allShelters.length) {
    list.innerHTML = `<div class="empty"><div class="icon">Resources</div>No confirmed food/shelter resources for the ${SIMULATION_FIRE_DATE_LABEL} simulation found within ${SHELTER_SEARCH_RADIUS_MILES} miles of ${selectedCity.name}.</div>`;
    return;
  }

  renderResourceCards(list);
}

function renderResourceCards(list) {
  if (!allShelters.length) {
    list.innerHTML = '<div class="empty"><div class="icon">Resources</div>No nearby resources found.</div>';
    return;
  }

    list.innerHTML = selectedFire
    ? `<div class="empty" style="padding:14px 12px;text-align:left">
        Showing <strong>${allShelters.length}</strong> nearest food/shelter resources for ${selectedFire.name || 'selected fire'}<br>
        Documented wildfire shelters appear first when active on July 4. Food banks and resource centers use 2024 service evidence; verify real-time availability with WA 211.
      </div>`
    : selectedCity
      ? `<div class="empty" style="padding:14px 12px;text-align:left">
          Showing <strong>${allShelters.length}</strong> nearest food/shelter resources for ${selectedCity.name}<br>
          These are confirmed 2024 providers, not a promise of open beds. Call ahead or use WA 211 for real-time availability.
        </div>`
    : '';

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
        <strong>Address:</strong> ${shelter.address}
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
