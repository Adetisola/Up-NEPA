/* ======================================================
   UP NEPA — Settings Screen
   Area change, notification toggle, about
   ====================================================== */

import { navigate } from './router.js';
import { getUser, getUserArea, updateUserArea, getTheme, toggleTheme, getState, signOutUser } from './data/store.js';
import { showToast } from './components/toast.js';
import { subscribeToPush } from './utils/push.js';

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

  // Cooldown calculation
  const changeCount = user?.changeCount || 0;
  let cooldownDays = 0;
  if (changeCount === 1) cooldownDays = 7;
  else if (changeCount === 2) cooldownDays = 30;
  else if (changeCount === 3) cooldownDays = 90;
  else if (changeCount >= 4) cooldownDays = 180;

  const nextTierCooldown = changeCount === 0 ? 7 : (changeCount === 1 ? 30 : (changeCount === 2 ? 90 : 180));

  let isCoolingDown = false;
  let remainingCooldown = 0;
  if (user?.lastAreaChange && cooldownDays > 0) {
    const lastChange = new Date(user.lastAreaChange);
    const now = new Date();
    const daysSince = Math.floor((now - lastChange) / (1000 * 60 * 60 * 24));
    if (daysSince < cooldownDays) {
      isCoolingDown = true;
      remainingCooldown = cooldownDays - daysSince;
    }
  }

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
            <select class="select" id="settings-area-select" ${isCoolingDown ? 'disabled' : ''}>
              ${areaOptions}
            </select>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
          ${isCoolingDown ? `
          <div style="font-size: 0.8rem; color: var(--amber); margin-top: 4px;">
            ⚠️ Area changes are currently locked. Next change available in ${remainingCooldown} days.
          </div>
          ` : `
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">
            Changing your area resets your streak.
          </div>
          `}
        </div>
      </div>

      <!-- Transparency Modal (hidden by default) -->
      <div id="area-change-modal" style="display: none; position: fixed; inset: 0; z-index: 999; background: rgba(0,0,0,0.8); align-items: center; justify-content: center; padding: var(--space-lg);">
        <div style="background: var(--bg-body); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: var(--space-lg); width: 100%; max-width: 320px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          <h3 style="font-size: 1.1rem; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Change Home Area
          </h3>
          <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 16px;">Before you continue:</p>
          <ul style="font-size: 0.9rem; color: var(--text); padding-left: 20px; margin-bottom: 24px; display: flex; flex-direction: column; gap: 12px;">
            <li>Your streak of <strong>🔥 ${user?.streak || 0} days</strong> will reset to zero.</li>
            <li>You won't be able to change your area again for <strong>${nextTierCooldown} days</strong>.</li>
          </ul>
          <div style="display: flex; gap: 12px;">
            <button class="btn" id="btn-cancel-area-change" style="flex: 1; background: var(--bg-surface); color: var(--text);">Cancel</button>
            <button class="btn btn-primary" id="btn-confirm-area-change" style="flex: 1;">Yes, Change</button>
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
        <div class="settings-group-label">Personal History & Metrics</div>
        <div class="settings-item">
          <span class="settings-item-label">Current streak</span>
          <span class="settings-item-value">${user?.streak || 0} days</span>
        </div>
        <div class="settings-item">
          <span class="settings-item-label">Total reports</span>
          <span class="settings-item-value">${getState().reports?.length || 0}</span>
        </div>
        <div class="settings-item">
          <span class="settings-item-label">Accuracy Score</span>
          <span class="settings-item-value" style="color: var(--green); font-weight: 600;">98%</span>
        </div>
        <div class="settings-item" style="flex-direction: column; align-items: flex-start; gap: 8px;">
          <a href="#" id="btn-show-transparency" style="font-size: 0.8rem; color: var(--primary); text-decoration: underline;">How are scores calculated?</a>
          <div id="transparency-info" style="display: none; background: var(--bg-surface); padding: 12px; border-radius: 8px; font-size: 0.85rem; color: var(--text-muted); line-height: 1.4; border: 1px solid var(--border);">
            <strong>Accuracy Score:</strong> Your score increases when your reports align with the majority of the community. It decreases if your reports consistently contradict the consensus. High accuracy helps predictions.
          </div>
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

      <button class="btn btn-ghost btn-block" id="btn-signout" style="margin-top: var(--space-xl); color: var(--amber);">
        Sign Out
      </button>

      <button class="btn btn-ghost btn-block" id="btn-reset" style="margin-top: var(--space-base); color: var(--red);">
        Delete Account Data
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

  // Transparency toggle
  const btnShowTransparency = document.getElementById('btn-show-transparency');
  const transparencyInfo = document.getElementById('transparency-info');
  if (btnShowTransparency && transparencyInfo) {
    btnShowTransparency.addEventListener('click', (e) => {
      e.preventDefault();
      transparencyInfo.style.display = transparencyInfo.style.display === 'none' ? 'block' : 'none';
    });
  }

  // Area change
  const areaSelect = document.getElementById('settings-area-select');
  const modal = document.getElementById('area-change-modal');
  const btnCancel = document.getElementById('btn-cancel-area-change');
  const btnConfirm = document.getElementById('btn-confirm-area-change');
  let pendingAreaId = null;

  if (areaSelect) {
    const originalAreaId = getUser()?.areaId;

    areaSelect.addEventListener('change', (e) => {
      const newAreaId = e.target.value;
      if (newAreaId !== originalAreaId) {
        pendingAreaId = newAreaId;
        modal.style.display = 'flex';
      }
    });

    if (btnCancel) {
      btnCancel.addEventListener('click', () => {
        areaSelect.value = originalAreaId; // Revert visually
        pendingAreaId = null;
        modal.style.display = 'none';
      });
    }

    if (btnConfirm) {
      btnConfirm.addEventListener('click', async () => {
        if (pendingAreaId) {
          modal.style.display = 'none';
          showToast('Updating area...', 'info');
          try {
            await updateUserArea(pendingAreaId);
            showToast('Area updated successfully', 'success');
            // Re-render settings to show new cooldown state
            renderSettings(document.getElementById('app'));
          } catch (err) {
            showToast(err.message || 'Failed to update area', 'error');
            areaSelect.value = originalAreaId; // Revert on failure
          }
        }
      });
    }
  }

  const btnInstallApp = document.getElementById('btn-install-app');
  if (btnInstallApp) {
    btnInstallApp.addEventListener('click', async () => {
      // Import triggerAppInstall dynamically to avoid circular dependency issues if any
      const { triggerAppInstall } = await import('./utils/pwa.js');
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

  // Sign out
  const btnSignOut = document.getElementById('btn-signout');
  if (btnSignOut) {
    btnSignOut.addEventListener('click', async () => {
      await signOutUser();
      window.location.hash = '/onboarding';
    });
  }

  // Reset
  const btnReset = document.getElementById('btn-reset');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (confirm('This will delete all your local data and sign you out. Are you sure?')) {
        signOutUser();
        localStorage.clear();
        window.location.hash = '';
        window.location.reload();
      }
    });
  }
}
