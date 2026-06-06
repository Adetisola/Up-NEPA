/* ======================================================
   UP NEPA — Settings Screen
   Area change, notification toggle, about
   ====================================================== */

import { navigate } from './router.js';
import { getUser, getUserArea, updateUserArea, getTheme, toggleTheme, getState } from './data/store.js';
import { showToast } from './components/toast.js';
import { subscribeToPush } from '../main.js';

/**
 * Render the settings screen.
 */
export function renderSettings(container) {
  const user = getUser();
  const area = getUserArea();

  const areaOptions = getState().areas.map((a) =>
    `<option value="${a.id}" ${a.id === user?.areaId ? 'selected' : ''}>${a.city} — ${a.name}</option>`
  ).join('');

  const notifPermission = 'Notification' in window
    ? Notification.permission
    : 'unsupported';

  const notifEnabled = notifPermission === 'granted';

  container.innerHTML = `
    <header class="header" role="banner">
      <button class="header-btn" id="btn-back" aria-label="Go back" title="Go back">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <span class="header-logo-text" style="font-size: var(--fs-md);">Settings</span>
      <div style="width: 40px;"></div>
    </header>

    <div class="settings">
      <div class="settings-group">
        <div class="settings-group-label">Your Area</div>
        <div class="settings-item" style="flex-direction: column; align-items: stretch; gap: var(--space-md);">
          <div class="select-wrapper">
            <select class="select" id="settings-area-select">
              ${areaOptions}
            </select>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>
      </div>

      <div class="settings-group">
        <div class="settings-group-label">Notifications</div>
        <div class="settings-item">
          <span class="settings-item-label">Push notifications</span>
          <div class="toggle ${notifEnabled ? 'active' : ''}" id="toggle-notif" role="switch" aria-checked="${notifEnabled}" tabindex="0"></div>
        </div>
        <div class="settings-item">
          <span class="settings-item-label">Morning check-in (6am)</span>
          <span class="settings-item-value">${notifEnabled ? 'Active' : 'Off'}</span>
        </div>
        <div class="settings-item">
          <span class="settings-item-label">Evening check-in (6pm)</span>
          <span class="settings-item-value">${notifEnabled ? 'Active' : 'Off'}</span>
        </div>
      </div>

      <div class="settings-group">
        <div class="settings-group-label">Appearance</div>
        <div class="settings-item">
          <span class="settings-item-label">Light Mode</span>
          <div class="toggle ${getTheme() === 'light' ? 'active' : ''}" id="toggle-theme" role="switch" aria-checked="${getTheme() === 'light'}" tabindex="0"></div>
        </div>
      </div>

      <div class="settings-group">
        <div class="settings-group-label">Your Stats</div>
        <div class="settings-item">
          <span class="settings-item-label">Current streak</span>
          <span class="settings-item-value">${user?.streak || 0} days</span>
        </div>
        <div class="settings-item">
          <span class="settings-item-label">Member since</span>
          <span class="settings-item-value">${user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' }) : 'Unknown'}</span>
        </div>
      </div>

      <div class="settings-group">
        <div class="settings-group-label">About</div>
        <div class="settings-item">
          <span class="settings-item-label">Version</span>
          <span class="settings-item-value">MVP v1.0</span>
        </div>
        <div class="settings-item">
          <span class="settings-item-label">Area</span>
          <span class="settings-item-value">Magboro, Ogun State</span>
        </div>
      </div>

      <div class="settings-group" id="settings-app-group">
        <div class="settings-group-label">App</div>
        <div class="settings-item" id="btn-install-app" style="cursor: pointer; justify-content: space-between;">
          <span class="settings-item-label" style="color: var(--amber);">Install App (Add to Home Screen)</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--amber);">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
          </svg>
        </div>
      </div>

      <button class="btn btn-ghost btn-block" id="btn-reset" style="margin-top: var(--space-xl); color: var(--red);">
        Reset App Data
      </button>
    </div>
  `;

  bindSettingsEvents();
}

function bindSettingsEvents() {
  // Back button
  const btnBack = document.getElementById('btn-back');
  if (btnBack) {
    btnBack.addEventListener('click', () => navigate('/home'));
  }

  // Area change
  const areaSelect = document.getElementById('settings-area-select');
  if (areaSelect) {
    areaSelect.addEventListener('change', async (e) => {
      const newAreaId = e.target.value;
      const user = getUser();
      if (newAreaId !== user?.areaId) {
        showToast('Updating area...', 'info');
        await updateUserArea(newAreaId);
        showToast('Area updated successfully', 'success');
      }
    });
  }

  const btnInstallApp = document.getElementById('btn-install-app');
  if (btnInstallApp) {
    btnInstallApp.addEventListener('click', async () => {
      // Import triggerAppInstall dynamically to avoid circular dependency issues if any
      const { triggerAppInstall } = await import('../main.js');
      try {
        await triggerAppInstall();
      } catch (err) {
        console.error('Install failed:', err);
        showToast('Could not open install prompt. You may need to install from browser menu.', 'error');
      }
    });
  }

  // Notification toggle
  const toggleNotif = document.getElementById('toggle-notif');
  if (toggleNotif) {
    toggleNotif.addEventListener('click', async () => {
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          showToast('Manage notifications in your browser settings', 'info');
        } else {
          try {
            const result = await Notification.requestPermission();
            if (result === 'granted') {
              toggleNotif.classList.add('active');
              toggleNotif.setAttribute('aria-checked', 'true');
              showToast('Notifications enabled! 🔔', 'success');
              
              if ('serviceWorker' in navigator) {
                const reg = await navigator.serviceWorker.ready;
                const user = getUser();
                if (user && reg) {
                  await subscribeToPush(reg, user);
                }
              }
            } else {
              showToast('Notifications blocked — check browser settings', 'warning');
            }
          } catch {
            showToast('Notifications not supported', 'error');
          }
        }
      } else {
        showToast('Notifications not supported on this browser', 'error');
      }
    });
  }

  // Theme toggle
  const toggleThemeEl = document.getElementById('toggle-theme');
  if (toggleThemeEl) {
    toggleThemeEl.addEventListener('click', () => {
      const newTheme = toggleTheme();
      const isLight = newTheme === 'light';
      if (isLight) {
        toggleThemeEl.classList.add('active');
        toggleThemeEl.setAttribute('aria-checked', 'true');
      } else {
        toggleThemeEl.classList.remove('active');
        toggleThemeEl.setAttribute('aria-checked', 'false');
      }
    });
  }

  // Reset
  const btnReset = document.getElementById('btn-reset');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (confirm('This will erase all your data. Are you sure?')) {
        localStorage.clear();
        window.location.hash = '';
        window.location.reload();
      }
    });
  }
}
