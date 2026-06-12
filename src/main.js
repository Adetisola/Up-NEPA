/* ======================================================
   UP NEPA — Main Entry Point
   ====================================================== */

import { inject } from '@vercel/analytics';
import { route, startRouter, navigate } from './js/router.js';
import { initStore, hasUser, getUser } from './js/data/store.js';
import { subscribeToPush } from './js/utils/push.js';
import { initPWA } from './js/utils/pwa.js';

// Initialize Vercel Analytics
inject();

// Initialize PWA logic
initPWA();

// ── Initialize ──────────────────────────────────────

async function init() {
  console.log('⚡ Up NEPA — Starting...');

  // Initialize data store (loads from localStorage + fetches from Supabase)
  await initStore();

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

// (Push logic moved to src/js/utils/push.js)

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
