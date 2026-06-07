/* ======================================================
   UP NEPA — Reactive Store
   Supabase-backed with localStorage fallback
   ====================================================== */

import {
  initSupabase,
  isSupabaseReady,
  setDeviceId,
  fetchAreas,
  fetchAreaStatuses,
  getOrCreateUser as sbGetOrCreateUser,
  submitReport as sbSubmitReport,
  updateUser as sbUpdateUser,
  subscribeToAllAreaStatuses,
  fetchNotifications,
  markAllNotificationsAsRead,
  subscribeToNotifications,
} from './supabase.js';
import { generateFingerprint, generateRecoveryCode } from '../utils/fingerprint.js';

const STORAGE_KEY_USER = 'upnepa_user';
const STORAGE_KEY_STREAK = 'upnepa_streak';
const STORAGE_KEY_LAST_REPORT = 'upnepa_last_report';
const STORAGE_KEY_THEME = 'upnepa_theme';

// ── Internal state ──────────────────────────────────
let state = {
  user: null,         // { id, deviceId, areaId, streak, lastReported, ... }
  areas: [],          // Array of area objects
  statuses: {},       // areaId → status object
  reports: [],        // user's report history
  theme: 'dark',      // current theme
  online: false,      // whether Supabase is connected
  initialized: false,
  notifications: [],  // User's notification history
  unreadCount: 0,     // Unread notifications count
};

const listeners = new Set();
let realtimeChannel = null;

// ── Public API ──────────────────────────────────────

export function getState() {
  return state;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach((fn) => fn(state));
}

function setState(updates) {
  state = { ...state, ...updates };
  notify();
}

// ── Initialization ──────────────────────────────────

export async function initStore() {
  // Load user from localStorage first (instant)
  const savedUser = localStorage.getItem(STORAGE_KEY_USER);
  if (savedUser) {
    try {
      state.user = JSON.parse(savedUser);
    } catch {
      state.user = null;
    }
  }

  // Load streak
  const savedStreak = localStorage.getItem(STORAGE_KEY_STREAK);
  if (savedStreak && state.user) {
    try {
      const streakData = JSON.parse(savedStreak);
      state.user.streak = streakData.count || 0;
      state.user.streakLastDate = streakData.lastDate || null;
    } catch {
      // ignore
    }
  }

  // Load theme
  const savedTheme = localStorage.getItem(STORAGE_KEY_THEME);
  if (savedTheme === 'light' || savedTheme === 'dark') {
    state.theme = savedTheme;
  }
  applyTheme(state.theme);

  // Try to connect to Supabase
  const deviceId = state.user?.deviceId || null;
  initSupabase(deviceId);

  if (isSupabaseReady()) {
    try {
      // 1. Fetch Areas
      const dbAreas = await fetchAreas();
      if (dbAreas && dbAreas.length > 0) {
        state.areas = dbAreas;
        state.online = true;
      }

      // 2. Fetch Area Statuses
      const dbStatuses = await fetchAreaStatuses();
      if (dbStatuses) {
        state.statuses = dbStatuses;
      }

      // 3. Fetch user notifications
      if (state.user?.id) {
        const notifs = await fetchNotifications(state.user.id);
        if (notifs) {
          state.notifications = notifs;
          state.unreadCount = notifs.filter(n => !n.is_read).length;
        }
      }

      // 4. Update user in DB if they exist locally
      if (state.user && state.user.deviceId && state.user.areaId) {
        // Ensure user exists in DB
        const dbUser = await sbGetOrCreateUser(state.user.deviceId, state.user.areaId);
        if (dbUser) {
          state.user.id = dbUser.id;
          state.user.lastReported = dbUser.last_reported;
        }
      }

      // Setup Realtime subscriptions
      setupRealtime();

    } catch (err) {
      console.warn('[Up NEPA] Supabase fetch failed', err);
    }
  }

  state.initialized = true;
  notify();
}

