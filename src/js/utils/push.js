import { savePushSubscription } from '../data/supabase.js';

const VAPID_PUBLIC_KEY = 'BKXqYTbpcV_N6bhsaNQVxefW-j9jWDZdrPuf3wapR2yG4V4A5UimHAOBhPmPS_mK0irE0zfKUBdanWiQDLfIGPU';

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
