import { getUserStreakHistory } from '../data/supabase.js';
import { getUser } from '../data/store.js';

/**
 * Renders the streak popover and binds its logic.
 */
export async function renderStreakPopover() {
  let popover = document.getElementById('streak-popover');
  if (!popover) {
    popover = document.createElement('div');
    popover.id = 'streak-popover';
    popover.className = 'streak-popover card glass-panel';
    popover.style.display = 'none';
    
    // Absolute positioning right below the header
    popover.style.position = 'absolute';
    popover.style.top = '60px'; // Header height
    popover.style.right = '10px';
    popover.style.width = '280px';
    popover.style.zIndex = '2000';
    popover.style.padding = '16px';
    popover.style.boxShadow = 'var(--shadow-xl)';
    popover.style.animation = 'slide-down 0.2s ease-out';
    
    document.body.appendChild(popover);

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (popover.style.display !== 'none' && !popover.contains(e.target) && !e.target.closest('#btn-streak')) {
        popover.style.display = 'none';
      }
    });
  }

  // Toggle visibility
  if (popover.style.display === 'block') {
    popover.style.display = 'none';
    return;
  }

  const user = getUser();
  const streakCount = user?.streak || 0;
  
  // Show loading state
  popover.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
      <span style="font-size: 1.5rem;">🔥</span>
      <div>
        <div style="font-weight: 700; font-size: 1.1rem; color: var(--text-main);">${streakCount} Day${streakCount !== 1 ? 's' : ''}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">Current Streak</div>
      </div>
    </div>
    <div style="font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 10px;">Loading history...</div>
  `;
  popover.style.display = 'block';

  // Fetch 7-day history from Supabase
  let historyDates = [];
  if (user?.id) {
    historyDates = await getUserStreakHistory(user.id);
  }

  // Generate 7-day mini calendar
  let calendarHtml = '<div style="display: flex; justify-content: space-between; margin-top: 16px;">';
  
  // Build array of last 7 days
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Create Set of history dates for fast lookup
  const historySet = new Set(historyDates);

  // Fallback: Ensure local streak data is represented even if DB sync is delayed
  if (streakCount > 0 && user?.streakLastDate) {
    const streakDate = new Date(user.streakLastDate);
    for (let i = 0; i < Math.min(streakCount, 7); i++) {
      const year = streakDate.getFullYear();
      const month = String(streakDate.getMonth() + 1).padStart(2, '0');
      const day = String(streakDate.getDate()).padStart(2, '0');
      historySet.add(`${year}-${month}-${day}`);
      streakDate.setDate(streakDate.getDate() - 1);
    }
  }

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const localDateStr = `${year}-${month}-${day}`;
    const utcDateStr = d.toISOString().split('T')[0];
    
    const isReported = historySet.has(localDateStr) || historySet.has(utcDateStr);
    
    const dayName = d.toLocaleDateString('en-US', { weekday: 'narrow' }); // M, T, W...
    
    calendarHtml += `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
        <div style="font-size: 0.65rem; color: var(--text-muted);">${dayName}</div>
        <div style="
          width: 24px; height: 24px; border-radius: 50%; 
          display: flex; align-items: center; justify-content: center;
          background: ${isReported ? 'rgba(245, 158, 11, 0.2)' : 'var(--bg-card)'};
          color: ${isReported ? 'var(--amber)' : 'var(--text-muted)'};
          font-size: ${isReported ? '0.85rem' : '0.5rem'};
        ">
          ${isReported ? '🔥' : '•'}
        </div>
      </div>
    `;
  }
  
  calendarHtml += '</div>';

  popover.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
      <span style="font-size: 1.5rem;">🔥</span>
      <div>
        <div style="font-weight: 700; font-size: 1.1rem; color: var(--text-main);">${streakCount} Day${streakCount !== 1 ? 's' : ''}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">Current Streak</div>
      </div>
    </div>
    ${calendarHtml}
    <div style="margin-top: 16px; font-size: 0.75rem; color: var(--text-muted); text-align: center; border-top: 1px solid var(--border); padding-top: 12px;">
      Report daily to keep the fire burning!
    </div>
  `;
}