// ── Realtime ────────────────────────────────────────

function setupRealtime() {
  if (realtimeChannel) return;
  realtimeChannel = subscribeToAllAreaStatuses(updateAreaStatusLocal);

  // Subscribe to notifications
  if (state.user?.id) {
    subscribeToNotifications(state.user.id, handleNewNotification);
  }
}

function handleNewNotification(newNotif) {
  const updatedNotifs = [newNotif, ...state.notifications];
  // Keep only 30
  if (updatedNotifs.length > 30) updatedNotifs.pop();
  
  setState({
    notifications: updatedNotifs,
    unreadCount: updatedNotifs.filter(n => !n.is_read).length
  });
}

export function updateAreaStatusLocal(newStatus) {
  if (!newStatus || !newStatus.areaId) return;
  state.statuses = {
    ...state.statuses,
    [newStatus.areaId]: newStatus,
  };
  notify();
}

// ── User Management ─────────────────────────────────

export async function createUser(areaId) {
  const deviceId = await generateFingerprint();
  const recoveryCode = generateRecoveryCode();

  // Local user object
  const user = {
    deviceId,
    recoveryCode,
    areaId,
    streak: 0,
    streakLastDate: null,
    lastReported: null,
    createdAt: new Date().toISOString(),
  };

  // Try to create in Supabase
  if (isSupabaseReady()) {
    setDeviceId(deviceId);
    const dbUser = await sbGetOrCreateUser(deviceId, areaId, recoveryCode);
    if (dbUser) {
      user.id = dbUser.id; // Store the server-side UUID
      state.online = true;
    }
  }

  state.user = user;
  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));

  notify();
  return user;
}

export async function updateUserArea(areaId) {
  if (!state.user) return;
  state.user.areaId = areaId;
  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(state.user));

  // Sync to Supabase
  if (isSupabaseReady() && state.user.id) {
    await sbUpdateUser(state.user.id, { area_id: areaId });
  }

  notify();
}

export function hasUser() {
  return !!state.user;
}

export function getUser() {
  return state.user;
}

// ── Area Helpers ────────────────────────────────────

export function getArea(areaId) {
  return state.areas.find((a) => a.id === areaId);
}

export function getUserArea() {
  if (!state.user) return null;
  return getArea(state.user.areaId);
}

export function getUserAreaStatus() {
  if (!state.user) return null;
  return state.statuses[state.user.areaId] || null;
}

export function getNearbyStatuses() {
  if (!state.user) return [];
  return state.areas
    .filter((a) => a.id !== state.user.areaId)
    .map((a) => ({
      area: a,
      status: state.statuses[a.id] || {
        areaId: a.id,
        currentStatus: 'UNCONFIRMED',
        confidence: 0,
        reportCount: 0,
        lastUpdated: null,
      },
    }));
}

// ── Reports ─────────────────────────────────────────

export function getLastReport() {
  const saved = localStorage.getItem(STORAGE_KEY_LAST_REPORT);
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

export async function addReport(status) {
  if (!state.user) return null;

  const report = {
    id: `report-${Date.now()}`,
    userId: state.user.deviceId,
    areaId: state.user.areaId,
    status,
    createdAt: new Date().toISOString(),
  };

  // Optimistic update — update local state immediately
  state.reports = [report, ...state.reports];
  localStorage.setItem(STORAGE_KEY_LAST_REPORT, JSON.stringify(report));

  // Optimistic area status update
  const areaStatus = state.statuses[state.user.areaId];
  const newCount = (areaStatus?.reportCount || 0) + 1;
  
  let nextStatus = status;
  if (newCount < 3) {
    nextStatus = status === 'ON' ? 'LIKELY_ON' : 'LIKELY_OFF';
  }

  state.statuses = {
    ...state.statuses,
    [state.user.areaId]: {
      ...(areaStatus || {}),
      areaId: state.user.areaId,
      currentStatus: nextStatus,
      reportCount: newCount,
      lastUpdated: report.createdAt,
      confidence: Math.min(0.95, (areaStatus?.confidence || 0.5) + 0.08),
    },
  };

  state.user.lastReported = report.createdAt;
  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(state.user));

  notify();

  // Submit to Supabase (trigger will recalculate area_status properly)
  if (isSupabaseReady() && state.user.id) {
    try {
      const dbReport = await sbSubmitReport(
        state.user.id,
        state.user.areaId,
        status
      );
      if (dbReport) {
        report.id = dbReport.id; // Replace local ID with server ID
      }
    } catch (err) {
      console.warn('[Up NEPA] Report failed to sync — saved locally:', err);
      // Report is already in localStorage, will work offline
    }
  }

  return report;
}

