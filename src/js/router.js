import { renderHome } from './home.js';
import { renderOnboarding } from './onboarding.js';
import { renderSettings } from './settings.js';
import { renderMap } from './map.js';
import { renderAnalytics } from './analytics.js';

const routes = {};
let currentRoute = null;
let currentUnmount = null;

export function route(path, handler) {
  routes[path] = handler;
}

// Initialize routes immediately
route('/home', renderHome);
route('/onboarding', renderOnboarding);
route('/settings', renderSettings);
route('/map', renderMap);
route('/analytics', renderAnalytics);

export function navigate(path) {
  window.location.hash = path;
}

export function getCurrentRoute() {
  return currentRoute;
}

export function startRouter() {
  function handleRoute() {
    const hash = window.location.hash.slice(1) || '/home';
    const app = document.getElementById('app');
    const bottomNav = document.getElementById('bottom-nav');

    if (!app) return;

    if (hash === '/onboarding') {
      if (bottomNav) bottomNav.style.display = 'none';
    } else {
      if (bottomNav) bottomNav.style.display = 'flex';
      const tabName = hash.split('/')[1] || 'home';
      document.querySelectorAll('.nav-item').forEach(item => {
        if (item.dataset.tab === tabName) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });
    }

    const handler = routes[hash];
    let newUnmount = null;

    if (currentUnmount) { 
      currentUnmount(); 
      currentUnmount = null; 
    }

    if (handler) {
      currentRoute = hash;
      newUnmount = handler(app);
    } else {
      const fallback = routes['/home'] || Object.values(routes)[0];
      if (fallback) {
        currentRoute = '/home';
        newUnmount = fallback(app);
      }
    }

    if (newUnmount && typeof newUnmount === 'function') {
      currentUnmount = newUnmount;
    }
  }

  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}
