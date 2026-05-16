// ── ui.js ──────────────────────────────────────────────────
// Handles all user interactions: tab switching, filter buttons,
// search input. Also boots the app by calling the data loaders.

// ── Tab switching ──
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`panel-${tab.dataset.tab}`).classList.add('active');
  });
});

// ── Shelter status filters (All / Open / Closed) ──
document.querySelectorAll('[data-filter]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    shelterFilter = btn.dataset.filter;
    renderShelters();
  });
});

// ── Wildfire year filters ──
document.querySelectorAll('[data-year]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-year]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    fireYearFilter = btn.dataset.year;
    renderFires();
  });
});

// ── Search — filters both shelter cards and fire cards live ──
document.getElementById('search-input').addEventListener('input', e => {
  searchQuery = e.target.value.trim();
  renderShelters();
  renderFires();
});

// ── Boot — fetch all data on page load ──
loadShelters();
loadWildfires();