// ── Streak ──────────────────────────────────────────

export function updateStreak() {
  if (!state.user) return;

  const today = new Date().toDateString();
  const streakData = {
    count: state.user.streak || 0,
    lastDate: state.user.streakLastDate || null,
  };

  if (streakData.lastDate === today) {
    return streakData.count;
  }

  const yesterday = new Date(Date.now() - 86400000).toDateString();

  if (streakData.lastDate === yesterday) {
    streakData.count += 1;
  } else if (streakData.lastDate !== today) {
    streakData.count = 1;
  }

  streakData.lastDate = today;

  state.user.streak = streakData.count;
  state.user.streakLastDate = streakData.lastDate;

  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(state.user));
  localStorage.setItem(STORAGE_KEY_STREAK, JSON.stringify(streakData));

  // Sync streak to Supabase
  if (isSupabaseReady() && state.user.id) {
    sbUpdateUser(state.user.id, { streak: streakData.count }).catch(() => {});
  }

  notify();
  return streakData.count;
}

export function getStreakMilestone(count) {
  if (count >= 30) return "You're an Up NEPA legend for this area ⚡";
  if (count >= 7) return 'One week strong 🔥 Magboro thanks you';
  if (count >= 3) return "You're helping your whole street 🙌";
  return null;
}

// ── Staleness ───────────────────────────────────────

export function getStalenessLevel(lastUpdated) {
  if (!lastUpdated) return 'none';

  const age = Date.now() - new Date(lastUpdated).getTime();
  const minutes = age / (1000 * 60);

  if (minutes <= 90) return 'fresh';
  if (minutes <= 180) return 'fading';
  if (minutes <= 360) return 'stale';
  return 'none';
}

/**
 * Format a timestamp as a human-readable relative time.
 */
export function formatTimeAgo(timestamp) {
  if (!timestamp) return 'No data';

  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    return `${m}m ago`;
  }
  if (seconds < 86400) {
    const h = Math.floor(seconds / 3600);
    return `${h}h ago`;
  }
  const d = Math.floor(seconds / 86400);
  return `${d}d ago`;
}

// ── Theme ───────────────────────────────────────────

export function getTheme() {
  return state.theme;
}

export function toggleTheme() {
  const newTheme = state.theme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
  return newTheme;
}

export function setTheme(theme) {
  state.theme = theme;
  localStorage.setItem(STORAGE_KEY_THEME, theme);
  applyTheme(theme);
  notify();
}

function applyTheme(theme) {
  if (theme === 'light') {
    document.body.classList.add('light-theme');
  } else {
    document.body.classList.remove('light-theme');
  }
}

// ── Notifications ───────────────────────────────────

export function getUnreadCount() {
  return state.unreadCount;
}

export function getNotifications() {
  return state.notifications;
}

export async function clearUnreadNotifications() {
  if (state.unreadCount === 0) return;
  
  // Optimistic UI update
  const updatedNotifs = state.notifications.map(n => ({ ...n, is_read: true }));
  setState({
    notifications: updatedNotifs,
    unreadCount: 0
  });

  if (state.online && state.user?.id) {
    await markAllNotificationsAsRead(state.user.id);
  }
}
