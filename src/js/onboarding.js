/* ======================================================
   UP NEPA — Onboarding Flow
   4-screen onboarding: Welcome → Area → Notifications → Done
   ====================================================== */

import { navigate } from './router.js';
import { signUpUser, signInUser, getState, getUser, isLocalLocked, unlockLocalSession, signOutUser, registerPasskey, signInWithPasskey } from './data/store.js';
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
  renderSetupPasskey,
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
        if (localStorage.getItem('upnepa_passkey_prompted') || (user && user.areaId)) {
          document.body.style.cursor = 'default';
          navigate('/home');
          return;
        }
        // If not prompted yet, fall through to currentScreen++ (renderSetupPasskey)
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

  if (currentScreen === 2) {
    // Setup Passkey Screen (Skip/Continue)
    localStorage.setItem('upnepa_passkey_prompted', 'true');
    const user = getState().user;
    if (user && user.areaId) {
      navigate('/home');
      return;
    }
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
          <input type="text" id="auth-name" placeholder="Your name" autocomplete="name" class="input" style="width: 100%; box-sizing: border-box;" value="${tempAuthName}">
          ` : ''}
          <input type="email" id="auth-email" placeholder="Email" autocomplete="email" class="input" style="width: 100%; box-sizing: border-box;" value="${tempAuthEmail}">
          
          <button type="submit" class="btn btn-primary btn-block btn-lg" id="btn-auth-submit">
            Continue
          </button>
          
          ${isSignInMode ? `
          <button type="button" class="btn btn-block btn-lg" id="btn-auth-passkey" style="background: var(--bg-card); color: var(--text-color); border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; gap: 10px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="M9 12a3 3 0 1 0 6 0 3 3 0 1 0-6 0"></path></svg>
            Sign in with Passkey
          </button>
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

// ── Screen 1c: Passkey Setup ────────────────────────────

function renderSetupPasskey() {
  return `
    <div class="onboarding" id="onboarding-screen">
      <div class="onboarding-content">
        <div class="onboarding-bolt">🛡️</div>
        <h1 class="onboarding-title">
          Enable Face ID / Touch ID
        </h1>
        <p class="onboarding-subtitle" style="margin-bottom: 30px;">
          Sign in instantly next time without typing your PIN.
        </p>
        <div class="onboarding-actions" style="display: flex; flex-direction: column; gap: 15px;">
          <button class="btn btn-primary btn-block btn-lg" id="btn-setup-passkey" style="display: flex; align-items: center; justify-content: center; gap: 10px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            Setup Passkey
          </button>
          
          <button class="btn btn-block btn-lg" id="btn-skip-passkey" style="background: transparent; color: var(--text-muted); box-shadow: none;">
            Skip for now
          </button>
        </div>
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
        
        <!-- State 1: Location Request -->
        <div id="area-step-location" style="display: flex; flex-direction: column; gap: 15px; text-align: center;">
          <p class="onboarding-subtitle" style="margin-bottom: 20px;">
            To find your area automatically, we need your location once. We don't store or track it.
          </p>
          <button class="btn btn-primary btn-block btn-lg" id="btn-allow-location" style="display: flex; align-items: center; justify-content: center; gap: 10px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>
            Allow Location
          </button>
          <button class="btn btn-block btn-lg" id="btn-enter-manually" style="background: transparent; color: var(--text-muted); box-shadow: none;">
            Enter Manually
          </button>
        </div>

        <!-- State 2: Manual / Geocoded Entry -->
        <div id="area-step-manual" style="display: none; flex-direction: column; gap: 15px; text-align: left;">
          <div>
            <label style="font-size: 0.8rem; color: var(--text-muted);">State</label>
            <div class="select-wrapper">
              <select class="select" id="state-select">
                <option value="" disabled selected>Choose state...</option>
                ${stateOptions}
                <option value="other">Other State (Coming Soon)</option>
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

          <div id="feeder-container" style="display: none; flex-direction: column; gap: 8px;">
            <label style="font-size: 0.8rem; color: var(--text-muted);">Select your feeder</label>
            <div class="custom-dropdown" id="feeder-dropdown">
              <div class="custom-dropdown-header" id="feeder-dropdown-header">
                <span>Select feeder...</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
              <div class="custom-dropdown-list" id="feeder-dropdown-list">
                <!-- Populated dynamically -->
              </div>
            </div>
            
            <!-- Bill Helper -->
            <div class="bill-helper" id="bill-helper-toggle">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              <span>Not sure? Check your IBEDC bill</span>
            </div>
            <div class="bill-helper-content" id="bill-helper-content" style="display: none;">
              <p>Look for the word <strong>FEEDER</strong> on your electricity bill to find your exact area name.</p>
              <div class="bill-mockup">
                <div class="bill-mockup-line">ACCOUNT NO: 123456789</div>
                <div class="bill-mockup-line highlight">FEEDER: MAGBORO I</div>
                <div class="bill-mockup-line">TARIFF: R2</div>
              </div>
            </div>
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

  const btnAuthPasskey = document.getElementById('btn-auth-passkey');
  if (btnAuthPasskey) {
    btnAuthPasskey.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await signInWithPasskey();
        navigate('/home');
      } catch (err) {
        console.error(err);
        alert('Passkey sign in failed or was cancelled.');
      }
    });
  }

  // Screen 1c: Passkey Setup
  const btnSetupPasskey = document.getElementById('btn-setup-passkey');
  if (btnSetupPasskey) {
    btnSetupPasskey.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await registerPasskey();
        alert('Passkey successfully registered!');
        nextScreen(container);
      } catch (err) {
        console.error(err);
        alert('Failed to register passkey. You can try again later in Settings.');
      }
    });
  }

  const btnSkipPasskey = document.getElementById('btn-skip-passkey');
  if (btnSkipPasskey) {
    btnSkipPasskey.addEventListener('click', (e) => {
      e.preventDefault();
      nextScreen(container);
    });
  }

  // Screen 2: Area Selection
  const stepLocation = document.getElementById('area-step-location');
  const stepManual = document.getElementById('area-step-manual');
  const btnAllowLocation = document.getElementById('btn-allow-location');
  const btnEnterManually = document.getElementById('btn-enter-manually');
  
  const stateSelect = document.getElementById('state-select');
  const citySelect = document.getElementById('city-select');
  const feederContainer = document.getElementById('feeder-container');
  const feederDropdownHeader = document.getElementById('feeder-dropdown-header');
  const feederDropdownList = document.getElementById('feeder-dropdown-list');
  const billHelperToggle = document.getElementById('bill-helper-toggle');
  const billHelperContent = document.getElementById('bill-helper-content');
  const btnAreaNext = document.getElementById('btn-area-next');
  
  if (stepLocation && stepManual) {
    const areas = getState().areas;
    
    // --- Location Logic ---
    btnEnterManually.addEventListener('click', (e) => {
      e.preventDefault();
      stepLocation.style.display = 'none';
      stepManual.style.display = 'flex';
    });

    btnAllowLocation.addEventListener('click', (e) => {
      e.preventDefault();
      btnAllowLocation.disabled = true;
      btnAllowLocation.innerHTML = '<span class="loader"></span> Detecting...';
      
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        btnEnterManually.click();
        return;
      }
      
      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          // Use OpenStreetMap Nominatim API (Free, no key required)
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`, {
            headers: {
              'Accept-Language': 'en'
            }
          });
          
          if (!res.ok) throw new Error('Geocoding request failed');
          
          const data = await res.json();
          console.log('[Up NEPA] OSM Geocoding Response:', data);
          
          let state = '';
          let city = '';
          
          if (data && data.address) {
            state = data.address.state ? data.address.state.replace(' State', '') : '';
            // Try to find the most accurate city-like boundary
            city = data.address.city || data.address.town || data.address.county || '';
            console.log('[Up NEPA] Detected Location -> State:', state, 'City:', city);
          }

          // Move to manual screen and pre-fill
          stepLocation.style.display = 'none';
          stepManual.style.display = 'flex';
          
          if (state && Array.from(stateSelect.options).some(opt => opt.value === state)) {
            stateSelect.value = state;
            stateSelect.dispatchEvent(new Event('change'));
            
            // Wait a tick for city to populate
            setTimeout(() => {
              // OSM might return slightly different names, e.g., "Obafemi Owode" for Magboro.
              // For MVP, if it matches exactly, select it.
              if (city && Array.from(citySelect.options).some(opt => opt.value === city)) {
                citySelect.value = city;
                citySelect.dispatchEvent(new Event('change'));
              } else {
                console.log('[Up NEPA] City mismatch or outside coverage:', city);
                // Don't alert here; user can manually select the city if state matched
              }
            }, 50);
          } else {
            console.log('[Up NEPA] State mismatch or outside coverage:', state);
            alert('We detected a location outside our current coverage. Please select manually.');
          }
          
        } catch (err) {
          console.error(err);
          alert('Could not detect location. Please enter manually.');
          btnEnterManually.click();
        }
      }, (err) => {
        console.warn(err);
        btnEnterManually.click();
      }, { enableHighAccuracy: false, timeout: 20000, maximumAge: 0 });
    });

    // --- Dropdown Cascading Logic ---
    stateSelect.addEventListener('change', (e) => {
      const state = e.target.value;
      if (state === 'other') {
        alert('We are currently expanding to other states. Check back soon!');
        citySelect.disabled = true;
        feederContainer.style.display = 'none';
        btnAreaNext.disabled = true;
        return;
      }
      const cities = [...new Set(areas.filter(a => a.state === state).map(a => a.city))];
      citySelect.innerHTML = '<option value="" disabled selected>Choose city...</option>' + 
        cities.map(c => `<option value="${c}">${c}</option>`).join('') +
        '<option value="other">Other City (Coming Soon)</option>';
      citySelect.disabled = false;
      feederContainer.style.display = 'none';
      btnAreaNext.disabled = true;
    });
    
    citySelect.addEventListener('change', (e) => {
      const city = e.target.value;
      if (city === 'other') {
        alert('We are currently expanding to other cities. Check back soon!');
        feederContainer.style.display = 'none';
        btnAreaNext.disabled = true;
        return;
      }
      
      const state = stateSelect.value;
      const feeders = areas.filter(a => a.state === state && a.city === city);
      
      // Populate custom dropdown
      feederDropdownList.innerHTML = feeders.map(f => `
        <div class="custom-dropdown-item" data-id="${f.id}" data-name="${f.name}">
          <div style="font-weight: bold; color: var(--text-color);">${f.name}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">${f.streets?.join(', ') || ''}</div>
        </div>
      `).join('');
      
      feederDropdownHeader.querySelector('span').textContent = 'Select feeder...';
      selectedAreaId = null;
      btnAreaNext.disabled = true;
      feederContainer.style.display = 'flex';
      
      // Bind custom dropdown items
      feederDropdownList.querySelectorAll('.custom-dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
          feederDropdownList.querySelectorAll('.custom-dropdown-item').forEach(el => el.classList.remove('selected'));
          item.classList.add('selected');
          selectedAreaId = item.getAttribute('data-id');
          feederDropdownHeader.querySelector('span').textContent = item.getAttribute('data-name');
          feederDropdownList.classList.remove('open');
          btnAreaNext.disabled = false;
        });
      });
    });

    // Custom Dropdown Open/Close
    feederDropdownHeader.addEventListener('click', () => {
      feederDropdownList.classList.toggle('open');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!feederDropdownHeader.contains(e.target) && !feederDropdownList.contains(e.target)) {
        feederDropdownList.classList.remove('open');
      }
    });

    // Bill Helper Toggle
    billHelperToggle.addEventListener('click', () => {
      const isVisible = billHelperContent.style.display === 'block';
      billHelperContent.style.display = isVisible ? 'none' : 'block';
      billHelperToggle.classList.toggle('active', !isVisible);
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
