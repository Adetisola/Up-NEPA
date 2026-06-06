import { getState, subscribe } from './data/store.js';
import { getAreaPatterns } from './data/supabase.js';

export function renderAnalytics(container) {
  const state = getState();
  
  container.innerHTML = `
    <header class="header">
      <div class="header-logo" style="font-weight: 800; font-size: var(--fs-xl);">Analytics</div>
    </header>
    <div class="container" style="padding-top: 10px;">
      <div class="analytics-card card" style="text-align: center; margin-bottom: 20px;">
        <h3 style="color: var(--text-muted); font-size: 0.9rem;">Today's Estimated Supply</h3>
        <div style="font-size: 2.5rem; font-weight: 800; color: var(--primary); margin: 10px 0;">
          <span id="supply-hours">0.0<span style="font-size: 1.2rem; margin-left: 4px;">h</span></span>
        </div>
        <p id="supply-trend" style="font-size: 0.85rem; color: var(--text-muted);">Collecting data...</p>
      </div>

      <div class="card" style="margin-bottom: 20px;">
        <h3 style="margin-bottom: 15px; font-size: 1rem;">Past 7 Days</h3>
        <div id="analytics-chart" class="bar-chart" style="display: flex; align-items: flex-end; justify-content: space-between; height: 150px; padding-bottom: 20px; border-bottom: 1px solid var(--border);">
          <div style="width: 100%; text-align: center; color: var(--text-muted); font-size: 0.8rem; margin-bottom: 20px;">
            Not enough data to show chart
          </div>
        </div>
      </div>

      <div class="card">
        <h3 style="margin-bottom: 10px; font-size: 1rem;">Insights</h3>
        <ul id="analytics-insights" style="list-style: none; font-size: 0.9rem; color: var(--text-muted);">
          <li style="padding: 10px 0; text-align: center;">Need more community reports to generate insights.</li>
        </ul>
      </div>
    </div>
  `;

  updateAnalytics(state);
  fetchRealAnalytics(state);
  
  const unsubscribe = subscribe(updateAnalytics);

  return () => {
    unsubscribe();
  };
}

function updateAnalytics(state) {
  // Synchronous UI updates based on local state if needed
}

async function fetchRealAnalytics(state) {
  const user = state.user;
  if (!user || !user.areaId) return;

  try {
    const patterns = await getAreaPatterns(user.areaId);
    if (!patterns || patterns.length === 0) return; // Leave as 0.0 if empty

    const todayDow = new Date().getDay(); // 0 is Sunday
    const todayPattern = patterns.find(p => p.day_of_week === todayDow);

    // Update Today's Estimated Supply
    const supplyEl = document.getElementById('supply-hours');
    const trendEl = document.getElementById('supply-trend');
    
    if (todayPattern && todayPattern.avg_duration_on != null && supplyEl) {
      if (todayPattern.avg_duration_on === 0) {
        supplyEl.innerHTML = '0 <span style="font-size: 1.2rem;">mins</span>';
        trendEl.textContent = `Not enough historical uptime data.`;
      } else {
        const totalMinutes = Math.round(todayPattern.avg_duration_on * 60);
        const hrs = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        
        let timeString = '';
        if (hrs > 0) timeString += `${hrs}<span style="font-size: 1.2rem; margin-right: 4px;">h</span> `;
        if (mins > 0 || hrs === 0) timeString += `${mins}<span style="font-size: 1.2rem;">m</span>`;
        
        supplyEl.innerHTML = timeString.trim();
        trendEl.textContent = `Based on ${todayPattern.sample_size} historical reports`;
      }
      trendEl.style.color = 'var(--text-muted)';
    }

    // Update Chart
    const chartEl = document.getElementById('analytics-chart');
    if (chartEl && patterns.length > 0) {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      let maxDuration = Math.max(...patterns.map(p => p.avg_duration_on || 0));
      if (maxDuration < 1) maxDuration = 1; // Prevent div by zero
      
      // Reorder days so today is last
      const orderedDays = [];
      for (let i = 1; i <= 7; i++) {
        orderedDays.push((todayDow + i) % 7);
      }

      chartEl.innerHTML = orderedDays.map(dow => {
        const p = patterns.find(x => x.day_of_week === dow);
        const duration = p ? (p.avg_duration_on || 0) : 0;
        const height = (duration / maxDuration) * 100;
        const isToday = dow === todayDow;
        
        return `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: flex-end; flex: 1; height: 100%;">
            <div style="height: ${height}%; width: 20px; background-color: ${isToday ? 'var(--primary)' : 'var(--surface-light)'}; border-radius: 4px 4px 0 0; min-height: 4px;"></div>
            <span style="font-size: 0.7rem; color: var(--text-muted); margin-top: 5px;">${days[dow]}</span>
          </div>
        `;
      }).join('');
    }

    // Update Insights
    const insightsEl = document.getElementById('analytics-insights');
    if (insightsEl && patterns.length > 0) {
      // Find day with max duration
      let bestPattern = patterns[0];
      for (const p of patterns) {
        if ((p.avg_duration_on || 0) > (bestPattern.avg_duration_on || 0)) {
          bestPattern = p;
        }
      }
      
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      insightsEl.innerHTML = `
        <li style="padding: 10px 0; border-bottom: 1px solid var(--border);">⚡ Power is usually best on <strong>${days[bestPattern.day_of_week]}s</strong></li>
        <li style="padding: 10px 0;">📊 <strong>${patterns.reduce((sum, p) => sum + (p.sample_size || 0), 0)}</strong> total community reports collected for your area.</li>
      `;
    }
  } catch (err) {
    console.error('Error fetching analytics:', err);
  }
}
