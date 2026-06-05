import { formatTimeAgo, clearUnreadNotifications } from '../data/store.js';

/**
 * Render the notification drawer HTML
 */
export function renderNotificationDrawer(notifications) {
  return `
    <div class="drawer-overlay" id="notif-overlay"></div>
    <div class="notification-drawer" id="notif-drawer">
      <div class="drawer-handle"></div>
      
      <div class="drawer-header">
        <h2 class="drawer-title">Notifications</h2>
        <button class="drawer-close" id="btn-close-drawer" aria-label="Close notifications">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div class="drawer-content">
        ${notifications.length === 0 ? renderEmptyState() : renderList(notifications)}
      </div>
    </div>
  `;
}

function renderEmptyState() {
  return `
    <div class="notif-empty">
      <div class="notif-empty-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      </div>
      <p class="notif-empty-text">
        <strong>All caught up!</strong><br>
        We'll ping you when there's an update.
      </p>
    </div>
  `;
}

function renderList(notifications) {
  const items = notifications.map(notif => `
    <div class="notif-item ${!notif.is_read ? 'unread' : ''}">
      <div class="notif-item-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M13 2L3 14h9l-1 10 10-12h-9l1-10z"/>
        </svg>
        ${notif.title}
      </div>
      <div class="notif-item-body">${notif.body}</div>
      <div class="notif-item-time">${formatTimeAgo(notif.created_at)}</div>
    </div>
  `).join('');

  return `<div class="notif-list">${items}</div>`;
}

/**
 * Bind drawer open/close events
 */
export function bindNotificationDrawer() {
  const overlay = document.getElementById('notif-overlay');
  const drawer = document.getElementById('notif-drawer');
  const btnOpen = document.getElementById('btn-notif');
  const btnClose = document.getElementById('btn-close-drawer');

  function openDrawer() {
    if (!drawer || !overlay) return;
    overlay.classList.add('active');
    drawer.classList.add('active');
    // Mark as read when opening
    clearUnreadNotifications();
  }

  function closeDrawer() {
    if (!drawer || !overlay) return;
    overlay.classList.remove('active');
    drawer.classList.remove('active');
  }

  if (btnOpen) btnOpen.addEventListener('click', openDrawer);
  if (btnClose) btnClose.addEventListener('click', closeDrawer);
  if (overlay) overlay.addEventListener('click', closeDrawer);
}
