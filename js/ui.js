// ui.js
// User interactions: tabs, wildfire year filters, city search, and app boot.

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`panel-${tab.dataset.tab}`).classList.add('active');
  });
});

document.querySelectorAll('[data-year]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-year]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    fireYearFilter = btn.dataset.year;
    renderFires();
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
