/* fire-report.js
 * Adds a collapsible "Report a Fire" panel to the top-right of the Leaflet map.
 * Depends on: Leaflet (L) being available globally, and the map instance
 * being stored as window.map (set window.map = L.map(...) in map.js).
 * Reports are saved to localStorage under the key "fireReports".
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
      width: 310px;
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
    .fr-panel-head-left { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; }
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

    .fr-field { margin-bottom: 10px; }
    .fr-field:last-child { margin-bottom: 0; }
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

    .fr-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }

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

    .fr-geo-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-family: 'DM Sans', sans-serif;
      font-size: 12px;
      background: #f9f8f5;
      border: 1px solid rgba(0,0,0,0.18);
      border-radius: 6px;
      padding: 5px 10px;
      cursor: pointer;
      color: #6b6a65;
      margin-top: 6px;
    }
    .fr-geo-btn:hover { background: #f0efe8; }

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
    .fr-submit:hover { background: #791F1F; }

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
        <div class="fr-field">
          <label class="fr-label">Address / landmark <span class="req">*</span></label>
          <input class="fr-input" id="fr-address" placeholder="e.g. 123 Main St, Wenatchee, WA" autocomplete="off" />
        </div>

        <div class="fr-field">
          <label class="fr-label">Coordinates <span class="req">*</span></label>
          <div class="fr-grid">
            <input class="fr-input" id="fr-lat" type="number" placeholder="Latitude" step="any" />
            <input class="fr-input" id="fr-lng" type="number" placeholder="Longitude" step="any" />
          </div>
          <button class="fr-geo-btn" id="fr-geo-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
            </svg>
            Use my location
          </button>
        </div>

        <div class="fr-field">
          <label class="fr-label">Severity <span class="req">*</span></label>
          <div class="fr-sev">
            <button class="fr-sev-btn" id="fr-sev-low"    data-sev="low">🟢 Low</button>
            <button class="fr-sev-btn" id="fr-sev-medium" data-sev="medium">🟠 Medium</button>
            <button class="fr-sev-btn active-high" id="fr-sev-high" data-sev="high">🔴 High</button>
          </div>
        </div>

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

        <div class="fr-field">
          <label class="fr-label">Notes</label>
          <textarea class="fr-input" id="fr-notes" rows="2" placeholder="Size, spread, nearby hazards…" style="resize:vertical;"></textarea>
        </div>

        <button class="fr-submit" id="fr-submit">Submit Report</button>
        <div class="fr-toast" id="fr-toast"></div>
        <div class="fr-count" id="fr-count"></div>
      </div>
    </div>
  `;

  /* ── Leaflet Control ─────────────────────────────────────────────────── */
  function initFireReportControl() {
    if (typeof L === 'undefined') {
      console.warn('fire-report.js: Leaflet not loaded yet, retrying…');
      setTimeout(initFireReportControl, 300);
      return;
    }

    // Wait for window.map to be set by map.js
    if (!window.map) {
      setTimeout(initFireReportControl, 300);
      return;
    }

    // Inject styles
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    // Create custom Leaflet control
    const FireReportControl = L.Control.extend({
      options: { position: 'topright' },
      onAdd: function () {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        container.style.cssText = 'background:none;border:none;box-shadow:none;display:flex;flex-direction:column;align-items:flex-end;gap:6px;';
        container.innerHTML = PANEL_HTML;

        // Prevent map interactions from firing through the control
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);

        return container;
      }
    });

    new FireReportControl().addTo(window.map);

    // ── Wire up interactions after DOM is ready ─────────────────────────
    // Toggle open/close
    document.getElementById('fr-toggle-btn').addEventListener('click', () => {
      document.getElementById('fr-panel').classList.toggle('open');
    });
    document.getElementById('fr-close-btn').addEventListener('click', () => {
      document.getElementById('fr-panel').classList.remove('open');
    });

    // Severity buttons
    let severity = 'high';
    document.querySelectorAll('.fr-sev-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        severity = btn.dataset.sev;
        document.querySelectorAll('.fr-sev-btn').forEach(b => {
          b.className = 'fr-sev-btn';
        });
        btn.classList.add('active-' + severity);
      });
    });

    // Geolocation
    document.getElementById('fr-geo-btn').addEventListener('click', () => {
      if (!navigator.geolocation) return showToast('Geolocation not supported.', false);
      navigator.geolocation.getCurrentPosition(
        pos => {
          document.getElementById('fr-lat').value = pos.coords.latitude.toFixed(5);
          document.getElementById('fr-lng').value = pos.coords.longitude.toFixed(5);
        },
        () => showToast('Could not get location.', false)
      );
    });

    // Submit
    document.getElementById('fr-submit').addEventListener('click', () => {
      const address = document.getElementById('fr-address').value.trim();
      const lat = parseFloat(document.getElementById('fr-lat').value);
      const lng = parseFloat(document.getElementById('fr-lng').value);

      if (!address) return showToast('Please enter an address.', false);
      if (isNaN(lat) || isNaN(lng)) return showToast('Please enter or detect coordinates.', false);

      const report = {
        id: Date.now(),
        address, lat, lng, severity,
        type: document.getElementById('fr-type').value,
        notes: document.getElementById('fr-notes').value.trim(),
        timestamp: new Date().toLocaleString()
      };

      const all = JSON.parse(localStorage.getItem('fireReports') || '[]');
      all.push(report);
      localStorage.setItem('fireReports', JSON.stringify(all));

      // Drop a marker on the map immediately
      addReportMarker(report);

      // Reset fields
      document.getElementById('fr-address').value = '';
      document.getElementById('fr-lat').value = '';
      document.getElementById('fr-lng').value = '';
      document.getElementById('fr-notes').value = '';
      document.getElementById('fr-type').value = '';
      severity = 'high';
      document.querySelectorAll('.fr-sev-btn').forEach(b => b.className = 'fr-sev-btn');
      document.getElementById('fr-sev-high').classList.add('active-high');

      showToast(`Saved! ${all.length} report${all.length !== 1 ? 's' : ''} total.`, true);
      updateCount(all.length);
    });

    // Load existing reports onto the map on startup
    const saved = JSON.parse(localStorage.getItem('fireReports') || '[]');
    saved.forEach(addReportMarker);
    if (saved.length) updateCount(saved.length);
  }

  /* ── Helpers ─────────────────────────────────────────────────────────── */
  function addReportMarker(r) {
    const color = r.severity === 'high'   ? '#E24B4A'
                : r.severity === 'medium' ? '#EF9F27'
                :                           '#639922';

    const marker = L.circleMarker([r.lat, r.lng], {
      radius: 10,
      color: color,
      fillColor: color,
      fillOpacity: 0.85,
      weight: 2
    }).addTo(window.map);

    marker.bindPopup(`
      <b>🔥 ${r.address}</b><br>
      Severity: <b>${r.severity}</b><br>
      ${r.type ? 'Type: ' + r.type + '<br>' : ''}
      ${r.notes ? '<i>' + r.notes + '</i><br>' : ''}
      <small>${r.timestamp}</small>
    `);
  }

  function showToast(msg, ok) {
    const t = document.getElementById('fr-toast');
    if (!t) return;
    t.className = 'fr-toast ' + (ok ? 'success' : 'error');
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