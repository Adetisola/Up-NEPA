/* ======================================================
   UP NEPA — Reactive Store
   Supabase-backed with localStorage fallback
   ====================================================== */

import {
  initSupabase,
  isSupabaseReady,
  fetchAreas,
  fetchAreaStatuses,
  submitReport as sbSubmitReport,
  updateUser as sbUpdateUser,
  updateUserAreaRPC as sbUpdateUserAreaRPC,
  subscribeToAllAreaStatuses,
  fetchNotifications,
  markAllNotificationsAsRead,
  subscribeToNotifications,
  getSession,
  onAuthStateChange,
  signUp,
  signIn,
  signOut,
  registerPasskey,
  signInWithPasskey,
  getClient,
} from './supabase.js';
import { hashPin } from '../utils/crypto.js';

const STORAGE_KEY_USER = 'upnepa_user';
const STORAGE_KEY_STREAK = 'upnepa_streak';
const STORAGE_KEY_LAST_REPORT = 'upnepa_last_report';
const STORAGE_KEY_THEME = 'upnepa_theme';

// ── Internal state ──────────────────────────────────
let state = {
  user: null,         // { id, email, displayName, areaId, streak, lastReported, ... }
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
let isLocalLockActive = false; // Tracks if the PIN gate is active

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
  initSupabase();

  if (isSupabaseReady()) {
    const { data: { session } } = await getSession();
    if (session?.user) {
      // Create user object from auth session
      const meta = session.user.user_metadata || {};
      state.user = {
        id: session.user.id,
        email: session.user.email,
        displayName: meta.display_name,
        // areaId and streak will be populated later if needed, or fetched from profile
      };
      
      onAuthStateChange((event, newSession) => {
        if (event === 'SIGNED_OUT') {
          state.user = null;
          notify();
        } else if (newSession?.user) {
          const m = newSession.user.user_metadata || {};
          state.user = {
            id: newSession.user.id,
            email: newSession.user.email,
            displayName: m.display_name,
            areaId: state.user?.areaId
          };
          notify();
        }
      });
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

  // Streak and theme loading is kept intact below initStore's try block.
  // We'll skip deviceId injection here because initSupabase() handles it now.
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
      // Ensure we have profile data
      if (state.user?.id && isSupabaseReady()) {
        const { data: profile } = await getClient().from('users').select('*').eq('id', state.user.id).maybeSingle();
        if (profile) {
          state.user.areaId = profile.area_id;
          state.user.streak = profile.streak;
          state.user.changeCount = profile.change_count;
          state.user.lastAreaChange = profile.last_area_change;
        }
      }

      // Determine if local lock should be active
      if (state.user && localStorage.getItem('upnepa_pin_hash')) {
        const lastActive = localStorage.getItem('upnepa_last_active');
        const now = Date.now();
        const GRACE_PERIOD = 24 * 60 * 60 * 1000; // 24 hours
        
        if (lastActive && (now - parseInt(lastActive, 10)) < GRACE_PERIOD) {
          // Still within grace period, keep unlocked and renew timestamp
          isLocalLockActive = false;
          localStorage.setItem('upnepa_last_active', now.toString());
        } else {
          isLocalLockActive = true;
        }
      }

      // Setup Realtime subscriptions
      setupRealtime();

    } catch (err) {
      console.warn('[Up NEPA] Supabase fetch failed', err);
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

export async function signUpUser(email, pin, displayName, areaId) {
  if (!isSupabaseReady()) return null;
  const paddedPassword = `${pin}-UPNEPA`;
  const res = await signUp(email, paddedPassword, displayName, areaId, null);
  if (res.error) throw res.error;
  
  if (res.data?.user) {
    const hashed = await hashPin(pin);
    localStorage.setItem('upnepa_pin_hash', hashed);
    localStorage.setItem('upnepa_saved_email', email);
    localStorage.setItem('upnepa_last_active', Date.now().toString());

    state.user = {
      id: res.data.user.id,
      email: email,
      displayName: displayName,
      areaId: areaId,
      streak: 0,
      createdAt: new Date().toISOString()
    };
    notify();
    return state.user;
  }
  return null;
}

export async function signInUser(email, pin) {
  if (!isSupabaseReady()) return null;
  const paddedPassword = `${pin}-UPNEPA`;
  const res = await signIn(email, paddedPassword);
  if (res.error) throw res.error;
  
  if (res.data?.user) {
    const hashed = await hashPin(pin);
    localStorage.setItem('upnepa_pin_hash', hashed);
    localStorage.setItem('upnepa_saved_email', email);
    localStorage.setItem('upnepa_last_active', Date.now().toString());

    const meta = res.data.user.user_metadata || {};
    state.user = {
      id: res.data.user.id,
      email: res.data.user.email,
      displayName: meta.display_name,
    };

    // Fetch profile to see if they already have an area assigned
    const { getClient } = await import('./supabase.js');
    const { data: profile } = await getClient().from('users').select('*').eq('id', state.user.id).maybeSingle();
    
    if (profile) {
      state.user.areaId = profile.area_id;
      state.user.streak = profile.streak;
      state.user.changeCount = profile.change_count;
      state.user.lastAreaChange = profile.last_area_change;
    }

    notify();
    return state.user;
  }
  return null;
}

export async function signOutUser() {
  if (!isSupabaseReady()) return;
  await signOut();
  state.user = null;
  isLocalLockActive = false;
  localStorage.removeItem('upnepa_pin_hash');
  localStorage.removeItem('upnepa_saved_email');
  localStorage.removeItem('upnepa_last_active');
  notify();
}

export function isLocalLocked() {
  return isLocalLockActive;
}

export async function unlockLocalSession(pin) {
  const savedHash = localStorage.getItem('upnepa_pin_hash');
  if (!savedHash) {
    isLocalLockActive = false;
    localStorage.setItem('upnepa_last_active', Date.now().toString());
    return true;
  }
  const inputHash = await hashPin(pin);
  if (inputHash === savedHash) {
    isLocalLockActive = false;
    localStorage.setItem('upnepa_last_active', Date.now().toString());
    notify();
    return true;
  }
  return false;
}

export async function updateUserArea(areaId) {
  if (!state.user) return;
  
  // Sync to Supabase
  if (isSupabaseReady() && state.user.id) {
    await sbUpdateUserAreaRPC(areaId);
  }

  // Update local state after successful backend update
  state.user.areaId = areaId;
  state.user.streak = 0;
  state.user.changeCount = (state.user.changeCount || 0) + 1;
  state.user.lastAreaChange = new Date().toISOString();
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
    userId: state.user.id,
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
  if (status === 'ON' && areaStatus?.currentStatus !== 'ON') {
    nextStatus = 'LIKELY_ON'; // Backend enforces 10-min wait
  } else if (newCount < 3 && status !== 'ON') {
    nextStatus = 'LIKELY_OFF';
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

/**
 * Format hours into a human-readable string (e.g., "2h 12m")
 * @param {number} hours 
 * @returns {string} Formatted duration
 */
export function formatDuration(hours) {
  if (!hours) return '0m';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
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

export { registerPasskey, signInWithPasskey };
