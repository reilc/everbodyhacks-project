// ui.js
// User interactions: tabs, city search, and app boot.

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`panel-${tab.dataset.tab}`).classList.add('active');
    if (tab.dataset.tab === 'smoke') {
      if (typeof smokeLayersGroup !== 'undefined') map.addLayer(smokeLayersGroup);
      if (typeof fireMarkers !== 'undefined') fireMarkers.forEach(m => map.removeLayer(m));
      if (typeof shelterMarkers !== 'undefined') shelterMarkers.forEach(m => map.removeLayer(m));
      if (typeof selectedCityMarker !== 'undefined' && selectedCityMarker) map.removeLayer(selectedCityMarker);
      if (typeof showMapLegend === 'function') showMapLegend();
      if (typeof updateMapLegendContent === 'function') updateMapLegendContent();
    } else if (tab.dataset.tab === 'fires') {
      if (typeof smokeLayersGroup !== 'undefined') map.removeLayer(smokeLayersGroup);
      if (typeof fireMarkers !== 'undefined') fireMarkers.forEach(m => map.addLayer(m));
      if (typeof showMapLegend === 'function') showMapLegend();
      if (typeof updateMapLegendContent === 'function') updateMapLegendContent();
    } else {
      // Resources tab
      if (typeof smokeLayersGroup !== 'undefined') map.removeLayer(smokeLayersGroup);
      if (typeof fireMarkers !== 'undefined') fireMarkers.forEach(m => map.addLayer(m));
      if (typeof showMapLegend === 'function') showMapLegend();
      if (typeof updateMapLegendContent === 'function') updateMapLegendContent();
      renderShelters();
    }
  });
});

function isSmokeTabActive() {
  return document.querySelector('.tab.active')?.dataset.tab === 'smoke';
}

function hideNonSmokeMapLayers() {
  if (typeof fireMarkers !== 'undefined') fireMarkers.forEach(marker => map.removeLayer(marker));
  if (typeof shelterMarkers !== 'undefined') shelterMarkers.forEach(marker => map.removeLayer(marker));
  if (typeof selectedCityMarker !== 'undefined' && selectedCityMarker) map.removeLayer(selectedCityMarker);
}

// ── Search input ───────────────────────────────────────────────────────
const searchInput = document.getElementById('search-input');

searchInput.addEventListener('input', e => {
  searchQuery = e.target.value.trim();
  const stillSelectedCity =
    selectedCity && selectedCity.name.toLowerCase() === searchQuery.toLowerCase();
  if (!stillSelectedCity) {
    selectedCity = null;
    selectedFire = null;
    allShelters = [];
    shelterMarkers.forEach(marker => map.removeLayer(marker));
    shelterMarkers = [];
    if (selectedCityMarker) {
      map.removeLayer(selectedCityMarker);
      selectedCityMarker = null;
    }
  }
  renderShelters();
  renderFires();
  if (isSmokeTabActive()) hideNonSmokeMapLayers();
});

searchInput.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const city = matchingCities()[0];
  if (city) selectCity(city);
});

// ── Auto-load resources from user's GPS location on boot ───────────────
// Reverse geocode the user's coordinates to get a place name, then
// call loadResourcesForCity so the Resources tab fills in automatically.
async function loadResourcesFromGPS() {
  if (!navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition(
    async pos => {
      const { latitude: lat, longitude: lng } = pos.coords;

      // Reverse geocode to get a readable place name
      let placeName = 'Your Location';
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        const a = data.address || {};
        const city = a.city || a.town || a.village || a.suburb || a.county || '';
        const state = a.state_abbreviation || (a.state ? a.state.slice(0, 2).toUpperCase() : '');
        if (city) placeName = state ? `${city}, ${state}` : city;
      } catch {
        // Silently fall back to generic name
      }

      // Build a city-like object matching what selectCity/loadResourcesForCity expects
      const userCity = {
        name: placeName,
        lat,
        lon: lng,
        region: 'Based on your current location',
      };

      // Only auto-load if the user hasn't already typed a search
      if (!searchQuery && !selectedCity && !selectedFire) {
        selectedCity = userCity;
        searchQuery = placeName;
        document.getElementById('search-input').value = placeName;
        setShelterStatus('loading', `Finding resources near ${placeName}…`);
        loadResourcesForCity(userCity);
        map.flyTo([lat, lng], 10, { duration: 1 });
      }
    },
    () => {
      // Permission denied or unavailable — leave the default empty search state
      console.info('ui.js: geolocation denied, skipping auto-load');
    }
  );
}

// ── Boot ───────────────────────────────────────────────────────────────
renderShelters();
if (typeof showMapLegend === 'function') showMapLegend();
loadWildfires();
loadResourcesFromGPS();