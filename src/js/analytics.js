import { getState, subscribe } from './data/store.js';
import { getExpandedAnalytics, getTodaySupplySummary } from './data/supabase.js';

export function renderAnalytics(container) {
  const state = getState();
  
  container.innerHTML = `
    <header class="header">
      <div class="header-logo" style="font-weight: 800; font-size: var(--fs-xl);">Analytics</div>
    </header>
    <div class="container" style="padding-top: 10px; padding-bottom: 80px;">
      <div class="analytics-card card" style="text-align: center; margin-bottom: 20px;">
        <h3 style="color: var(--text-muted); font-size: 0.9rem;">Today's Supply</h3>
        <div style="font-size: 2.5rem; font-weight: 800; color: var(--primary); margin: 10px 0;">
          <span id="supply-hours">0.0<span style="font-size: 1.2rem; margin-left: 4px;">h</span></span>
        </div>
        <p id="supply-trend" style="font-size: 0.85rem; color: var(--text-muted);">Collecting data...</p>
      </div>

      <div id="analytics-content">
        <div style="text-align: center; color: var(--text-muted); font-size: 0.9rem; padding: var(--space-xl) 0;">
          Loading analytics...
        </div>
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

function formatDuration(hours) {
  if (hours < 1) {
    const mins = Math.round(hours * 60);
    return `${mins} mins`;
  }
  return `${hours.toFixed(1)}h`;
}

async function fetchRealAnalytics(state) {
  const user = state.user;
  if (!user || !user.areaId) return;

  try {
    const summary = await getTodaySupplySummary(user.areaId);
    let todayHours = summary ? summary.today_supply_hours : 0;
    
    const data = await getExpandedAnalytics(user.areaId);

    const supplyEl = document.getElementById('supply-hours');
    if (supplyEl) {
      if (todayHours < 1) {
        supplyEl.innerHTML = `${Math.round(todayHours * 60)}<span style="font-size: 1.2rem; margin-left: 4px;">mins</span>`;
      } else {
        supplyEl.innerHTML = `${todayHours.toFixed(1)}<span style="font-size: 1.2rem; margin-left: 4px;">h</span>`;
      }
    }
    
    const content = document.getElementById('analytics-content');
    if (!data) return;

    // Threshold check
    const totalReports = data.total_reports || 0;
    const trendEl = document.getElementById('supply-trend');
    if (trendEl) {
      trendEl.textContent = `${totalReports} total reports in your area`;
    }

    if (totalReports < 10) {
      content.innerHTML = `
        <div class="card" style="text-align: center; padding: var(--space-xl) var(--space-md);">
          <div style="font-size: 2rem; margin-bottom: 10px;">📊</div>
          <div style="font-weight: 600; margin-bottom: 5px;">Analytics are building</div>
          <div style="color: var(--text-muted); font-size: 0.9rem;">
            Need at least 10 reports to generate historical insights. (Currently at ${totalReports}/10)
          </div>
        </div>
      `;
      return;
    }

    // Render full rich dashboard
    let chartHtml = `
      <div class="card" style="margin-bottom: 20px;">
        <h3 style="margin-bottom: 15px; font-size: 1rem;">Past 7 Days</h3>
        <div class="bar-chart" style="display: flex; align-items: flex-end; justify-content: space-between; height: 140px; padding-bottom: 10px; border-bottom: 1px solid var(--border);">
    `;

    const dailyStats = typeof data.daily_stats === 'string' ? JSON.parse(data.daily_stats) : (data.daily_stats || []);
    let maxHours = Math.max(...dailyStats.map(d => d.on_hours || 0), 1);
    if (maxHours < 2) maxHours = 2;

    const reversedDaily = [...dailyStats].reverse(); 
    
    if (reversedDaily.length === 0) {
       chartHtml += '<div style="width: 100%; text-align: center; color: var(--text-muted); font-size: 0.8rem; margin-bottom: 20px;">No historical data available</div>';
    } else {
      reversedDaily.forEach(d => {
        const heightPct = ((d.on_hours || 0) / maxHours) * 100;
        const color = (d.on_hours || 0) >= 12 ? 'var(--green)' : 'var(--amber)';
        const dayLabel = new Date(d.report_date).toLocaleDateString('en-US', { weekday: 'short' });
        
        chartHtml += `
          <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; flex: 1; height: 100%;">
            <div style="width: 100%; display: flex; justify-content: center; height: 100px; align-items: flex-end;">
              <div style="width: 16px; background-color: ${color}; height: ${Math.max(2, heightPct)}%; border-radius: 4px 4px 0 0;"></div>
            </div>
            <div style="font-size: 0.6rem; color: var(--text-muted);">${dayLabel}</div>
          </div>
        `;
      });
    }
    chartHtml += '</div></div>';

    const todayStat = dailyStats.length > 0 ? dailyStats[0] : {};
    const interruptions = todayStat.interruptions || 0;
    let fragScore = 'Stable';
    if (interruptions >= 4) fragScore = 'Highly Fragmented';
    else if (interruptions >= 2) fragScore = 'Moderate';
    else if (interruptions === 0 && (todayStat.on_hours || 0) === 0) fragScore = 'No Supply';

    let currentSessionStr = 'Unknown';
    if (data.current_session) {
      const durStr = formatDuration(data.current_session.duration_hours || 0);
      if (data.current_session.status === 'ON' || data.current_session.status === 'LIKELY_ON') {
        currentSessionStr = `Power has been on for ${durStr}`;
      } else {
        currentSessionStr = `Power has been out for ${durStr}`;
      }
    }
    
    let longestStreakStr = 'N/A';
    if (data.longest_streak && data.longest_streak.duration_hours) {
       longestStreakStr = `${formatDuration(data.longest_streak.duration_hours)} (on ${new Date(data.longest_streak.streak_date).toLocaleDateString()})`;
    }

    content.innerHTML = `
      ${chartHtml}
      
      <div style="display: grid; grid-template-columns: 1fr; gap: var(--space-md); margin-top: var(--space-lg);">
        
        <div style="background: var(--bg-surface); padding: var(--space-md); border-radius: var(--radius-md);">
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px; text-transform: uppercase;">Current Session</div>
          <div style="font-size: 1.1rem; font-weight: 600;">${currentSessionStr}</div>
        </div>

        <div style="background: var(--bg-surface); padding: var(--space-md); border-radius: var(--radius-md);">
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px; text-transform: uppercase;">Fragmentation Score</div>
          <div style="font-size: 1.1rem; font-weight: 600;">${fragScore}</div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">Fragmented means power came in short bursts.</div>
        </div>
        
        <div style="background: var(--bg-surface); padding: var(--space-md); border-radius: var(--radius-md);">
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px; text-transform: uppercase;">Longest Streak This Month</div>
          <div style="font-size: 1.1rem; font-weight: 600;">${longestStreakStr}</div>
        </div>

        <div style="background: var(--bg-surface); padding: var(--space-md); border-radius: var(--radius-md);">
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px; text-transform: uppercase;">Outage Frequency</div>
          <div style="font-size: 1.1rem; font-weight: 600;">${interruptions} outages today</div>
        </div>
        
        ${data.flash_count > 0 ? `
        <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.2); padding: var(--space-md); border-radius: var(--radius-md);">
          <div style="font-size: 0.75rem; color: var(--amber); margin-bottom: 4px; text-transform: uppercase; font-weight: bold;">⚠️ Flash Supplies Detected</div>
          <div style="font-size: 1.1rem; font-weight: 600; color: var(--amber);">${data.flash_count} short bursts this week</div>
          <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px;">These short bursts can damage appliances — unplug sensitive electronics during unstable periods.</div>
        </div>
        ` : ''}
        
      </div>
    `;
  } catch (err) {
    console.error('Error fetching expanded analytics:', err);
    const content = document.getElementById('analytics-content');
    if (content) content.innerHTML = '<div style="color: var(--amber); text-align: center;">Failed to load analytics</div>';
  }
}
