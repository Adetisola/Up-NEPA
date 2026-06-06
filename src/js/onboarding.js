/* ======================================================
   UP NEPA — Onboarding Flow
   4-screen onboarding: Welcome → Area → Notifications → Done
   ====================================================== */

import { navigate } from './router.js';
import { createUser, getState, getUser } from './data/store.js';
import { subscribeToPush } from '../main.js';

let currentScreen = 0;
let selectedAreaId = null;

const screens = [
  renderWelcome,
  renderAreaSelect,
  renderNotifications,
  renderDone,
];

/**
 * Render the full onboarding flow into the app container.
 */
export function renderOnboarding(container) {
  currentScreen = 0;
  selectedAreaId = null;
  renderScreen(container);
}

function renderScreen(container) {
  container.innerHTML = screens[currentScreen](container);
  renderDots(container);
  bindScreenEvents(container);
}

async function nextScreen(container) {
  if (currentScreen === 2 && selectedAreaId) {
    // We are leaving the Notifications screen and entering the Done screen.
    // Create the user now so we can display the recovery code on the Done screen.
    const user = getUser();
    if (!user || !user.recoveryCode) {
      document.body.style.cursor = 'wait';
      await createUser(selectedAreaId);
      document.body.style.cursor = 'default';
    }
  }

  if (currentScreen < screens.length - 1) {
    currentScreen++;
    renderScreen(container);
  }
}

// ── Screen 1: Welcome ──────────────────────────────

