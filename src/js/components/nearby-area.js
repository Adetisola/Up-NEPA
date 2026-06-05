/* ======================================================
   UP NEPA — Nearby Area Component
   Compact status display for neighbouring areas
   ====================================================== */

import { getStatusType, getStatusShort, getStatusIcon } from '../data/status-engine.js';
import { formatTimeAgo, getStalenessLevel } from '../data/store.js';

/**
 * Render the nearby areas list.
 * @param {Array} nearbyStatuses - [{ area, status }]
 * @returns {string} HTML string
 */
export function renderNearbyAreas(nearbyStatuses) {
  if (!nearbyStatuses || nearbyStatuses.length === 0) {
    return '';
  }

  // Sort: freshest data first, then by name
  const sorted = [...nearbyStatuses].sort((a, b) => {
    const aTime = a.status.lastUpdated ? new Date(a.status.lastUpdated).getTime() : 0;
    const bTime = b.status.lastUpdated ? new Date(b.status.lastUpdated).getTime() : 0;
    return bTime - aTime;
  });

  const items = sorted.map((item) => {
    const type = getStatusType(item.status.currentStatus);
    const icon = getStatusIcon(item.status.currentStatus);
    const shortStatus = getStatusShort(item.status.currentStatus);
    const timeAgo = formatTimeAgo(item.status.lastUpdated);
    const staleness = getStalenessLevel(item.status.lastUpdated);

    return `
      <div class="nearby-item" style="${staleness === 'stale' || staleness === 'none' ? 'opacity: 0.5;' : ''}">
        <div class="nearby-info">
          <span class="nearby-name">${item.area.name}</span>
          <span class="nearby-time">${timeAgo}</span>
        </div>
        <div class="nearby-status ${type}">
          <span>${icon}</span>
          <span>${shortStatus}</span>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="nearby-section">
      <div class="section-label">Nearby Areas</div>
      <div class="nearby-list" id="nearby-list">
        ${items}
      </div>
    </div>
  `;
}
