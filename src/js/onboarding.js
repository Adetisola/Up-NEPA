/* ======================================================
   UP NEPA — Onboarding Flow
   4-screen onboarding: Welcome → Area → Notifications → Done
   ====================================================== */

import { navigate } from './router.js';
import { signUpUser, signInUser, getState, getUser, isLocalLocked, unlockLocalSession, signOutUser } from './data/store.js';
import { subscribeToPush } from './utils/push.js';
import { resetPassword } from './data/supabase.js';

let currentScreen = 0;
let selectedAreaId = null;
let isSignInMode = false;
let isLocalUnlockMode = false;
let failedAttempts = 0;

let tempAuthEmail = '';
let tempAuthName = '';

const screens = [
  renderWelcome,
  renderPin,
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
  isLocalUnlockMode = isLocalLocked();
  renderScreen(container);
}

function renderScreen(container) {
  container.innerHTML = screens[currentScreen](container);
  renderDots(container);
  bindScreenEvents(container);
}

async function nextScreen(container) {
  if (currentScreen === 0) {
    if (isLocalUnlockMode) {
      const pin = document.getElementById('auth-pin').value;
      if (pin.length !== 4) {
        alert('PIN must be 4 digits.');
        return;
      }
      const success = await unlockLocalSession(pin);
      if (success) {
        failedAttempts = 0;
        navigate('/home');
      } else {
        failedAttempts++;
        if (failedAttempts >= 5) {
          alert('Too many incorrect attempts. You have been logged out.');
          await signOutUser();
          isLocalUnlockMode = false;
          failedAttempts = 0;
          renderScreen(container);
        } else {
          alert(`Incorrect PIN. ${5 - failedAttempts} attempts remaining.`);
          document.getElementById('auth-pin').value = '';
        }
      }
      return;
    }

    const email = document.getElementById('auth-email').value;
    const nameInput = document.getElementById('auth-name');
    
    if (!email) {
      alert('Email is required');
      return;
    }
    
    tempAuthEmail = email;
    if (!isSignInMode && nameInput) {
      tempAuthName = nameInput.value;
    }
    
    currentScreen++;
    renderScreen(container);
    return;
  }
  
  if (currentScreen === 1) {
    const pin = document.getElementById('auth-password').value;
    
    if (pin.length !== 4) {
      alert('PIN must be 4 digits.');
      return;
    }

    document.body.style.cursor = 'wait';
    try {
      if (isSignInMode) {
        await signInUser(tempAuthEmail, pin);
        const user = getState().user;
        if (user && user.areaId) {
          document.body.style.cursor = 'default';
          navigate('/home');
          return;
        }
      } else {
        const confirmPin = document.getElementById('auth-confirm-password').value;
        if (pin !== confirmPin) {
          alert('PINs do not match — try again');
          document.body.style.cursor = 'default';
          return;
        }
        // areaId will be updated later, pass null for now
        await signUpUser(tempAuthEmail, pin, tempAuthName, null);
      }
    } catch (e) {
      if (e.message.toLowerCase().includes('rate limit')) {
        alert('Supabase rate limit exceeded. Since we bypassed email verification, just use a fake email (like timi123@test.com) to test, or click "Already have one? Sign in" below if your account is already created!');
      } else {
        alert(e.message);
      }
      document.body.style.cursor = 'default';
      return;
    }
    document.body.style.cursor = 'default';
  }

  if (currentScreen < screens.length - 1) {
    currentScreen++;
    renderScreen(container);
  }
}

// ── Screen 1: Welcome ──────────────────────────────

