import { getState, subscribe } from './data/store.js';

let mapInstance = null;
let markers = {};

export function renderMap(container) {
  container.innerHTML = `
    <header class="header">
      <div class="header-logo">Map Visualization</div>
    </header>
    <div id="leaflet-map" style="width: 100%; height: calc(100vh - 140px); background: #1a1a1a;"></div>
  `;

  // Initialize Map
  const mapEl = document.getElementById('leaflet-map');
  if (!mapEl) return;

  // Center on Magboro coordinates
  mapInstance = L.map(mapEl).setView([6.7214, 3.4243], 15);

  // Use CartoDB Dark Matter tiles for a sleek dark mode look
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(mapInstance);

  // Initial render
  updateMarkers(getState());

  // Subscribe to store updates
  const unsubscribe = subscribe(updateMarkers);

  return () => {
    unsubscribe();
  };
}

function updateMarkers(state) {
  if (!mapInstance || !state.areas) return;

  state.areas.forEach(area => {
    // Only plot areas with coordinates
    if (!area.lat || !area.lng) return;

    const statusObj = state.statuses[area.id];
    const status = statusObj?.current_status || 'UNCONFIRMED';
    
    let color = '#888888'; // Grey for unconfirmed
    if (status === 'ON' || status === 'LIKELY_ON') color = '#10B981'; // Green
    if (status === 'OFF' || status === 'LIKELY_OFF') color = '#EF4444'; // Red

    const size = statusObj?.confidence > 0.5 ? 14 : 10;

    // Create custom circle marker
    if (markers[area.id]) {
      markers[area.id].setStyle({ fillColor: color, color: color, radius: size });
      markers[area.id].bindPopup(`<b>${area.name}</b><br>Status: ${status}`);
    } else {
      const marker = L.circleMarker([area.lat, area.lng], {
        radius: size,
        fillColor: color,
        color: color,
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
      }).addTo(mapInstance);

      marker.bindPopup(`<b>${area.name}</b><br>Status: ${status}`);
      markers[area.id] = marker;
    }
  });
}
