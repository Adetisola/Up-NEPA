/* ======================================================
   UP NEPA — Supabase Client
   Real Supabase integration via CDN global
   ====================================================== */

const SUPABASE_URL = 'https://hxfrhxspehkubocajzun.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4ZnJoeHNwZWhrdWJvY2FqenVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NzgxOTcsImV4cCI6MjA5NjI1NDE5N30._uDOtUW8Q3--l7Tp4g3SqxM8r7y2D9Hl5WwP0Mu9sYk';

let supabase = null;
let deviceId = null;

/**
 * Initialize the Supabase client.
 * Uses the global `supabase` object loaded from CDN.
 * Passes x-device-id header for anonymous RLS.
 */
export function initSupabase(currentDeviceId) {
  deviceId = currentDeviceId;

  if (!window.supabase) {
    console.warn('[Up NEPA] Supabase CDN not loaded — running in offline mode');
    return null;
  }

  const headers = {};
  if (deviceId) {
    headers['x-device-id'] = deviceId;
  }

  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers },
  });

  console.log('[Up NEPA] Supabase connected');
  return supabase;
}

/**
 * Update the device ID header after user creation.
 * Re-creates the client with the new header.
 */
export function setDeviceId(newDeviceId) {
  deviceId = newDeviceId;
  if (window.supabase) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { 'x-device-id': deviceId } },
    });
  }
}

/**
 * Check if Supabase is available.
 */
export function isSupabaseReady() {
  return !!supabase;
}

/**
 * Get the raw Supabase client (for Realtime subscriptions).
 */
export function getClient() {
  return supabase;
}

// ── Areas ───────────────────────────────────────────

/**
 * Fetch all areas from the database.
 */
export async function fetchAreas() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('areas')
    .select('*')
    .order('name');
  if (error) {
    console.error('[Up NEPA] fetchAreas error:', error);
    return null;
  }
  return data;
}

// ── Area Status ─────────────────────────────────────

/**
 * Fetch all area statuses.
 */
export async function fetchAreaStatuses() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('area_status')
    .select('*');
  if (error) {
    console.error('[Up NEPA] fetchAreaStatuses error:', error);
    return null;
  }
  // Convert array to map keyed by area_id
  const map = {};
  for (const s of data) {
    map[s.area_id] = {
      areaId: s.area_id,
      currentStatus: s.current_status,
      confidence: s.confidence,
      reportCount: s.report_count,
      lastUpdated: s.last_updated,
    };
  }
  return map;
}

// ── Users ───────────────────────────────────────────

/**
 * Get or create a user by device_id.
 * On first call, inserts a new user. On subsequent calls, returns existing.
 */
export async function getOrCreateUser(devId, areaId) {
  if (!supabase) return null;

  // Try to find existing user
  const { data: existing, error: selectError } = await supabase
    .from('users')
    .select('*')
    .eq('device_id', devId)
    .maybeSingle();

  if (selectError) {
    console.error('[Up NEPA] getOrCreateUser select error:', selectError);
    return null;
  }

  if (existing) {
    return existing;
  }

  // Create new user
  const { data: newUser, error: insertError } = await supabase
    .from('users')
    .insert({ device_id: devId, area_id: areaId })
    .select()
    .single();

  if (insertError) {
    console.error('[Up NEPA] getOrCreateUser insert error:', insertError);
    return null;
  }

  // Update device ID header now that user exists
  setDeviceId(devId);

  return newUser;
}

/**
 * Update a user's area.
 */
export async function updateUser(userId, updates) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  if (error) {
    console.error('[Up NEPA] updateUser error:', error);
    return null;
  }
  return data;
}

// ── Reports ─────────────────────────────────────────

/**
 * Submit a power status report.
 * The PostgreSQL trigger handles area_status recalculation.
 */
export async function submitReport(userId, areaId, status) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('reports')
    .insert({ user_id: userId, area_id: areaId, status })
    .select()
    .single();
  if (error) {
    console.error('[Up NEPA] submitReport error:', error);
    return null;
  }
  return data;
}

// ── Realtime ────────────────────────────────────────

/**
 * Subscribe to area_status changes for all areas.
 * Returns the channel (call .unsubscribe() to clean up).
 */
export function subscribeToAllAreaStatuses(callback) {
  if (!supabase) return null;

  const channel = supabase
    .channel('area-status-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'area_status' },
      (payload) => {
        const row = payload.new;
        if (row) {
          callback({
            areaId: row.area_id,
            currentStatus: row.current_status,
            confidence: row.confidence,
            reportCount: row.report_count,
            lastUpdated: row.last_updated,
          });
        }
      }
    )
    .subscribe();

  return channel;
}

// ── Push Subscription ───────────────────────────────

/**
 * Store push subscription in the user record.
 */
export async function savePushSubscription(userId, subscription) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('users')
    .update({ push_subscription: subscription })
    .eq('id', userId)
    .select()
    .single();
  if (error) {
    console.error('[Up NEPA] savePushSubscription error:', error);
    return null;
  }
  return data;
}