function renderWelcome() {
  if (isLocalUnlockMode) {
    const savedEmail = localStorage.getItem('upnepa_saved_email') || 'User';
    return `
      <div class="onboarding" id="onboarding-screen">
        <div class="onboarding-content">
          <div class="onboarding-bolt">👋</div>
          <h1 class="onboarding-title">
            Welcome back
          </h1>
          <p class="onboarding-subtitle">
            ${savedEmail}
          </p>
          <form class="onboarding-actions" id="auth-form" style="display: flex; flex-direction: column; gap: 15px;">
            <label style="font-size: 0.9rem; color: var(--text-muted); text-align: left;">Enter your PIN</label>
            <input type="password" id="auth-pin" placeholder="••••" autocomplete="current-password" class="input" style="width: 100%; box-sizing: border-box; text-align: center; font-size: 2rem; letter-spacing: 0.5em;" maxlength="4" inputmode="numeric" pattern="[0-9]*">
            
            <button type="submit" class="btn btn-primary btn-block btn-lg" id="btn-auth-submit">
              Unlock
            </button>

            <a href="#" id="btn-logout" style="color: var(--text-muted); font-size: 0.8rem; text-decoration: underline; margin-top: 10px;">Not you? Sign out</a>
          </form>
        </div>
      </div>
    `;
  }

  return `
    <div class="onboarding" id="onboarding-screen">
      <div class="onboarding-content">
        <div class="onboarding-bolt">⚡</div>
        <h1 class="onboarding-title">
          ${isSignInMode ? 'Sign in' : 'Create your account'}
        </h1>
        <p class="onboarding-subtitle">
          ${isSignInMode ? 'Welcome back.' : 'Join the community.'}
        </p>
        <form class="onboarding-actions" id="auth-form" style="display: flex; flex-direction: column; gap: 15px;">
          ${!isSignInMode ? `
          <input type="text" id="auth-name" placeholder="Display name" autocomplete="name" class="input" style="width: 100%; box-sizing: border-box;" value="${tempAuthName}">
          ` : ''}
          <input type="email" id="auth-email" placeholder="Email" autocomplete="email" class="input" style="width: 100%; box-sizing: border-box;" value="${tempAuthEmail}">
          
          <button type="submit" class="btn btn-primary btn-block btn-lg" id="btn-auth-submit">
            Continue
          </button>
          
          ${isSignInMode ? `
          <a href="#" id="btn-forgot-password" style="color: var(--text-muted); font-size: 0.8rem; text-decoration: underline;">Forgot PIN?</a>
          <a href="#" id="btn-toggle-auth" style="color: var(--text-muted); font-size: 0.8rem; text-decoration: underline; margin-top: 10px;">Create an account instead</a>
          ` : `
          <a href="#" id="btn-toggle-auth" style="color: var(--text-muted); font-size: 0.8rem; text-decoration: underline; margin-top: 10px;">Already have one? Sign in</a>
          `}
        </form>
      </div>
    </div>
  `;
}

// ── Screen 1b: PIN Creation/Entry ────────────────────────

function renderPin() {
  return `
    <div class="onboarding" id="onboarding-screen">
      <div class="onboarding-content">
        <div class="onboarding-bolt">🔐</div>
        <h1 class="onboarding-title">
          ${isSignInMode ? 'Enter your PIN' : 'Secure your account'}
        </h1>
        <p class="onboarding-subtitle">
          ${isSignInMode ? 'Welcome back.' : 'Create a 4-digit PIN for quick access.'}
        </p>
        <form class="onboarding-actions" id="auth-form" style="display: flex; flex-direction: column; gap: 15px;">
          <label style="font-size: 0.8rem; color: var(--text-muted); text-align: left; margin-bottom: -10px;">${isSignInMode ? 'PIN' : 'Create your PIN (4 digits)'}</label>
          <input type="password" id="auth-password" placeholder="••••" autocomplete="${isSignInMode ? 'current-password' : 'new-password'}" class="input" style="width: 100%; box-sizing: border-box; text-align: center; font-size: 1.5rem; letter-spacing: 0.5em;" maxlength="4" inputmode="numeric" pattern="[0-9]*" autofocus>
          
          ${!isSignInMode ? `
          <label style="font-size: 0.8rem; color: var(--text-muted); text-align: left; margin-bottom: -10px;">Confirm your PIN</label>
          <input type="password" id="auth-confirm-password" placeholder="••••" autocomplete="new-password" class="input" style="width: 100%; box-sizing: border-box; text-align: center; font-size: 1.5rem; letter-spacing: 0.5em;" maxlength="4" inputmode="numeric" pattern="[0-9]*">
          ` : ''}

          <button type="submit" class="btn btn-primary btn-block btn-lg" id="btn-auth-submit">
            ${isSignInMode ? 'Sign In' : 'Create Account'}
          </button>
          
          <button type="button" class="btn btn-block btn-lg" id="btn-auth-back" style="background: transparent; color: var(--text-muted); box-shadow: none;">
            Back
          </button>
        </form>
      </div>
    </div>
  `;
}

// ── Screen 2: Area Selection ────────────────────────

