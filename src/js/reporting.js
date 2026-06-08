/* ======================================================
   UP NEPA — Reporting Module
   One-tap power status reporting with duplicate guard
   ====================================================== */

import { addReport, getLastReport, updateStreak } from './data/store.js';
import { showToast } from './components/toast.js';

const DUPLICATE_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Submit a power status report.
 * Handles duplicate guard, haptic feedback, and optimistic UI.
 * @param {'ON'|'OFF'} status - Power status to report
 * @returns {boolean} Whether the report was accepted
 */
export async function submitReport(status) {
  // Duplicate guard: check if same status was reported within 30 mins
  const lastReport = getLastReport();
  if (lastReport) {
    const timeSince = Date.now() - new Date(lastReport.createdAt).getTime();
    if (timeSince < DUPLICATE_WINDOW_MS && lastReport.status === status) {
      showToast("You already confirmed this — we'll ask again later 👍", 'info');
      triggerHaptic('light');
      return false;
    }
  }

  // Haptic feedback (fire immediately, don't wait for network)
  triggerHaptic('medium');

  // Show success feedback optimistically
  if (status === 'ON') {
    showToast('Confirmed — light is up! ⚡', 'success');
  } else {
    showToast('Noted — light is out. Your area will be updated.', 'info');
  }

  // Submit the report (updates local state optimistically, then syncs to Supabase)
  const report = await addReport(status);

  if (!report) {
    showToast('Something went wrong. Try again.', 'error');
    return false;
  }

  // Update streak
  updateStreak();

  // Animate report count
  requestAnimationFrame(() => {
    const countEl = document.getElementById('report-count');
    if (countEl) {
      countEl.classList.remove('pop');
      void countEl.offsetWidth; // Force reflow
      countEl.classList.add('pop');
    }
  });

  return true;
}

/**
 * Trigger haptic feedback if supported.
 * @param {'light'|'medium'|'heavy'} intensity
 */
function triggerHaptic(intensity = 'medium') {
  if (!navigator.vibrate) return;

  const patterns = {
    light: [10],
    medium: [50, 100, 50],
    heavy: [50, 30, 50],
  };

  try {
    navigator.vibrate(patterns[intensity] || patterns.medium);
  } catch {
    // Haptic not available — fail silently
  }
}

/**
 * Bind report button event listeners.
 * Called after the home screen renders.
 */
export function bindReportButtons() {
  const btnOn = document.getElementById('btn-report-on');
  const btnOff = document.getElementById('btn-report-off');

  if (btnOn && !btnOn.dataset.bound) {
    btnOn.addEventListener('click', (e) => {
      e.preventDefault();
      btnOn.classList.remove('burst-on');
      void btnOn.offsetWidth; // Force reflow
      btnOn.classList.add('burst-on');
      submitReport('ON');
    });
    btnOn.dataset.bound = 'true';
  }

  if (btnOff && !btnOff.dataset.bound) {
    btnOff.addEventListener('click', (e) => {
      e.preventDefault();
      btnOff.classList.remove('burst-off');
      void btnOff.offsetWidth; // Force reflow
      btnOff.classList.add('burst-off');
      submitReport('OFF');
    });
    btnOff.dataset.bound = 'true';
  }
}
