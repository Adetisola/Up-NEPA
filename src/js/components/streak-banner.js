/* ======================================================
   UP NEPA — Streak Banner Component
   Displays current streak and milestone messages
   ====================================================== */

import { getStreakMilestone } from '../data/store.js';

/**
 * Render the streak banner.
 * @param {number} streak - Current streak count
 * @returns {string} HTML string (empty string if streak is 0)
 */
export function renderStreakBanner(streak) {
  if (!streak || streak <= 0) {
    return `
      <div class="streak-banner" id="streak-banner">
        <span class="streak-fire">💡</span>
        <div class="streak-content">
          <div class="streak-count">Start your streak!</div>
          <div class="streak-message">Report daily to build your streak and help your area.</div>
        </div>
      </div>
    `;
  }

  const milestone = getStreakMilestone(streak);
  const dayText = streak === 1 ? 'day' : 'days';

  return `
    <div class="streak-banner" id="streak-banner">
      <span class="streak-fire">🔥</span>
      <div class="streak-content">
        <div class="streak-count">${streak} ${dayText} in a row</div>
        <div class="streak-message">${milestone || 'Keep reporting to grow your streak!'}</div>
      </div>
    </div>
  `;
}
