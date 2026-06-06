/* ======================================================
   UP NEPA — Status Card Component (Hero)
   Large status display for user's area
   ====================================================== */

import { getStatusLabel, getStatusType } from '../data/status-engine.js';
import { getStalenessLevel, formatTimeAgo } from '../data/store.js';

/**
 * Render the hero status card.
 * @param {Object} areaStatus - { currentStatus, confidence, reportCount, lastUpdated }
 * @param {Object} area - { id, name, city }
 * @returns {string} HTML string
 */
export function renderStatusCard(areaStatus, area) {
  if (!areaStatus || !area) {
    return `
      <div class="status-hero status-unknown" id="status-card">
        <div class="status-icon-row">
          <span class="status-bolt">—</span>
          <div>
            <div class="status-label">No Area Selected</div>
          </div>
        </div>
        <div class="status-meta">
          <span class="status-meta-item">Select your area to see power status</span>
        </div>
      </div>
    `;
  }

  const statusType = getStatusType(areaStatus.currentStatus);
  const statusLabel = getStatusLabel(areaStatus.currentStatus);
  const staleness = getStalenessLevel(areaStatus.lastUpdated);
  const timeAgo = formatTimeAgo(areaStatus.lastUpdated);

  // Determine CSS class
  let heroClass = `status-${statusType}`;
  if (staleness === 'fresh') heroClass += ' fresh';
  if (staleness === 'stale') heroClass = 'status-stale';
  if (staleness === 'none') heroClass = 'status-unknown';

  // Status icon
  const bolt = statusType === 'on' ? '⚡' : statusType === 'off' ? '🔴' : '—';

  // Meta label based on staleness
  let stalenessLabel = '';
  if (staleness === 'stale') {
    stalenessLabel = ' · Unconfirmed — tap to update';
  } else if (staleness === 'none') {
    stalenessLabel = '';
  }

  // Report count text
  const reportText = areaStatus.reportCount === 1
    ? 'Reported by 1 person'
    : areaStatus.reportCount > 0
      ? `Reported by ${areaStatus.reportCount} people`
      : 'No reports yet';

  return `
    <div class="status-hero ${heroClass}" id="status-card">
      <div class="area-badge">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        ${area.city} — ${area.name}
      </div>

      <div class="status-icon-row" style="margin-top: var(--space-xl)">
        <span class="status-bolt">${bolt}</span>
        <div>
          <div class="status-label">${staleness === 'none' ? 'No Recent Data' : statusLabel}</div>
        </div>
      </div>

      <div class="status-meta">
        ${areaStatus.reportCount > 0 ? `
          <span class="status-meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span class="report-count" id="report-count" data-count="${areaStatus.reportCount}">${reportText}</span>
          </span>
        ` : ''}
        ${areaStatus.lastUpdated ? `
          <span class="status-meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span id="time-ago">${timeAgo}${stalenessLabel}</span>
          </span>
        ` : `
          <span class="status-meta-item">No data for this area yet</span>
        `}
      </div>
    </div>
  `;
}
