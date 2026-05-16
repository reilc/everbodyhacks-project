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
    } else if (tab.dataset.tab === 'fires') {
      if (typeof smokeLayersGroup !== 'undefined') map.removeLayer(smokeLayersGroup);
      if (typeof fireMarkers !== 'undefined') fireMarkers.forEach(m => map.addLayer(m));
    } else {
      // Shelters tab view configuration
      if (typeof smokeLayersGroup !== 'undefined') map.removeLayer(smokeLayersGroup);
      if (typeof fireMarkers !== 'undefined') fireMarkers.forEach(m => map.addLayer(m));
    }
  });
});


const searchInput = document.getElementById('search-input');

searchInput.addEventListener('input', e => {
  searchQuery = e.target.value.trim();

  const stillSelectedCity =
    selectedCity && selectedCity.name.toLowerCase() === searchQuery.toLowerCase();

  if (!stillSelectedCity) {
    selectedCity = null;
    allShelters = [];
    shelterMarkers.forEach(marker => map.removeLayer(marker));
    shelterMarkers = [];

    if (selectedCityMarker) {
      map.removeLayer(selectedCityMarker);
      selectedCityMarker = null;
    }
  }

  renderShelters();
});

searchInput.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;

  const city = matchingCities()[0];
  if (city) selectCity(city);
});

renderShelters();
loadWildfires();
