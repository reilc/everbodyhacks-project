/* fire-report.js
 * Adds a collapsible "Report a Fire" panel to the top-right of the Leaflet map.
 * Depends on: Leaflet (L) being available globally, and the map instance
 * being stored as window.map (set window.map = L.map(...) in map.js).
 * Reports are saved to localStorage under the key "fireReports".
 *
 * Location is picked by clicking on an embedded mini-map (centered on the
 * user's GPS location if available, otherwise defaults to Washington state).
 */

(function () {
  'use strict';

  /* ── Styles ──────────────────────────────────────────────────────────── */
  const CSS = `
    .fr-toggle {
      display: flex;
      align-items: center;
      gap: 7px;
      background: #fff;
      border: none;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.18);
      padding: 9px 14px;
      font-family: 'DM Sans', sans-serif;
      font-size: 14px;
      font-weight: 500;
      color: #791F1F;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.15s;
    }
    .fr-toggle:hover { background: #FCEBEB; }
    .fr-toggle svg { flex-shrink: 0; }

    .fr-panel {
      background: #fff;
      border-radius: 10px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.18);
      width: 320px;
      font-family: 'DM Sans', sans-serif;
      overflow: hidden;
      display: none;
    }
    .fr-panel.open { display: block; }

    .fr-panel-head {
      background: #A32D2D;
      color: #fff;
      padding: 12px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .fr-panel-head-left {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 700;
    }
    .fr-close {
      background: none;
      border: none;
      color: rgba(255,255,255,0.8);
      cursor: pointer;
      font-size: 20px;
      line-height: 1;
      padding: 0 2px;
    }
    .fr-close:hover { color: #fff; }

    .fr-body { padding: 14px; }

    /* ── Mini-map picker ── */
    .fr-map-wrap {
      position: relative;
      border-radius: 8px;
      overflow: hidden;
      border: 2px solid #e8e7e0;
      margin-bottom: 10px;
      transition: border-color 0.15s;
    }
    .fr-map-wrap.selected { border-color: #A32D2D; }

    #fr-minimap {
      width: 100%;
      height: 180px;
      display: block;
    }

    .fr-map-hint {
      position: absolute;
      bottom: 0; left: 0; right: 0;
      background: rgba(0,0,0,0.55);
      color: #fff;
      font-size: 11px;
      text-align: center;
      padding: 5px 8px;
      pointer-events: none;
      transition: opacity 0.2s;
    }
    .fr-map-hint.hidden { opacity: 0; }

    .fr-coords {
      font-size: 11px;
      color: #9b9a96;
      text-align: center;
      margin-bottom: 10px;
      min-height: 16px;
    }
    .fr-coords.set { color: #A32D2D; font-weight: 600; }

    /* ── Locate me button ── */
    .fr-locate-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      width: 100%;
      font-family: 'DM Sans', sans-serif;
      font-size: 12px;
      background: #f9f8f5;
      border: 1px solid rgba(0,0,0,0.18);
      border-radius: 6px;
      padding: 6px 10px;
      cursor: pointer;
      color: #6b6a65;
      margin-bottom: 10px;
      transition: background 0.15s;
    }
    .fr-locate-btn:hover { background: #f0efe8; }

    /* ── Fields ── */
    .fr-field { margin-bottom: 10px; }
    .fr-label {
      display: block;
      font-size: 12px;
      font-weight: 500;
      color: #6b6a65;
      margin-bottom: 4px;
    }
    .fr-label .req { color: #E24B4A; }

    .fr-input {
      width: 100%;
      font-family: 'DM Sans', sans-serif;
      font-size: 13px;
      padding: 7px 10px;
      border: 1px solid rgba(0,0,0,0.18);
      border-radius: 6px;
      box-sizing: border-box;
      background: #f9f8f5;
      color: #1a1a18;
      outline: none;
      transition: border-color 0.15s;
    }
    .fr-input:focus { border-color: #E24B4A; box-shadow: 0 0 0 2px rgba(226,75,74,0.12); }

    .fr-sev { display: grid; grid-template-columns: repeat(3,1fr); gap: 6px; margin-top: 2px; }
    .fr-sev-btn {
      border: 1px solid rgba(0,0,0,0.15);
      background: #f9f8f5;
      border-radius: 6px;
      padding: 7px 4px;
      font-family: 'DM Sans', sans-serif;
      font-size: 12px;
      font-weight: 500;
      color: #6b6a65;
      cursor: pointer;
      text-align: center;
      transition: all 0.12s;
    }
    .fr-sev-btn.active-low    { border-color:#639922; background:#EAF3DE; color:#3B6D11; }
    .fr-sev-btn.active-medium { border-color:#BA7517; background:#FAEEDA; color:#854F0B; }
    .fr-sev-btn.active-high   { border-color:#A32D2D; background:#FCEBEB; color:#791F1F; }

    .fr-submit {
      width: 100%;
      padding: 10px;
      background: #A32D2D;
      border: none;
      border-radius: 6px;
      font-family: 'DM Sans', sans-serif;
      font-size: 14px;
      font-weight: 700;
      color: #fff;
      cursor: pointer;
      margin-top: 12px;
      transition: background 0.15s;
    }
    .fr-submit:hover  { background: #791F1F; }
    .fr-submit:disabled { background: #ccc; cursor: not-allowed; }

    .fr-toast {
      display: none;
      border-radius: 6px;
      padding: 9px 12px;
      font-size: 12px;
      font-weight: 500;
      margin-top: 10px;
      align-items: center;
      gap: 8px;
    }
    .fr-toast.success { display:flex; background:#EAF3DE; color:#27500A; border:1px solid #97C459; }
    .fr-toast.error   { display:flex; background:#FCEBEB; color:#791F1F; border:1px solid #F09595; }

    .fr-count {
      font-size: 11px;
      color: #9b9a96;
      text-align: center;
      margin-top: 8px;
    }
  `;

  /* ── HTML template ───────────────────────────────────────────────────── */
  const PANEL_HTML = `
    <button class="fr-toggle" id="fr-toggle-btn" title="Report a fire">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E24B4A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2c0 6-6 8-6 14a6 6 0 0012 0c0-6-6-8-6-14z"/>
        <path d="M12 12c0 3-2 4-2 6a2 2 0 004 0c0-2-2-3-2-6z"/>
      </svg>
      Report a Fire
    </button>

    <div class="fr-panel" id="fr-panel">
      <div class="fr-panel-head">
        <div class="fr-panel-head-left">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2c0 6-6 8-6 14a6 6 0 0012 0c0-6-6-8-6-14z"/>
            <path d="M12 12c0 3-2 4-2 6a2 2 0 004 0c0-2-2-3-2-6z"/>
          </svg>
          Report a Fire Incident
        </div>
        <button class="fr-close" id="fr-close-btn" title="Close">&#x2715;</button>
      </div>

      <div class="fr-body">

        <!-- Step 1: location picker mini-map -->
        <div class="fr-field">
          <label class="fr-label">Fire location <span class="req">*</span></label>
          <div class="fr-map-wrap" id="fr-map-wrap">
            <div id="fr-minimap"></div>
            <div class="fr-map-hint" id="fr-map-hint">Tap the map to pin the fire location</div>
          </div>
          <div class="fr-coords" id="fr-coords">No location selected</div>
        </div>

        <!-- Center on my location -->
        <button class="fr-locate-btn" id="fr-locate-btn">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
          </svg>
          Center map on my location
        </button>

        <!-- Severity -->
        <div class="fr-field">
          <label class="fr-label">Severity <span class="req">*</span></label>
          <div class="fr-sev">
            <button class="fr-sev-btn" id="fr-sev-low"    data-sev="low">🟢 Low</button>
            <button class="fr-sev-btn" id="fr-sev-medium" data-sev="medium">🟠 Medium</button>
            <button class="fr-sev-btn active-high" id="fr-sev-high" data-sev="high">🔴 High</button>
          </div>
        </div>

        <!-- Fire type -->
        <div class="fr-field">
          <label class="fr-label">Fire type</label>
          <select class="fr-input" id="fr-type">
            <option value="">— select —</option>
            <option>Structure fire</option>
            <option>Vehicle fire</option>
            <option>Wildfire / brush</option>
            <option>Electrical fire</option>
            <option>Chemical fire</option>
            <option>Other</option>
          </select>
        </div>

        <!-- Notes -->
        <div class="fr-field">
          <label class="fr-label">Notes</label>
          <textarea class="fr-input" id="fr-notes" rows="2" placeholder="Size, spread, nearby hazards…" style="resize:vertical;"></textarea>
        </div>

        <button class="fr-submit" id="fr-submit" disabled>Pin a location to submit</button>
        <div class="fr-toast" id="fr-toast"></div>
        <div class="fr-count" id="fr-count"></div>
      </div>
    </div>
  `;

  /* ── State ───────────────────────────────────────────────────────────── */
  let miniMap = null;       // Leaflet instance for the mini-map
  let pinMarker = null;     // The draggable pin on the mini-map
  let pickedLat = null;
  let pickedLng = null;
  let severity = 'high';

  /* ── Leaflet Control ─────────────────────────────────────────────────── */
  function initFireReportControl() {
    if (typeof L === 'undefined') {
      setTimeout(initFireReportControl, 300);
      return;
    }
    if (!window.map) {
      setTimeout(initFireReportControl, 300);
      return;
    }

    // Inject styles
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    // Create Leaflet control
    const FireReportControl = L.Control.extend({
      options: { position: 'topright' },
      onAdd() {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        container.style.cssText = 'background:none;border:none;box-shadow:none;display:flex;flex-direction:column;align-items:flex-end;gap:6px;';
        container.innerHTML = PANEL_HTML;
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);
        return container;
      }
    });

    new FireReportControl().addTo(window.map);
    wireUI();

    // Load any existing saved reports onto the main map
    const saved = JSON.parse(localStorage.getItem('fireReports') || '[]');
    saved.forEach(addReportMarker);
    if (saved.length) updateCount(saved.length);
  }

  /* ── Wire up all UI interactions ─────────────────────────────────────── */
  function wireUI() {

    // Toggle panel open/close
    document.getElementById('fr-toggle-btn').addEventListener('click', () => {
      const panel = document.getElementById('fr-panel');
      const opening = !panel.classList.contains('open');
      panel.classList.toggle('open');

      // Initialise the mini-map the first time the panel opens
      if (opening && !miniMap) {
        initMiniMap();
      } else if (opening && miniMap) {
        // Leaflet needs a size invalidation when shown after being hidden
        setTimeout(() => miniMap.invalidateSize(), 50);
      }
    });

    document.getElementById('fr-close-btn').addEventListener('click', () => {
      document.getElementById('fr-panel').classList.remove('open');
    });

    // "Center on my location" button
    document.getElementById('fr-locate-btn').addEventListener('click', locateUser);

    // Severity buttons
    document.querySelectorAll('.fr-sev-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        severity = btn.dataset.sev;
        document.querySelectorAll('.fr-sev-btn').forEach(b => b.className = 'fr-sev-btn');
        btn.classList.add('active-' + severity);
      });
    });

    // Submit
    document.getElementById('fr-submit').addEventListener('click', submitReport);
  }

  /* ── Mini-map initialisation ─────────────────────────────────────────── */
  function initMiniMap() {
    // Default center: Washington state
    const defaultCenter = [47.5, -120.5];
    const defaultZoom   = 6;

    miniMap = L.map('fr-minimap', {
      center: defaultCenter,
      zoom: defaultZoom,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(miniMap);

    // Click anywhere on the mini-map to drop/move the pin
    miniMap.on('click', function (e) {
      placePin(e.latlng.lat, e.latlng.lng);
    });

    // Try to center on the user's location right away
    locateUser();
  }

  /* ── Place / move the pin ────────────────────────────────────────────── */
  function placePin(lat, lng) {
    pickedLat = lat;
    pickedLng = lng;

    // Custom fire pin icon
    const fireIcon = L.divIcon({
      className: '',
      html: `<div style="
        font-size: 26px;
        line-height: 1;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
        transform: translateX(-50%) translateY(-100%);
      ">📍</div>`,
      iconAnchor: [0, 0],
    });

    if (pinMarker) {
      pinMarker.setLatLng([lat, lng]);
    } else {
      pinMarker = L.marker([lat, lng], { icon: fireIcon, draggable: true }).addTo(miniMap);

      // Dragging the pin also updates the coords
      pinMarker.on('dragend', function () {
        const pos = pinMarker.getLatLng();
        updateCoordDisplay(pos.lat, pos.lng);
        pickedLat = pos.lat;
        pickedLng = pos.lng;
      });
    }

    updateCoordDisplay(lat, lng);

    // Show selected state
    document.getElementById('fr-map-wrap').classList.add('selected');
    document.getElementById('fr-map-hint').classList.add('hidden');

    // Enable submit button now that we have a location
    const submitBtn = document.getElementById('fr-submit');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Report';
  }

  /* ── Update the coordinate display below the mini-map ────────────────── */
  function updateCoordDisplay(lat, lng) {
    const el = document.getElementById('fr-coords');
    el.textContent = `📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    el.classList.add('set');
  }

  /* ── Center mini-map on user's GPS location ──────────────────────────── */
  function locateUser() {
    if (!navigator.geolocation) {
      return showToast('Geolocation not supported by your browser.', false);
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        if (miniMap) {
          miniMap.setView([lat, lng], 13);
        }
      },
      () => {
        // Silently fail — user just stays on the default WA view
        console.info('fire-report.js: geolocation denied or unavailable');
      }
    );
  }

  /* ── Submit the report ───────────────────────────────────────────────── */
  function submitReport() {
    if (pickedLat === null || pickedLng === null) {
      return showToast('Please tap the map to select a fire location.', false);
    }

    const report = {
      id:        Date.now(),
      lat:       pickedLat,
      lng:       pickedLng,
      severity,
      type:      document.getElementById('fr-type').value,
      notes:     document.getElementById('fr-notes').value.trim(),
      timestamp: new Date().toLocaleString(),
    };

    const all = JSON.parse(localStorage.getItem('fireReports') || '[]');
    all.push(report);
    localStorage.setItem('fireReports', JSON.stringify(all));

    // Drop marker on the MAIN map
    addReportMarker(report);

    // Reset form
    pickedLat = null;
    pickedLng = null;
    if (pinMarker) { miniMap.removeLayer(pinMarker); pinMarker = null; }
    document.getElementById('fr-map-wrap').classList.remove('selected');
    document.getElementById('fr-map-hint').classList.remove('hidden');
    document.getElementById('fr-coords').textContent = 'No location selected';
    document.getElementById('fr-coords').classList.remove('set');
    document.getElementById('fr-notes').value = '';
    document.getElementById('fr-type').value = '';
    severity = 'high';
    document.querySelectorAll('.fr-sev-btn').forEach(b => b.className = 'fr-sev-btn');
    document.getElementById('fr-sev-high').classList.add('active-high');

    const submitBtn = document.getElementById('fr-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Pin a location to submit';

    // Re-center mini-map on user location for the next report
    locateUser();

    showToast(`Report saved! ${all.length} total in this browser.`, true);
    updateCount(all.length);
  }

  /* ── Add a marker to the MAIN map ───────────────────────────────────── */
  function addReportMarker(r) {
    const color = r.severity === 'high'   ? '#E24B4A'
                : r.severity === 'medium' ? '#EF9F27'
                :                           '#639922';

    const marker = L.circleMarker([r.lat, r.lng], {
      radius: 10,
      color,
      fillColor: color,
      fillOpacity: 0.85,
      weight: 2,
    }).addTo(window.map);

    marker.bindPopup(`
      <b>🔥 Community Report</b><br>
      Severity: <b>${r.severity}</b><br>
      ${r.type  ? 'Type: '  + r.type  + '<br>' : ''}
      ${r.notes ? '<i>' + r.notes + '</i><br>' : ''}
      <small>${r.timestamp}</small>
    `);
  }

  /* ── Helpers ─────────────────────────────────────────────────────────── */
  function showToast(msg, ok) {
    const t = document.getElementById('fr-toast');
    if (!t) return;
    t.className  = 'fr-toast ' + (ok ? 'success' : 'error');
    t.textContent = msg;
  }

  function updateCount(n) {
    const el = document.getElementById('fr-count');
    if (el) el.textContent = n + ' report' + (n !== 1 ? 's' : '') + ' saved in this browser';
  }

  /* ── Boot ────────────────────────────────────────────────────────────── */
  if (window.map) {
    initFireReportControl();
  } else {
    window.addEventListener('mapReady', initFireReportControl);
  }

})();