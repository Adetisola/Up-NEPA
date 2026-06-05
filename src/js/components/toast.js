/* ======================================================
   UP NEPA — Toast Component
   In-app feedback notifications
   ====================================================== */

const TOAST_DURATION = 3000; // ms

/**
 * Show a toast notification.
 * @param {string} message - The message to display
 * @param {'info'|'success'|'error'|'warning'} type - Toast type
 */
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warning: '⚠️',
  };

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  // Auto-remove after duration
  setTimeout(() => {
    toast.classList.add('toast-exit');
    toast.addEventListener('animationend', () => toast.remove());
  }, TOAST_DURATION);

  // Allow manual dismiss
  toast.addEventListener('click', () => {
    toast.classList.add('toast-exit');
    toast.addEventListener('animationend', () => toast.remove());
  });
}