function renderWelcome() {
  return `
    <div class="onboarding" id="onboarding-screen">
      <div class="onboarding-content">
        <div class="onboarding-bolt">⚡</div>
        <h1 class="onboarding-title">
          Welcome to <span class="brand">Up NEPA</span>
        </h1>
        <p class="onboarding-subtitle">
          Know when light is coming — before it arrives.
          Community-powered electricity status for Magboro.
        </p>
        <div class="onboarding-actions" style="display: flex; flex-direction: column; gap: 15px;">
          <button class="btn btn-primary btn-block btn-lg" id="btn-get-started">
            Get Started
          </button>
          
          <div id="restore-section" style="margin-top: 10px;">
            <a href="#" id="btn-show-restore" style="color: var(--text-muted); font-size: 0.8rem; text-decoration: underline;">Restore previous session</a>
            <div id="restore-form" style="display: none; margin-top: 15px;">
              <input type="text" id="restore-code-input" placeholder="e.g. MGB-4X9" class="input" style="text-align: center; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 10px;">
              <button class="btn btn-secondary btn-block" id="btn-restore-session">Restore</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ── Screen 2: Area Selection ────────────────────────

function renderAreaSelect() {
  const areas = getState().areas;
  const options = areas.map((area) =>
    `<option value="${area.id}">${area.city} — ${area.name}</option>`
  ).join('');

  return `
    <div class="onboarding" id="onboarding-screen">
      <div class="onboarding-content">
        <div class="onboarding-bolt">📍</div>
        <h1 class="onboarding-title">Where do you stay?</h1>
        <p class="onboarding-subtitle">
          Select your area so we can show you the right power status.
        </p>
        <div class="onboarding-actions">
          <div class="select-wrapper">
            <select class="select" id="area-select">
              <option value="" disabled selected>Choose your area...</option>
              ${options}
            </select>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
          <button class="btn btn-primary btn-block btn-lg" id="btn-area-next" disabled>
            Continue
          </button>
        </div>
      </div>
    </div>
  `;
}

// ── Screen 3: Notifications ─────────────────────────

function renderNotifications() {
  return `
    <div class="onboarding" id="onboarding-screen">
      <div class="onboarding-content">
        <div class="onboarding-bolt">🔔</div>
        <h1 class="onboarding-title">Stay in the loop</h1>
        <p class="onboarding-subtitle">
          We'll ping you twice a day — you just tap Yes or No. That's it.
        </p>

        <div class="notif-illustration">
          <div class="notif-mock">
            <div class="notif-mock-header">
              ⚡ Up NEPA
            </div>
            <div class="notif-mock-body">
              Abi light dey your side? Help your neighbours know 👀
            </div>
            <div class="notif-mock-actions">
              <div class="notif-mock-btn yes">YES it's up</div>
              <div class="notif-mock-btn no">NO it's out</div>
            </div>
          </div>
        </div>

        <div class="onboarding-actions">
          <button class="btn btn-primary btn-block btn-lg" id="btn-allow-notif">
            Allow Notifications
          </button>
          <button class="btn btn-ghost btn-block" id="btn-skip-notif">
            Maybe later
          </button>
        </div>
      </div>
    </div>
  `;
}

// ── Screen 4: Done ──────────────────────────────────

function renderDone() {
  const user = getUser();
  const recoveryCode = user?.recoveryCode || 'Loading...';

  return `
    <div class="onboarding" id="onboarding-screen">
      <div class="onboarding-content">
        <div class="onboarding-bolt">🎉</div>
        <h1 class="onboarding-title">You're all set!</h1>
        <p class="onboarding-subtitle">
          Your area is set up. Start reporting to help your neighbours
          and build your streak.
        </p>
        <div style="background: var(--surface-light); padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px dashed var(--border);">
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 5px;">Your Secret Recovery Code</p>
          <div style="font-size: 1.5rem; font-weight: 800; letter-spacing: 2px; color: var(--primary);">${recoveryCode}</div>
          <p style="font-size: 0.7rem; color: var(--text-muted); margin-top: 5px;">Save this code. You can use it to restore your profile and streak if you switch browsers.</p>
        </div>
        <div class="onboarding-actions">
          <button class="btn btn-primary btn-block btn-lg" id="btn-go-home">
            See Your Status →
          </button>
        </div>
      </div>
    </div>
  `;
}

// ── Progress Dots ───────────────────────────────────

function renderDots(container) {
  const screen = container.querySelector('#onboarding-screen');
  if (!screen) return;

  const dotsHTML = `
    <div class="progress-dots">
      ${screens.map((_, i) =>
        `<div class="progress-dot ${i === currentScreen ? 'active' : ''}"></div>`
      ).join('')}
    </div>
  `;

  const content = screen.querySelector('.onboarding-content');
  if (content) {
    content.insertAdjacentHTML('beforeend', dotsHTML);
  }
}

// ── Event Binding ───────────────────────────────────

function bindScreenEvents(container) {
  // Screen 1: Get Started
  const btnStart = document.getElementById('btn-get-started');
  if (btnStart) {
    btnStart.addEventListener('click', () => nextScreen(container));
  }
  
  const btnShowRestore = document.getElementById('btn-show-restore');
  const restoreForm = document.getElementById('restore-form');
  const btnRestore = document.getElementById('btn-restore-session');
  const restoreInput = document.getElementById('restore-code-input');
  
  if (btnShowRestore) {
    btnShowRestore.addEventListener('click', (e) => {
      e.preventDefault();
      restoreForm.style.display = 'block';
      btnShowRestore.style.display = 'none';
    });
  }
  
  if (btnRestore) {
    btnRestore.addEventListener('click', async () => {
      const code = restoreInput.value.trim().toUpperCase();
      if (!code) return;
      
      // In MVP, we would query Supabase for this code and restore device_id locally.
      // For now, just navigate to home (a real implementation would call restoreUser(code))
      alert('Session restore is a Phase 2 feature!');
    });
  }

  // Screen 2: Area Selection
  const areaSelect = document.getElementById('area-select');
  const btnAreaNext = document.getElementById('btn-area-next');
  if (areaSelect && btnAreaNext) {
    areaSelect.addEventListener('change', (e) => {
      selectedAreaId = e.target.value;
      btnAreaNext.disabled = !selectedAreaId;
    });
    btnAreaNext.addEventListener('click', () => {
      if (selectedAreaId) {
        nextScreen(container);
      }
    });
  }

  // Screen 3: Notifications
  const btnAllow = document.getElementById('btn-allow-notif');
  const btnSkip = document.getElementById('btn-skip-notif');
  if (btnAllow) {
    btnAllow.addEventListener('click', async () => {
      // Request notification permission
      if ('Notification' in window) {
        try {
          const result = await Notification.requestPermission();
          // If granted and SW is ready, subscribe to push
          if (result === 'granted' && 'serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.ready;
            const user = getUser();
            if (user && reg) {
              await subscribeToPush(reg, user);
            }
          }
        } catch {
          // Permission denied or not supported
        }
      }
      nextScreen(container);
    });
  }
  if (btnSkip) {
    btnSkip.addEventListener('click', () => nextScreen(container));
  }

  // Screen 4: Go Home
  const btnHome = document.getElementById('btn-go-home');
  if (btnHome) {
    btnHome.addEventListener('click', () => {
      navigate('/home');
    });
  }
}
