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

function formatTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'}).toLowerCase();
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

    // Prepare Daily Stats
    const dailyStats = typeof data.daily_stats === 'string' ? JSON.parse(data.daily_stats) : (data.daily_stats || []);
    let maxHours = Math.max(...dailyStats.map(d => d.on_hours || 0), 1);
    if (maxHours < 2) maxHours = 2;

    const reversedDaily = [...dailyStats].reverse(); 

    // Render full rich dashboard
    let chartHtml = `
      <div class="card" style="margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <h3 style="font-size: 1rem; margin: 0;">Past 7 Days</h3>
          <span style="font-size: 0.7rem; color: var(--text-muted);">(Tap bar for log matrix)</span>
        </div>
        <div id="bar-chart-container" class="bar-chart" style="display: flex; align-items: flex-end; justify-content: space-between; height: 140px; padding-bottom: 10px; border-bottom: 1px solid var(--border);">
    `;
    
    if (reversedDaily.length === 0) {
       chartHtml += '<div style="width: 100%; text-align: center; color: var(--text-muted); font-size: 0.8rem; margin-bottom: 20px;">No historical data available</div>';
    } else {
      reversedDaily.forEach((d, i) => {
        const heightPct = ((d.on_hours || 0) / maxHours) * 100;
        const color = (d.on_hours || 0) >= 12 ? 'var(--green)' : 'var(--amber)';
        const dayLabel = new Date(d.report_date).toLocaleDateString('en-US', { weekday: 'short' });
        
        chartHtml += `
          <div class="interactive-bar" data-index="${i}" style="display: flex; flex-direction: column; align-items: center; gap: 8px; flex: 1; height: 100%; cursor: pointer;">
            <div style="width: 100%; display: flex; justify-content: center; height: 100px; align-items: flex-end;">
              <div style="width: 16px; background-color: ${color}; height: ${Math.max(2, heightPct)}%; border-radius: 4px 4px 0 0; transition: transform 0.1s, opacity 0.2s; animation: grow-up 0.6s ease-out backwards; animation-delay: ${i * 0.05}s;" class="bar-fill"></div>
            </div>
            <div style="font-size: 0.6rem; color: var(--text-muted); font-weight: 600;" class="bar-label">${dayLabel}</div>
          </div>
        `;
      });
    }
    chartHtml += `
        </div>
        <div id="matrix-container" style="display: none; margin-top: 15px; padding-top: 15px; border-top: 1px dashed var(--border); font-size: 0.85rem;">
        </div>
      </div>
    `;

    // 1. Calculate Grid Reliability metrics
    const daysTracked = Math.max(dailyStats.length, 1);
    let totalOnHours = 0;
    dailyStats.forEach(d => totalOnHours += (d.on_hours || 0));
    const availabilityPct = (totalOnHours / (daysTracked * 24)) * 100;
    
    let rating = 'E';
    let ratingColor = '#ef4444'; // red
    let verdictText = 'Critically Deficient';
    
    if (availabilityPct >= 90) { rating = 'A'; ratingColor = '#22c55e'; verdictText = 'Highly Reliable'; }
    else if (availabilityPct >= 70) { rating = 'B'; ratingColor = '#22c55e'; verdictText = 'Stable'; }
    else if (availabilityPct >= 50) { rating = 'C'; ratingColor = '#eab308'; verdictText = 'Moderately Deficient'; }
    else if (availabilityPct >= 30) { rating = 'D'; ratingColor = '#f97316'; verdictText = 'Deficient'; }

    // 2. Format basic stats
    const todayStat = dailyStats.length > 0 ? dailyStats[0] : {};
    const interruptions = todayStat.interruptions || 0;

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
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px; text-transform: uppercase;">Grid Reliability Assessment</div>
          <div style="display: flex; align-items: baseline; gap: 8px;">
             <div style="font-size: 1.5rem; font-weight: 800; color: ${ratingColor};">${rating}</div>
             <div style="font-size: 1.1rem; font-weight: 600;">(${availabilityPct.toFixed(1)}%)</div>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">Verdict: ${verdictText}</div>
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

    // Add interactivity to the chart bars
    const chartContainer = document.getElementById('bar-chart-container');
    const matrixContainer = document.getElementById('matrix-container');
    
    if (chartContainer && matrixContainer) {
      const bars = chartContainer.querySelectorAll('.interactive-bar');
      bars.forEach(bar => {
        bar.addEventListener('click', () => {
          // Reset styles
          bars.forEach(b => {
             b.querySelector('.bar-fill').style.opacity = '0.5';
             b.querySelector('.bar-label').style.color = 'var(--text-muted)';
          });
          // Highlight active
          bar.querySelector('.bar-fill').style.opacity = '1';
          bar.querySelector('.bar-label').style.color = 'var(--text-main)';
          
          const idx = parseInt(bar.getAttribute('data-index'));
          const dayData = reversedDaily[idx];
          
          if (!dayData) return;
          
          const dateStr = new Date(dayData.report_date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
          
          let intervalsHtml = '<div style="color: var(--text-muted); font-style: italic;">Aggregated data only. Update backend to see granular spans.</div>';
          
          if (dayData.intervals && dayData.intervals.length > 0) {
            const onSpans = dayData.intervals.filter(iv => iv.status === 'ON' || iv.status === 'LIKELY_ON');
            if (onSpans.length > 0) {
              intervalsHtml = onSpans.map(iv => {
                const start = formatTime(iv.start_time);
                const endD = new Date(new Date(iv.start_time).getTime() + ((iv.duration_hours || 0) * 3600 * 1000));
                const end = formatTime(endD.toISOString());
                return `<div style="background: var(--bg-body); padding: 6px 10px; border-radius: 4px; display: inline-block; margin: 4px; border: 1px solid var(--border);">
                          <span style="color: var(--primary); font-weight: 600;">${start} → ${end}</span> 
                          <span style="color: var(--text-muted); margin-left: 6px;">(${formatDuration(iv.duration_hours || 0)})</span>
                        </div>`;
              }).join('');
            } else {
              intervalsHtml = '<div style="color: var(--red); font-weight: 600; padding: 4px;">Total Blackout</div>';
            }
          }

          matrixContainer.style.display = 'block';
          matrixContainer.innerHTML = `
            <div style="font-weight: 700; margin-bottom: 8px; display: flex; justify-content: space-between;">
              <span>${dateStr} Log</span>
              <span>${dayData.interruptions || 0} Interruptions</span>
            </div>
            <div style="margin-bottom: 10px;">Total Supply: <strong>${formatDuration(dayData.on_hours || 0)}</strong></div>
            <div>${intervalsHtml}</div>
          `;
        });
      });
      
      // Auto-click the last bar (today) if it exists
      if (bars.length > 0) {
         bars[bars.length - 1].click();
      }
    }

  } catch (err) {
    console.error('Error fetching expanded analytics:', err);
    const content = document.getElementById('analytics-content');
    if (content) content.innerHTML = '<div style="color: var(--amber); text-align: center;">Failed to load analytics</div>';
  }
}
