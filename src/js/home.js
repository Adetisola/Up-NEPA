/* ======================================================
   UP NEPA — Home Screen
   Main dashboard with status card, report buttons,
   nearby areas, prediction, and streak
   ====================================================== */

import {
  subscribe,
  getState,
  getUserArea,
  getUserAreaStatus,
  getNearbyStatuses,
  getUser,
  formatTimeAgo,
  getNotifications,
  getUnreadCount,
} from './data/store.js';
import { getAreaPatterns } from './data/supabase.js';
import { renderStatusCard } from './components/status-card.js';
import { renderNearbyAreas } from './components/nearby-area.js';
import { renderStreakBanner } from './components/streak-banner.js';
import { renderNotificationDrawer, bindNotificationDrawer } from './components/notification-drawer.js';
import { bindReportButtons } from './reporting.js';

import { deferredPrompt, triggerAppInstall } from '../main.js';

let unsubscribe = null;
let timeUpdateInterval = null;
let pwaEventsBound = false;
let isInitialRender = true;

/**
 * Render the home screen.
 */
export function renderHome(container) {
  // Clean up previous subscriptions
  if (unsubscribe) unsubscribe();
  if (timeUpdateInterval) clearInterval(timeUpdateInterval);

  function renderFull() {
    const user = getUser();
    const area = getUserArea();
    const areaStatus = getUserAreaStatus();
    const nearbyStatuses = getNearbyStatuses();
    const streak = user?.streak || 0;
    const notifications = getNotifications();
    const unreadCount = getUnreadCount();

    container.innerHTML = `
      ${renderHeader(unreadCount)}
      <main class="home" role="main">
        <div id="install-banner-container">${renderInstallBanner()}</div>
        <div id="status-card-container">${renderStatusCard(areaStatus, area)}</div>
        <div id="report-buttons-container">${renderReportButtons(areaStatus)}</div>
        <div id="nearby-areas-container">${renderNearbyAreas(nearbyStatuses)}</div>
        <div id="collapsed-analytics-container">${renderCollapsedAnalytics()}</div>
        <div id="prediction-container">${renderPrediction(areaStatus)}</div>
        <div id="streak-banner-container">${renderStreakBanner(streak)}</div>
      </main>
      <div id="drawer-container">${renderNotificationDrawer(notifications)}</div>
    `;

    bindReportButtons();
    
    const analyticsBanner = document.getElementById('collapsed-analytics-banner');
    if (analyticsBanner) {
      analyticsBanner.addEventListener('click', () => {
        window.location.hash = '/analytics';
      });
    }

    fetchCollapsedAnalytics(user);
    bindHeaderEvents();
    bindNotificationDrawer();

    const btnInstall = document.getElementById('btn-install-pwa');
    if (btnInstall) btnInstall.addEventListener('click', triggerAppInstall);
    
    const btnDismissInstall = document.getElementById('btn-dismiss-install');
    if (btnDismissInstall) {
      btnDismissInstall.addEventListener('click', () => {
        localStorage.setItem('installBannerDismissedAt', Date.now().toString());
        const banner = document.getElementById('pwa-install-banner');
        if (banner) banner.style.display = 'none';
      });
    }
  }

  function updateGranular() {
    const state = getState();
    const user = getUser();
    const area = getUserArea();
    const areaStatus = getUserAreaStatus();
    const nearbyStatuses = getNearbyStatuses();
    const streak = user?.streak || 0;
    const notifications = getNotifications();

    // 1. Live Indicator
    const liveDot = document.getElementById('live-indicator-dot');
    if (liveDot) {
      liveDot.style.display = state.online ? 'inline-block' : 'none';
    }

    // 2. Status Card with Slot Machine Animation
    const statusCardContainer = document.getElementById('status-card-container');
    if (statusCardContainer) {
      const oldReportTextEl = document.getElementById('report-count');
      const oldReportCount = oldReportTextEl ? parseInt(oldReportTextEl.dataset.count) || 0 : 0;
      const newReportCount = areaStatus?.reportCount || 0;

      // Update the card HTML if not currently animating a count-up
      if (window.__upNepaAnimating && newReportCount === oldReportCount) {
        // Skip destroying the DOM if the real-time update just matches our optimistic update
      } else {
        statusCardContainer.innerHTML = renderStatusCard(areaStatus, area);

        // If count went up, trigger roll-up animation
        if (newReportCount > oldReportCount) {
          const newReportTextEl = document.getElementById('report-count');
          if (newReportTextEl) {
            window.__upNepaAnimating = true;
            const oldText = `Reported by ${oldReportCount} ${oldReportCount === 1 ? 'person' : 'people'}`;
            const newText = `Reported by ${newReportCount} ${newReportCount === 1 ? 'person' : 'people'}`;
            newReportTextEl.innerHTML = `<span class="roll-up-wrapper"><span class="roll-up-inner roll-up-anim"><span style="color:transparent;">${newText}</span><span style="position:absolute;top:0;">${oldText}</span><span style="position:absolute;top:100%;">${newText}</span></span></span>`;
            
            setTimeout(() => {
              const el = document.getElementById('report-count');
              if (el) el.innerHTML = newText;
              window.__upNepaAnimating = false;
            }, 400);
          }
        }
      }
    }

    // 3. Other containers (these don't flicker objectionably or don't have interactions that interrupt)
    const nearbyContainer = document.getElementById('nearby-areas-container');
    if (nearbyContainer) nearbyContainer.innerHTML = renderNearbyAreas(nearbyStatuses);

    const predictionContainer = document.getElementById('prediction-container');
    if (predictionContainer) predictionContainer.innerHTML = renderPrediction(areaStatus);
    
    const streakContainer = document.getElementById('streak-banner-container');
    if (streakContainer) streakContainer.innerHTML = renderStreakBanner(streak);
    
    const drawerContainer = document.getElementById('drawer-container');
    if (drawerContainer) {
      drawerContainer.innerHTML = renderNotificationDrawer(notifications);
      bindNotificationDrawer();
    }

    // Re-bind report buttons since container was potentially updated
    bindReportButtons();
  }

  // Initial render
  if (isInitialRender) {
    renderFull();
    isInitialRender = false;
  } else {
    updateGranular();
  }

  // Subscribe to state changes for re-renders
  unsubscribe = subscribe(() => {
    updateGranular();
  });

  // Re-render every 30 seconds to update relative timestamps
  timeUpdateInterval = setInterval(() => {
    updateGranular();
  }, 30000);

  // Listen for PWA install state changes
  if (!pwaEventsBound) {
    window.addEventListener('pwa-install-ready', () => { isInitialRender = true; renderHome(container); });
    window.addEventListener('pwa-install-done', () => { isInitialRender = true; renderHome(container); });
    pwaEventsBound = true;
  }

  return () => {
    if (unsubscribe) unsubscribe();
    if (timeUpdateInterval) clearInterval(timeUpdateInterval);
    isInitialRender = true;
  };
}

