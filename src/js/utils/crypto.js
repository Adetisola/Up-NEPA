/**
 * Utility functions for local authentication gating.
 */

/**
 * Hashes a string using SHA-256 (Web Crypto API).
 * Used for locally verifying PINs without needing a network request.
 * @param {string} pin - The raw 4-digit PIN
 * @returns {Promise<string>} - The SHA-256 hex string
 */
export async function hashPin(pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
