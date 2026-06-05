/* ======================================================
   UP NEPA — Router
   Simple hash-based SPA router
   ====================================================== */

const routes = {};
let currentRoute = null;

/**
 * Register a route handler.
 * @param {string} path - Route path (e.g., '/home', '/onboarding')
 * @param {Function} handler - Function called when route is active. Receives the app container.
 */
export function route(path, handler) {
  routes[path] = handler;
}

/**
 * Navigate to a route.
 * @param {string} path - Route path
 */
export function navigate(path) {
  window.location.hash = path;
}

/**
 * Get the current route path.
 */
export function getCurrentRoute() {
  return currentRoute;
}

/**
 * Start the router — listen for hash changes and render initial route.
 */
export function startRouter() {
  function handleRoute() {
    const hash = window.location.hash.slice(1) || '/home';
    const app = document.getElementById('app');

    if (!app) return;

    // Find matching route
    const handler = routes[hash];
    if (handler) {
      currentRoute = hash;
      handler(app);
    } else {
      // Default fallback
      const fallback = routes['/home'] || Object.values(routes)[0];
      if (fallback) {
        currentRoute = '/home';
        fallback(app);
      }
    }
  }

  window.addEventListener('hashchange', handleRoute);
  handleRoute(); // Initial render
}