function renderInstallBanner() {
  const dismissedAt = localStorage.getItem('installBannerDismissedAt');
  if (dismissedAt) {
    const daysSinceDismissed = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
    // Hide if dismissed less than 7 days ago
    if (daysSinceDismissed < 7) {
      return '';
    }
  }

  if (!deferredPrompt) return '';
  
  return `
    <div class="install-banner" id="pwa-install-banner" style="position: relative;">
      <button class="btn-dismiss-install" id="btn-dismiss-install" aria-label="Dismiss" style="position: absolute; top: 4px; right: 4px; background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 4px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
      <div class="install-banner-content">
        <span class="install-icon">📱</span>
        <div class="install-text">
          <strong>Install Up NEPA</strong>
          <span>Add to homescreen for easy access</span>
        </div>
      </div>
      <button class="btn btn-primary btn-sm" id="btn-install-pwa">Install</button>
    </div>
  `;
}

/**
 * Render the app header.
 */
function renderHeader(unreadCount = 0) {
  const badgeHtml = unreadCount > 0 ? `<div class="notif-badge"></div>` : '';

  return `
    <header class="header" role="banner">
      <div class="header-logo">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M13 2L3 14h9l-1 10 10-12h-9l1-10z"/>
        </svg>
        <span class="header-logo-text">Up NEPA</span>
        <div class="live-indicator" id="live-indicator-dot" style="display: none;"></div>
      </div>
      <div class="header-actions">
        <button class="header-btn" id="btn-notif" aria-label="Notifications" title="Notifications">
          ${badgeHtml}
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

/**
 * Render the collapsed analytics banner.
 */
function renderCollapsedAnalytics() {
  return `
    <div id="collapsed-analytics-banner" class="card" style="margin-bottom: var(--space-lg); padding: var(--space-base); display: flex; flex-direction: column; gap: 4px; cursor: pointer; transition: transform 0.2s, background 0.2s;">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 1.2rem;">📊</span>
          <span id="collapsed-supply-text" style="font-weight: 600; font-size: 0.95rem;">Today: 0.0h supply</span>
          <span id="collapsed-supply-trend" style="color: var(--text-muted); font-size: 0.8rem; margin-left: 4px;"></span>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted);"><polyline points="9 18 15 12 9 6"/></svg>
      </div>
      <div style="font-size: 0.75rem; color: var(--text-muted); text-align: center;">(tap to expand full dashboard)</div>
    </div>
  `;
}

/**
 * Fetch and update the collapsed analytics banner.
 */
async function fetchCollapsedAnalytics(user) {
  if (!user || !user.areaId) return;

  try {
    const patterns = await getAreaPatterns(user.areaId);
    if (!patterns || patterns.length === 0) return;

    const todayDow = new Date().getDay();
    const todayPattern = patterns.find(p => p.day_of_week === todayDow);

    const supplyText = document.getElementById('collapsed-supply-text');
    const trendText = document.getElementById('collapsed-supply-trend');
    
    if (todayPattern && todayPattern.avg_duration_on != null && supplyText) {
      supplyText.textContent = `Today: ${todayPattern.avg_duration_on.toFixed(1)}h supply`;
      if (trendText) {
        trendText.textContent = `(${todayPattern.sample_size} reports)`;
      }
    }
  } catch (err) {
    console.error('Error fetching collapsed analytics:', err);
  }
}