function renderAreaSelect() {
  const areas = getState().areas;
  const states = [...new Set(areas.map(a => a.state))];
  
  const stateOptions = states.map(s => `<option value="${s}">${s}</option>`).join('');

  return `
    <div class="onboarding" id="onboarding-screen">
      <div class="onboarding-content">
        <div class="onboarding-bolt">📍</div>
        <h1 class="onboarding-title">Find your area</h1>
        <div class="onboarding-actions" style="display: flex; flex-direction: column; gap: 15px; text-align: left;">
          <div>
            <label style="font-size: 0.8rem; color: var(--text-muted);">State</label>
            <div class="select-wrapper">
              <select class="select" id="state-select">
                <option value="" disabled selected>Choose state...</option>
                ${stateOptions}
              </select>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>
          
          <div>
            <label style="font-size: 0.8rem; color: var(--text-muted);">City / Town</label>
            <div class="select-wrapper">
              <select class="select" id="city-select" disabled>
                <option value="" disabled selected>Choose city...</option>
              </select>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>

          <div id="feeder-container" style="display: none; max-height: 200px; overflow-y: auto; background: var(--surface-light); padding: 10px; border-radius: 8px;">
            <label style="font-size: 0.8rem; color: var(--text-muted); display: block; margin-bottom: 10px;">Feeder</label>
            <div id="feeder-list" style="display: flex; flex-direction: column; gap: 10px;"></div>
          </div>

          <button class="btn btn-primary btn-block btn-lg" id="btn-area-next" disabled style="margin-top: 10px;">
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
  return `
    <div class="onboarding" id="onboarding-screen">
      <div class="onboarding-content">
        <div class="onboarding-bolt">🎉</div>
        <h1 class="onboarding-title">You're In</h1>
        <p class="onboarding-subtitle">
          Your area is set up. Start reporting to help your neighbours
          and build your streak.
        </p>
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
  // Screen 1: Welcome
  const authForm = document.getElementById('auth-form');
  if (authForm) {
    authForm.addEventListener('submit', (e) => {
      e.preventDefault();
      nextScreen(container);
    });
  }
  
  const btnToggleAuth = document.getElementById('btn-toggle-auth');
  if (btnToggleAuth) {
    btnToggleAuth.addEventListener('click', (e) => {
      e.preventDefault();
      isSignInMode = !isSignInMode;
      renderScreen(container);
    });
  }
  
  const btnForgotPassword = document.getElementById('btn-forgot-password');
  if (btnForgotPassword) {
    btnForgotPassword.addEventListener('click', async (e) => {
      e.preventDefault();
      const email = document.getElementById('auth-email').value;
      if (!email) return alert('Enter your email first');
      await resetPassword(email);
      alert('Password reset email sent');
    });
  }

  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', async (e) => {
      e.preventDefault();
      await signOutUser();
      isLocalUnlockMode = false;
      renderScreen(container);
    });
  }

  const btnAuthBack = document.getElementById('btn-auth-back');
  if (btnAuthBack) {
    btnAuthBack.addEventListener('click', (e) => {
      e.preventDefault();
      if (currentScreen > 0) {
        currentScreen--;
        renderScreen(container);
      }
    });
  }

  // Screen 2: Area Selection
  const stateSelect = document.getElementById('state-select');
  const citySelect = document.getElementById('city-select');
  const feederContainer = document.getElementById('feeder-container');
  const feederList = document.getElementById('feeder-list');
  const btnAreaNext = document.getElementById('btn-area-next');
  
  if (stateSelect && citySelect) {
    const areas = getState().areas;
    
    stateSelect.addEventListener('change', (e) => {
      const state = e.target.value;
      const cities = [...new Set(areas.filter(a => a.state === state).map(a => a.city))];
      citySelect.innerHTML = '<option value="" disabled selected>Choose city...</option>' + 
        cities.map(c => `<option value="${c}">${c}</option>`).join('');
      citySelect.disabled = false;
      feederContainer.style.display = 'none';
      btnAreaNext.disabled = true;
    });
    
    citySelect.addEventListener('change', (e) => {
      const city = e.target.value;
      const state = stateSelect.value;
      const feeders = areas.filter(a => a.state === state && a.city === city);
      
      feederList.innerHTML = feeders.map(f => `
        <label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer;">
          <input type="radio" name="feeder" value="${f.id}" style="margin-top: 4px;">
          <div>
            <div style="font-weight: bold;">${f.name}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${f.streets?.join(', ') || ''}</div>
          </div>
        </label>
      `).join('');
      
      feederContainer.style.display = 'block';
      
      feederList.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
          selectedAreaId = e.target.value;
          btnAreaNext.disabled = false;
        });
      });
    });
    
    btnAreaNext.addEventListener('click', async () => {
      if (selectedAreaId) {
        import('./data/store.js').then(async m => {
          await m.updateUserArea(selectedAreaId);
        });
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
