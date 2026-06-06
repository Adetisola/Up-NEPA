import { getState, subscribe, formatTimeAgo } from './data/store.js';

let mapInstance = null;
let currentTileLayer = null;
let markers = {};
let lastTheme = null;

const THEME_TILES = {
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
};

export function renderMap(container) {
  container.innerHTML = `
    <header class="header">
      <div class="header-logo">Map Visualization</div>
    </header>
    <div id="leaflet-map" style="width: 100%; height: calc(100vh - 140px); background: var(--bg-default);"></div>
  `;

  // Initialize Map
  const mapEl = document.getElementById('leaflet-map');
  if (!mapEl) return;

  // Center on Magboro coordinates
  mapInstance = L.map(mapEl).setView([6.7214, 3.4243], 15);

  const state = getState();
  lastTheme = state.theme || 'dark';

  // Add initial tile layer
  currentTileLayer = L.tileLayer(THEME_TILES[lastTheme], {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(mapInstance);

  // Initial render
  updateMarkers(state);

  // Subscribe to store updates
  const unsubscribe = subscribe(updateMarkers);

  return () => {
    unsubscribe();
  };
}

function updateMarkers(state) {
  if (!mapInstance || !state.areas) return;

  // Handle Theme Switching
  if (state.theme && state.theme !== lastTheme) {
    lastTheme = state.theme;
    if (currentTileLayer) mapInstance.removeLayer(currentTileLayer);
    currentTileLayer = L.tileLayer(THEME_TILES[lastTheme], {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(mapInstance);
  }

  const userAreaId = state.user?.areaId;

  state.areas.forEach(area => {
    // Only plot areas with coordinates
    if (!area.lat || !area.lng) return;

    const statusObj = state.statuses[area.id];
    const status = statusObj?.current_status || 'UNCONFIRMED';
    const reportCount = statusObj?.report_count || 0;
    const confidence = statusObj?.confidence || 0;
    
    let color = '#888888'; // Grey for unconfirmed
    if (status === 'ON' || status === 'LIKELY_ON') color = '#10B981'; // Green
    if (status === 'OFF' || status === 'LIKELY_OFF') color = '#EF4444'; // Red

    // Scale dot size with confidence continuously: min 8, max 16
    const baseSize = 8;
    const size = baseSize + (confidence * 8);

    const isUserArea = area.id === userAreaId;
    const className = isUserArea ? 'user-area-ring' : '';
    
    // Popup Content
    const statusText = status.replace('_', ' ');
    const lastUpdated = formatTimeAgo(statusObj?.last_updated);
    const popupContent = `
      <div style="font-family: var(--font-family); padding: 4px;">
        <h4 style="margin: 0 0 4px 0; font-size: 14px;">${area.name}</h4>
        <div style="color: ${color}; font-weight: bold; margin-bottom: 4px;">${statusText}</div>
        <div style="font-size: 12px; color: var(--text-muted);">
          <b>${reportCount}</b> recent reports<br>
          Updated ${lastUpdated}
        </div>
      </div>
    `;

    // Create or update custom circle marker
    if (markers[area.id]) {
      markers[area.id].setStyle({ fillColor: color, color: isUserArea ? '#FFB400' : color, radius: size, className, weight: isUserArea ? 2 : 1 });
      markers[area.id].getPopup().setContent(popupContent);
    } else {
      const marker = L.circleMarker([area.lat, area.lng], {
        radius: size,
        fillColor: color,
        color: isUserArea ? '#FFB400' : color,
        weight: isUserArea ? 2 : 1,
        opacity: 1,
        fillOpacity: 0.8,
        className
      }).addTo(mapInstance);

      marker.bindPopup(popupContent);
      markers[area.id] = marker;
    }
  });
}
