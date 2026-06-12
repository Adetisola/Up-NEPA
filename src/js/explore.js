import { getState, subscribe, formatTimeAgo } from './data/store.js';
import { getStatusLabel, getStatusType } from './data/status-engine.js';

export function renderExplore(container) {
  const state = getState();
  
  container.innerHTML = `
    <header class="header">
      <div class="header-logo" style="font-weight: 800; font-size: var(--fs-xl);">Explore</div>
    </header>
    <div class="container" style="padding-top: 10px; padding-bottom: 80px;">
      <div style="margin-bottom: var(--space-md); position: sticky; top: 60px; z-index: 10; background: var(--bg-body); padding: 10px 0;">
        <input type="text" id="explore-search" placeholder="Search feeder, city or state..." style="width: 100%; padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border); background: var(--bg-surface); color: var(--text); font-size: 1rem;">
      </div>
      <div style="margin-bottom: var(--space-lg);">
        <p style="color: var(--text-muted); font-size: 0.9rem;">
          Check the real-time electricity status of other areas and feeders in Magboro.
        </p>
      </div>
      <div id="explore-list" style="display: flex; flex-direction: column; gap: var(--space-md);">
        <!-- List will be injected here -->
      </div>
    </div>
  `;

  let searchQuery = '';

  const render = () => updateExploreList(state, searchQuery);
  
  const searchInput = document.getElementById('explore-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase();
      render();
    });
  }

  render();
  
  const unsubscribe = subscribe(render);

  return () => {
    unsubscribe();
  };
}

let expandedAreaId = null;

function updateExploreList(state, searchQuery = '') {
  const listContainer = document.getElementById('explore-list');
  if (!listContainer) return;

  const areas = state.areas || [];
  const statuses = state.statuses || {};
  
  // Filter by search query
  const filteredAreas = areas.filter(area => {
    const q = searchQuery.toLowerCase();
    return (area.name || '').toLowerCase().includes(q) ||
           (area.city || '').toLowerCase().includes(q) ||
           (area.state || '').toLowerCase().includes(q);
  });

  // Group by city
  const grouped = {};
  filteredAreas.forEach(area => {
    if (!grouped[area.city]) grouped[area.city] = [];
    grouped[area.city].push(area);
  });
  
  let html = '';
  
  for (const city of Object.keys(grouped).sort()) {
    html += `
      <div style="margin-top: var(--space-md);">
        <h3 style="font-size: 1rem; color: var(--text-secondary); margin-bottom: var(--space-sm); border-bottom: 1px solid var(--border); padding-bottom: 4px;">
          ${city}
        </h3>
        <div style="display: flex; flex-direction: column; gap: 8px;">
    `;
    
    // Sort areas by name
    const cityAreas = grouped[city].sort((a, b) => a.name.localeCompare(b.name));
    
    cityAreas.forEach(area => {
      const statusObj = statuses[area.id] || {
        currentStatus: 'UNCONFIRMED',
        reportCount: 0,
        lastUpdated: null,
      };
      
      const type = getStatusType(statusObj.currentStatus);
      const label = getStatusLabel(statusObj.currentStatus);
      const timeAgo = formatTimeAgo(statusObj.lastUpdated);
      
      let indicatorColor = 'var(--text-muted)';
      if (type === 'on') indicatorColor = 'var(--green)';
      else if (type === 'off') indicatorColor = 'var(--red)';
      else if (type === 'unstable') indicatorColor = 'var(--amber)';
      
      const isExpanded = expandedAreaId === area.id;
      
      html += `
        <div class="card explore-item" data-id="${area.id}" style="padding: 12px; border-left: 4px solid ${indicatorColor}; cursor: pointer; transition: background 0.2s;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div>
              <div style="font-weight: 600; font-size: 0.95rem; margin-bottom: 2px;">${area.name}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">
                ${statusObj.reportCount} reports · ${timeAgo}
              </div>
            </div>
            <div style="text-align: right; display: flex; align-items: center; gap: 8px;">
              <div style="font-weight: 700; color: ${indicatorColor}; font-size: 0.9rem;">${label}</div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-muted); transform: rotate(${isExpanded ? '180deg' : '0deg'}); transition: transform 0.2s;">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>
          
          ${isExpanded ? `
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); font-size: 0.85rem;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
              <div>
                <div style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase;">Confidence</div>
                <div style="font-weight: 600;">${Math.round((statusObj.confidence || 0) * 100)}%</div>
              </div>
              <div>
                <div style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase;">Active Reporters</div>
                <div style="font-weight: 600;">${statusObj.active_reporters || 0}</div>
              </div>
            </div>
            <button class="btn btn-secondary btn-sm btn-block view-analytics-btn" data-id="${area.id}">View Full Analytics</button>
          </div>
          ` : ''}
        </div>
      `;
    });
    
    html += `
        </div>
      </div>
    `;
  }
  
  if (filteredAreas.length === 0) {
    html = '<div style="text-align: center; color: var(--text-muted); padding: 40px 0;">No areas found matching your search.</div>';
  }
  
  listContainer.innerHTML = html;

  // Bind click events
  const items = listContainer.querySelectorAll('.explore-item');
  items.forEach(item => {
    item.addEventListener('click', (e) => {
      // Don't trigger if clicking the analytics button
      if (e.target.closest('.view-analytics-btn')) return;
      
      const id = item.dataset.id;
      expandedAreaId = expandedAreaId === id ? null : id;
      updateExploreList(state, searchQuery);
    });
  });

  const analyticsBtns = listContainer.querySelectorAll('.view-analytics-btn');
  analyticsBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      // Navigate to analytics for this specific area (requires routing/state support, mocking for now)
      // Since analytics.js currently uses the logged-in user's area, we could update state or just navigate
      window.location.hash = '/analytics';
    });
  });
}
