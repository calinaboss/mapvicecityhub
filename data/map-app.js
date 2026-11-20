(function() {
      'use strict';

      const CAT_CONFIG = {
        stripclub: { label: 'Strip Clubs', color: '#ff2a85', icon: 'fa-venus', priority: 1 },
        nightlife: { label: 'Nightclubs & Bars', color: '#c084fc', icon: 'fa-martini-glass', priority: 1 },
        weapons: { label: 'Weapons & Ammunition', color: '#ef4444', icon: 'fa-gun', priority: 1 },
        safehouse: { label: 'Safehouses', color: '#fbbf24', icon: 'fa-house-chimney', priority: 1 },
        police: { label: 'Police & Prisons', color: '#3b82f6', icon: 'fa-shield-halved', priority: 1 },
        hospital: { label: 'Hospitals & Medical', color: '#10b981', icon: 'fa-truck-medical', priority: 1 },
        gas: { label: 'Gas Stations & Mods', color: '#f97316', icon: 'fa-gas-pump', priority: 1 },
        easteregg: { label: 'Easter Eggs & Cinema', color: '#ec4899', icon: 'fa-skull', priority: 1 },
        hotel: { label: 'Hotels & Motels', color: '#00d2ff', icon: 'fa-hotel', priority: 1 },
        food: { label: 'Diners & Restaurants', color: '#fb923c', icon: 'fa-utensils', priority: 1 },
        shops: { label: 'Retail & Supermarkets', color: '#38bdf8', icon: 'fa-bag-shopping', priority: 1 },
        transport: { label: 'Airports & Transit', color: '#14b8a6', icon: 'fa-plane-departure', priority: 2 },
        enterable: { label: 'Enterable Interiors', color: '#818cf8', icon: 'fa-door-open', priority: 2 },
        general: { label: 'Other Mapped Buildings', color: '#94a3b8', icon: 'fa-city', priority: 3 }
      };

      const MAP_SIZE = 10000;
      const fullBounds = [[0, 0], [MAP_SIZE, MAP_SIZE]];
      const islandBounds = [[-1500, -500], [11500, 11500]];
      const canvasRenderer = L.canvas({ padding: 0.5 });

      const map = L.map('map', {
        crs: L.CRS.Simple,
        minZoom: -3.0,
        maxZoom: 3.0,
        zoomSnap: 0.1,
        zoomDelta: 0.3,
        attributionControl: false,
        preferCanvas: true,
        maxBounds: islandBounds,
        maxBoundsViscosity: 0.7,
        scrollWheelZoom: true
      });

      const basemap = L.imageOverlay('images/basemap.webp', fullBounds, {
        interactive: false,
        alt: 'Leonida Basemap'
      }).addTo(map);

      map.setView([5000, 6000], -2.0);

      const mapContainer = map.getContainer();
      mapContainer.tabIndex = -1;
      mapContainer.style.outline = 'none';
      mapContainer.addEventListener('focus', function(e) {
        e.preventDefault();
      }, true);

      const hudCoords = document.getElementById('hud-coords-text');

      map.on('mousemove', function(e) {
        const px = e.latlng.lng;
        const py = MAP_SIZE - e.latlng.lat;
        const wx = ((px * 4) - 32000) / 2;
        const wy = ((py * 4) - 24000) / -2;
        if (hudCoords) {
          hudCoords.textContent = 'X: ' + wx.toFixed(1) + '  |  Y: ' + wy.toFixed(1);
        }
      });

      function showToast(msg) {
        const toast = document.getElementById('map-toast');
        if (!toast) return;
        toast.textContent = msg;
        toast.style.display = 'block';
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => {
          toast.style.display = 'none';
        }, 2200);
      }

      window.copyCoords = function(wx, wy) {
        const text = 'X: ' + wx + ', Y: ' + wy;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(text).then(() => {
            showToast('Coordinates copied: ' + text);
          });
        } else {
          showToast('Coordinates: ' + text);
        }
      };

      let allLandmarks = window.LEONIDA_LANDMARKS || [];
      let activeCategories = new Set(['stripclub']);

      const markersLayer = L.layerGroup().addTo(map);

      function createSymbolIcon(item) {
        const conf = CAT_CONFIG[item.cat] || CAT_CONFIG.general;
        return L.divIcon({
          className: 'custom-symbol-icon',
          html: `<div class="symbol-marker-pin" style="background: ${conf.color};" title="${escapeHtml(item.name)}"><i class="fa-solid ${conf.icon}"></i></div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
          popupAnchor: [0, -15]
        });
      }

      function buildPopupContent(item) {
        const conf = CAT_CONFIG[item.cat] || CAT_CONFIG.general;
        return `
          <div>
            <span class="popup-badge" style="background: ${conf.color}22; color: ${conf.color}; border: 1px solid ${conf.color}55;">
              <i class="fa-solid ${conf.icon}"></i> ${conf.label}
            </span>
            <div class="popup-title">${escapeHtml(item.name)}</div>
            ${item.inGameAddr ? `<div class="popup-row"><strong>In-Game Area:</strong> <span>${escapeHtml(item.inGameAddr)}</span></div>` : ''}
            ${item.realAddr ? `<div class="popup-row"><strong>Real-World Match:</strong> <span>${escapeHtml(item.realAddr)}</span></div>` : ''}
            <div class="popup-coords-box">
              <span>X: ${item.wx} &bull; Y: ${item.wy}</span>
              <button class="copy-btn" onclick="copyCoords(${item.wx}, ${item.wy})" title="Copy coordinates">
                <i class="fa-regular fa-copy"></i>
              </button>
            </div>
          </div>
        `;
      }

      function escapeHtml(str) {
        if (!str) return '';
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      }

      function renderMarkers() {
        markersLayer.clearLayers();

        const filtered = allLandmarks.filter(item => activeCategories.has(item.cat));

        const useCanvas = filtered.length > 150;

        filtered.forEach(item => {
          const lat = MAP_SIZE - item.py;
          const lng = item.px;
          const conf = CAT_CONFIG[item.cat] || CAT_CONFIG.general;

          let marker;
          if (useCanvas) {
            marker = L.circleMarker([lat, lng], {
              renderer: canvasRenderer,
              radius: 5,
              fillColor: conf.color,
              color: '#ffffff',
              weight: 1,
              fillOpacity: 0.9
            });
          } else {
            marker = L.marker([lat, lng], {
              icon: createSymbolIcon(item),
              title: item.name
            });
          }

          marker.bindPopup(buildPopupContent(item));
          marker.itemData = item;
          markersLayer.addLayer(marker);
        });
      }

      function buildSidebar() {
        const listEl = document.getElementById('sidebar-categories-list');
        if (!listEl) return;

        const counts = {};
        allLandmarks.forEach(l => {
          counts[l.cat] = (counts[l.cat] || 0) + 1;
        });

        const catKeys = Object.keys(CAT_CONFIG);
        listEl.innerHTML = catKeys.map(cat => {
          const conf = CAT_CONFIG[cat];
          const count = counts[cat] || 0;
          const isActive = activeCategories.has(cat);

          return `
            <div class="sidebar-item ${isActive ? 'active' : ''}" data-cat="${cat}">
              <div style="display: flex; align-items: center;">
                <div class="item-icon-box" style="background: ${conf.color};">
                  <i class="fa-solid ${conf.icon}"></i>
                </div>
                <span>${conf.label}</span>
              </div>
              <span class="item-count">${count}</span>
            </div>
          `;
        }).join('');

        listEl.querySelectorAll('.sidebar-item').forEach(item => {
          item.addEventListener('click', function() {
            const cat = this.getAttribute('data-cat');

            if (activeCategories.has(cat) && activeCategories.size === 1) {

              activeCategories = new Set(['stripclub']);
            } else {
              activeCategories = new Set([cat]);
              const matches = allLandmarks.filter(l => l.cat === cat);
              if (matches.length > 0 && matches.length < 50) {
                const boundsList = matches.map(m => [MAP_SIZE - m.py, m.px]);
                map.flyToBounds(boundsList, { maxZoom: 1.2, padding: [60, 60], duration: 0.8 });
              }
            }
            updateSidebarActiveStates();
            renderMarkers();
          });
        });
      }

      function updateSidebarActiveStates() {
        const listEl = document.getElementById('sidebar-categories-list');
        if (!listEl) return;
        listEl.querySelectorAll('.sidebar-item').forEach(item => {
          const cat = item.getAttribute('data-cat');
          if (activeCategories.has(cat)) {
            item.classList.add('active');
          } else {
            item.classList.remove('active');
          }
        });
      }

      const btnFilterReset = document.getElementById('btn-filter-reset');
      if (btnFilterReset) {
        btnFilterReset.addEventListener('click', function() {

          activeCategories = new Set([
            'stripclub', 'nightlife', 'weapons', 'safehouse', 'police',
            'hospital', 'gas', 'easteregg', 'hotel', 'food', 'shops', 'transport', 'enterable'
          ]);
          updateSidebarActiveStates();
          renderMarkers();
          map.setView([5000, 6000], -2.0);
        });
      }

      const sidebarEl = document.getElementById('map-sidebar');
      const toggleSidebarBtn = document.getElementById('btn-toggle-sidebar');

      if (toggleSidebarBtn && sidebarEl) {
        toggleSidebarBtn.addEventListener('click', function() {
          const isCollapsed = sidebarEl.classList.toggle('collapsed');
          if (isCollapsed) {
            toggleSidebarBtn.classList.remove('map-btn-active');
          } else {
            toggleSidebarBtn.classList.add('map-btn-active');
          }
          setTimeout(() => map.invalidateSize(), 220);
        });
      }

      buildSidebar();
      renderMarkers();

      const searchInput = document.getElementById('map-search-input');
      const searchDropdown = document.getElementById('search-dropdown');

      if (searchInput && searchDropdown) {
        searchInput.addEventListener('input', function() {
          const query = this.value.trim().toLowerCase();
          if (query.length < 2) {
            searchDropdown.classList.remove('open');
            searchDropdown.innerHTML = '';
            return;
          }

          const matches = allLandmarks.filter(l => {
            return (l.name && l.name.toLowerCase().includes(query)) ||
                   (l.realAddr && l.realAddr.toLowerCase().includes(query)) ||
                   (l.inGameAddr && l.inGameAddr.toLowerCase().includes(query)) ||
                   (l.cat && l.cat.toLowerCase().includes(query));
          }).slice(0, 10);

          if (matches.length === 0) {
            searchDropdown.innerHTML = '<div style="padding: 12px; font-size: 12px; color: var(--text-muted); text-align: center;">No matching locations found</div>';
            searchDropdown.classList.add('open');
            return;
          }

          searchDropdown.innerHTML = matches.map(m => {
            const conf = CAT_CONFIG[m.cat] || CAT_CONFIG.general;
            return `
              <div class="search-result-item" data-id="${m.id}">
                <div class="search-result-title">
                  <i class="fa-solid ${conf.icon}" style="color: ${conf.color}; margin-right: 6px;"></i>
                  ${escapeHtml(m.name)}
                </div>
                <div class="search-result-subtitle">${escapeHtml(m.inGameAddr || m.realAddr || conf.label)}</div>
              </div>
            `;
          }).join('');

          searchDropdown.classList.add('open');
        });

        searchDropdown.addEventListener('click', function(e) {
          const itemEl = e.target.closest('.search-result-item');
          if (!itemEl) return;
          const id = itemEl.getAttribute('data-id');
          const target = allLandmarks.find(l => l.id === id);
          if (target) {
            searchDropdown.classList.remove('open');
            searchInput.value = target.name;

            if (!activeCategories.has(target.cat)) {
              activeCategories.add(target.cat);
              updateSidebarActiveStates();
              renderMarkers();
            }

            const lat = MAP_SIZE - target.py;
            const lng = target.px;
            map.flyTo([lat, lng], 1.25, { duration: 1.2 });

            setTimeout(() => {
              markersLayer.eachLayer(m => {
                if (m.itemData && m.itemData.id === target.id) {
                  m.openPopup();
                }
              });
            }, 1250);
          }
        });

        document.addEventListener('click', function(e) {
          if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
            searchDropdown.classList.remove('open');
          }
        });
      }

      const fsBtn = document.getElementById('btn-toggle-fullscreen');
      if (fsBtn) {
        fsBtn.addEventListener('click', function() {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
          } else if (document.exitFullscreen) {
            document.exitFullscreen();
          }
        });
      }

    })();

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-copy-coords]');
  if (btn && typeof window.copyCoords === 'function') {
    window.copyCoords(btn.getAttribute('data-copy-coords'));
  }
});
