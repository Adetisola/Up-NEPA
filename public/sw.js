/* ======================================================
   UP NEPA — Service Worker
   Push notifications, notification actions, offline cache,
   and retry queue for failed reports
   ====================================================== */

const CACHE_NAME = 'upnepa-v1';
const SUPABASE_URL = 'https://hxfrhxspehkubocajzun.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4ZnJoeHNwZWhrdWJvY2FqenVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NzgxOTcsImV4cCI6MjA5NjI1NDE5N30._uDOtUW8Q3--l7Tp4g3SqxM8r7y2D9Hl5WwP0Mu9sYk';

// Files to cache for offline support
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
];

// ── Install ─────────────────────────────────────────

self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate ────────────────────────────────────────

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    ).then(() => {
      // Replay any queued reports
      replayRetryQueue();
      return self.clients.claim();
    })
  );
});

// ── Fetch (network-first with cache fallback) ───────

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Don't cache Supabase API calls or CDN scripts
  if (url.hostname !== self.location.hostname) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ── Push Notification ───────────────────────────────

self.addEventListener('push', (event) => {
  console.log('[SW] Push received');

  let data = {
    title: 'Up NEPA ⚡',
    body: 'Abi light dey your side?',
    areaId: null,
    userId: null,
    deviceId: null,
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  // Determine actions (use defaults if none provided in payload)
  const notificationActions = data.actions || [
    { action: 'report-on', title: '✅ YES it\'s up' },
    { action: 'report-off', title: '❌ NO it\'s out' },
  ];

  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/favicon.svg',
    vibrate: [100, 50, 100],
    tag: 'upnepa-status-check',
    renotify: true,
    requireInteraction: true,
    data: {
      areaId: data.areaId,
      userId: data.userId,
      deviceId: data.deviceId,
      url: '/',
    },
    actions: notificationActions,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ── Notification Click ──────────────────────────────

self.addEventListener('notificationclick', (event) => {
  const { action, notification } = event;
  const { areaId, userId, deviceId } = notification.data || {};

  notification.close();

  if (action === 'report-on' || action === 'report-off') {
    // User tapped YES or NO — submit report directly from SW
    const status = action === 'report-on' ? 'ON' : 'OFF';
    event.waitUntil(
      submitReportFromSW(userId, areaId, status, deviceId)
    );
  } else {
    // User tapped the notification body — open the app
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        // Focus existing tab if open
        for (const client of clients) {
          if (client.url.includes(self.location.origin)) {
            return client.focus();
          }
        }
        // Otherwise open new tab
        return self.clients.openWindow('/');
      })
    );
  }
});

// ── Submit Report from Service Worker ───────────────

async function submitReportFromSW(userId, areaId, status, deviceId) {
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Prefer': 'return=minimal',
  };

  if (deviceId) {
    headers['x-device-id'] = deviceId;
  }

  const body = JSON.stringify({
    user_id: userId,
    area_id: areaId,
    status: status,
  });

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/reports`, {
      method: 'POST',
      headers,
      body,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    console.log(`[SW] Report submitted: ${status} for area ${areaId}`);

    // Show confirmation notification
    await self.registration.showNotification('Up NEPA ⚡', {
      body: status === 'ON'
        ? 'Confirmed — light is up! Thanks 🙌'
        : 'Noted — light is out. Your area updated.',
      icon: '/icons/icon-192.svg',
      tag: 'upnepa-confirmation',
      silent: true,
    });

  } catch (err) {
    console.warn('[SW] Report failed, queuing for retry:', err);

    // Queue for retry
    await addToRetryQueue({ userId, areaId, status, deviceId, timestamp: Date.now() });

    // Show "will retry" notification
    await self.registration.showNotification('Up NEPA ⚡', {
      body: 'Report saved — we\'ll sync when you\'re back online.',
      icon: '/icons/icon-192.svg',
      tag: 'upnepa-retry',
      silent: true,
    });
  }
}

// ── Retry Queue (IndexedDB) ────────────────────────

const DB_NAME = 'upnepa-sw';
const STORE_NAME = 'retry-queue';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function addToRetryQueue(report) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add(report);
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
    db.close();
  } catch (err) {
    console.error('[SW] Failed to queue report:', err);
  }
}

async function replayRetryQueue() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const reports = await new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (reports.length === 0) {
      db.close();
      return;
    }

    console.log(`[SW] Replaying ${reports.length} queued reports...`);

    for (const report of reports) {
      try {
        await submitReportFromSW(
          report.userId,
          report.areaId,
          report.status,
          report.deviceId
        );
        // Remove from queue on success
        store.delete(report.id);
      } catch {
        // Leave in queue for next retry
        console.warn('[SW] Retry still failed for report:', report.id);
      }
    }

    db.close();
  } catch (err) {
    console.error('[SW] Failed to replay retry queue:', err);
  }
}

// ── Sync Event (Background Sync API) ────────────────

self.addEventListener('sync', (event) => {
  if (event.tag === 'upnepa-report-sync') {
    event.waitUntil(replayRetryQueue());
  }
});
