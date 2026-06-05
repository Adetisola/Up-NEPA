/* ======================================================
   UP NEPA — Home Screen
   Main dashboard with status card, report buttons,
   nearby areas, prediction, and streak
   ====================================================== */

import {
  subscribe,
  getUserArea,
  getUserAreaStatus,
  getNearbyStatuses,
  getUser,
  formatTimeAgo,
} from './data/store.js';
import { renderStatusCard } from './components/status-card.js';
import { renderNearbyAreas } from './components/nearby-area.js';
import { renderStreakBanner } from './components/streak-banner.js';
import { bindReportButtons } from './reporting.js';

let unsubscribe = null;
let timeUpdateInterval = null;

/**
 * Render the home screen.
 */
export function renderHome(container) {
  // Clean up previous subscriptions
  if (unsubscribe) unsubscribe();
  if (timeUpdateInterval) clearInterval(timeUpdateInterval);

  function render() {
    const user = getUser();
    const area = getUserArea();
    const areaStatus = getUserAreaStatus();
    const nearbyStatuses = getNearbyStatuses();
    const streak = user?.streak || 0;

    container.innerHTML = `
      ${renderHeader()}
      <main class="home" role="main">
        ${renderStatusCard(areaStatus, area)}
        ${renderReportButtons(areaStatus)}
        ${renderNearbyAreas(nearbyStatuses)}
        ${renderPrediction(areaStatus)}
        ${renderStreakBanner(streak)}
      </main>
    `;

    // Bind report button events
    bindReportButtons();

    // Bind header events
    bindHeaderEvents();
  }

  // Initial render
  render();

  // Subscribe to state changes for re-renders
  unsubscribe = subscribe(() => {
    render();
  });

  // Update relative times every 30 seconds
  timeUpdateInterval = setInterval(() => {
    const timeAgoEl = document.getElementById('time-ago');
    if (timeAgoEl) {
      const areaStatus = getUserAreaStatus();
      if (areaStatus?.lastUpdated) {
        timeAgoEl.textContent = formatTimeAgo(areaStatus.lastUpdated);
      }
    }
  }, 30000);
}

/**
 * Render the app header.
 */
function renderHeader() {
  return `
    <header class="header" role="banner">
      <div class="header-logo">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M13 2L3 14h9l-1 10 10-12h-9l1-10z"/>
        </svg>
        <span class="header-logo-text">Up NEPA</span>
      </div>
      <div class="header-actions">
        <button class="header-btn" id="btn-notif" aria-label="Notifications" title="Notifications">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </button>
        <button class="header-btn" id="btn-settings" aria-label="Settings" title="Settings">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </div>
    </header>
  `;
}

/**
 * Render the report action buttons.
 */
function renderReportButtons(areaStatus) {
  const statusType = areaStatus?.currentStatus;

  return `
    <div class="report-buttons" id="report-buttons">
      <button
        class="report-btn report-btn-on"
        id="btn-report-on"
        aria-label="Report power is on"
      >
        ✅ Confirm ON
      </button>
      <button
        class="report-btn report-btn-off"
        id="btn-report-off"
        aria-label="Report power is off"
      >
        ❌ It's Off
      </button>
    </div>
  `;
}

/**
 * Render the prediction section.
 */
function renderPrediction(areaStatus) {
  // Phase 2: For now, show placeholder
  const isOff = areaStatus?.currentStatus === 'OFF' || areaStatus?.currentStatus === 'LIKELY_OFF';

  let predictionText;
  let icon;

  if (isOff) {
    predictionText = `Not enough data for your area yet — <em>help us by reporting daily</em>. With more reports, we'll predict when light usually comes back.`;
    icon = '🔮';
  } else {
    predictionText = `We're collecting patterns for your area. Keep reporting and we'll show <em>when light usually comes and goes</em>.`;
    icon = '📊';
  }

  return `
    <div class="prediction-card" id="prediction-card">
      <div class="section-label">Prediction</div>
      <div class="prediction-icon">${icon}</div>
      <p class="prediction-text">${predictionText}</p>
      <div class="prediction-confidence">
        <span>📈</span>
        <span>Building patterns from community reports...</span>
      </div>
    </div>
  `;
}

/**
 * Bind header button events.
 */
function bindHeaderEvents() {
  const btnSettings = document.getElementById('btn-settings');
  if (btnSettings) {
    btnSettings.addEventListener('click', () => {
      window.location.hash = '/settings';
    });
  }
}
