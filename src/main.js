/* ======================================================
   UP NEPA — Main Entry Point
   ====================================================== */

import { route, startRouter, navigate } from './js/router.js';
import { initStore, hasUser, getUser } from './js/data/store.js';
import { savePushSubscription } from './js/data/supabase.js';
import { renderOnboarding } from './js/onboarding.js';
import { renderHome } from './js/home.js';
import { renderSettings } from './js/settings.js';

// VAPID public key for push subscriptions
const VAPID_PUBLIC_KEY = 'BKXqYTbpcV_N6bhsaNQVxefW-j9jWDZdrPuf3wapR2yG4V4A5UimHAOBhPmPS_mK0irE0zfKUBdanWiQDLfIGPU';

// ── PWA Install ─────────────────────────────────────
export let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // Notify UI that install is available
  window.dispatchEvent(new Event('pwa-install-ready'));
});

export async function triggerAppInstall() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  // Notify UI to hide install button
  window.dispatchEvent(new Event('pwa-install-done'));
}

// ── Initialize ──────────────────────────────────────

async function init() {
  console.log('⚡ Up NEPA — Starting...');

  // Initialize data store (loads from localStorage + fetches from Supabase)
  await initStore();

  // Register routes
  route('/onboarding', renderOnboarding);
  route('/home', renderHome);
  route('/settings', renderSettings);

  // Determine initial route
  if (!hasUser()) {
    navigate('/onboarding');
  } else {
    const hash = window.location.hash.slice(1);
    if (!hash || hash === '/onboarding') {
      navigate('/home');
    }
  }

  // Start the router
  startRouter();

  // Register service worker (non-blocking)
  registerServiceWorker();

  // Render connection status UI
  renderConnectionStatus();

  console.log('⚡ Up NEPA — Ready!');
}

// ── Service Worker Registration ─────────────────────

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('[Up NEPA] Service workers not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    console.log('[Up NEPA] Service worker registered:', registration.scope);

    // If user exists and has granted notification permission, subscribe to push
    const user = getUser();
    if (user && Notification.permission === 'granted') {
      await subscribeToPush(registration, user);
    }
  } catch (err) {
    console.error('[Up NEPA] Service worker registration failed:', err);
  }
}

/**
 * Subscribe to Web Push and save the subscription to Supabase.
 */
export async function subscribeToPush(registration, user) {
  if (!registration || !user?.id) return;

  try {
    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Create new subscription
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
      console.log('[Up NEPA] Push subscription created');
    }

    // Save to Supabase
    const subJSON = subscription.toJSON();
    await savePushSubscription(user.id, subJSON);
    console.log('[Up NEPA] Push subscription saved to Supabase');

  } catch (err) {
    console.error('[Up NEPA] Push subscription failed:', err);
  }
}

/**
 * Convert a URL-safe base64 string to a Uint8Array (for applicationServerKey).
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function renderConnectionStatus() {
  const statusEl = document.createElement('div');
  statusEl.id = 'connection-status';
  statusEl.className = 'connection-status';
  document.body.appendChild(statusEl);

  let hideTimeout;

  function updateStatus() {
    if (!navigator.onLine) {
      statusEl.textContent = 'No Internet Connection';
      statusEl.className = 'connection-status offline active';
      clearTimeout(hideTimeout);
    } else {
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (conn && (conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g' || conn.downlink < 1)) {
        statusEl.textContent = 'Poor Connection (May be delayed)';
        statusEl.className = 'connection-status poor active';
        clearTimeout(hideTimeout);
      } else {
        if (statusEl.classList.contains('active')) {
          statusEl.textContent = 'Back Online';
          statusEl.className = 'connection-status online active';
          clearTimeout(hideTimeout);
          hideTimeout = setTimeout(() => {
            statusEl.classList.remove('active');
          }, 3000);
        }
      }
    }
  }

  window.addEventListener('online', updateStatus);
  window.addEventListener('offline', updateStatus);
  if (navigator.connection) {
    navigator.connection.addEventListener('change', updateStatus);
  }

  // Initial check
  updateStatus();
}

// ── Boot ────────────────────────────────────────────

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
