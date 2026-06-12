import { getState, subscribe, formatDuration } from './data/store.js';
import { getExpandedAnalytics, getTodaySupplySummary } from './data/supabase.js';
import { showToast } from './components/toast.js';

export function renderAnalytics(container) {
  const state = getState();
  
  container.innerHTML = `
    <header class="header">
      <div class="header-logo" style="font-weight: 800; font-size: var(--fs-xl);">Analytics</div>
    </header>
    <div class="container" style="padding-top: 10px; padding-bottom: 80px;">
      <div id="analytics-hero-container">
        <!-- Hero will be injected here -->
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

function formatTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'}).toLowerCase();
}

let globalAnalyticsData = null;

async function fetchRealAnalytics(state) {
  const user = state.user;
  if (!user || !user.areaId) return;

  try {
    const summary = await getTodaySupplySummary(user.areaId);
    let todayHours = summary ? summary.today_supply_hours : 0;
    
    const data = await getExpandedAnalytics(user.areaId);
    
    const supplyEl = document.getElementById('supply-hours');
    if (supplyEl) {
      supplyEl.innerHTML = formatDuration(todayHours);
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

    globalAnalyticsData = data;

    // Parse once
    globalAnalyticsData.daily_stats_parsed = typeof data.daily_stats === 'string' ? JSON.parse(data.daily_stats) : (data.daily_stats || []);
    globalAnalyticsData.monthly_stats_parsed = typeof data.monthly_stats === 'string' ? JSON.parse(data.monthly_stats) : (data.monthly_stats || []);

    // 1. Calculate Grid Reliability metrics from full 30 days
    const dailyStats = globalAnalyticsData.daily_stats_parsed;
    const daysTracked = Math.max(dailyStats.length, 1);
    let totalOnHours = 0;
    dailyStats.forEach(d => totalOnHours += (d.on_hours || 0));
    const availabilityPct = (totalOnHours / (daysTracked * 24)) * 100;
    
    let rating = 'E'; let ratingColor = '#ef4444'; let verdictText = 'Critically Deficient';
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

    // 3. Stable Window & Benchmarking (Mock data for Phase 5)
    const stableWindowStr = "10:00 PM - 5:00 AM"; // Placeholder until pattern engine is complete
    const benchmarkStr = "Top 20% in Magboro"; // Placeholder
    
    // 4. Fragmentation Score
    let fragLabel = 'Solid'; let fragColor = 'var(--green)';
    if (interruptions >= 5) { fragLabel = 'Severe'; fragColor = 'var(--red)'; }
    else if (interruptions >= 2) { fragLabel = 'Fragmented'; fragColor = 'var(--amber)'; }

    // Inject Hero Card
    const heroContainer = document.getElementById('analytics-hero-container');
    if (heroContainer) {
      heroContainer.innerHTML = `
        <div class="analytics-card card" style="text-align: center; margin-bottom: 20px; border-top: 4px solid ${ratingColor};">
          <h3 style="color: var(--text-muted); font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px;">Grid Reliability Assessment</h3>
          <div style="display: flex; justify-content: center; align-items: baseline; gap: 8px; margin: 10px 0;">
            <div style="font-size: 3.5rem; font-weight: 800; color: ${ratingColor}; line-height: 1;">${rating}</div>
          </div>
          <div style="font-size: 1.1rem; font-weight: 600; margin-bottom: 4px;">${verdictText}</div>
          <div style="font-size: 0.85rem; color: var(--text-muted);">Based on ${availabilityPct.toFixed(1)}% availability over ${daysTracked} days</div>
        </div>
      `;
    }

    content.innerHTML = `
      <div id="chart-wrapper"></div>
      
      <div style="display: grid; grid-template-columns: 1fr; gap: var(--space-md); margin-top: var(--space-lg);">
        <div style="background: var(--bg-surface); padding: var(--space-md); border-radius: var(--radius-md);">
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px; text-transform: uppercase;">Community Benchmark</div>
          <div style="font-size: 1.1rem; font-weight: 600; display: flex; align-items: center; gap: 6px;">
            <span>🏆</span> ${benchmarkStr}
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">Better than 3 nearby feeders</div>
        </div>

        <div style="background: var(--bg-surface); padding: var(--space-md); border-radius: var(--radius-md);">
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px; text-transform: uppercase;">Stable Window Insights</div>
          <div style="font-size: 1.1rem; font-weight: 600; display: flex; align-items: center; gap: 6px;">
            <span>🌙</span> ${stableWindowStr}
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">Your area is most reliable during this window.</div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md);">
          <div style="background: var(--bg-surface); padding: var(--space-md); border-radius: var(--radius-md);">
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px; text-transform: uppercase;">Today's Supply</div>
            <div style="font-size: 1.5rem; font-weight: 800; color: var(--primary);">${formatDuration(todayHours)}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">Current Session: <br>${currentSessionStr}</div>
          </div>

          <div style="background: var(--bg-surface); padding: var(--space-md); border-radius: var(--radius-md);">
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px; text-transform: uppercase;">Outages</div>
            <div style="font-size: 1.5rem; font-weight: 800; color: var(--primary);">${interruptions}</div>
            <div style="font-size: 0.8rem; color: ${fragColor}; font-weight: 600; margin-top: 4px; padding: 2px 6px; background: color-mix(in srgb, ${fragColor} 15%, transparent); display: inline-block; border-radius: 4px;">
              ${fragLabel}
            </div>
          </div>
        </div>
        
        <div style="background: var(--bg-surface); padding: var(--space-md); border-radius: var(--radius-md);">
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px; text-transform: uppercase;">Longest Streak This Month</div>
          <div style="font-size: 1.1rem; font-weight: 600;">${longestStreakStr}</div>
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

    renderChartSection();

  } catch (err) {
    console.error('Error fetching expanded analytics:', err);
    const content = document.getElementById('analytics-content');
    if (content) content.innerHTML = '<div style="color: var(--amber); text-align: center;">Failed to load analytics</div>';
  }
}

let currentSpan = 'Week'; // Day, Week, Month
let periodOffset = 0;

function renderChartSection(slideDirection = null) {
  const chartWrapper = document.getElementById('chart-wrapper');
  if (!chartWrapper || !globalAnalyticsData) return;

  const allDaily = globalAnalyticsData.daily_stats_parsed;

  function generateDataForOffset(offset) {
    let fixedData = [];
    let chartLabel = '';
    let yAxisMax = 24;
    let hasMatrix = true;
    let yAxisLabels = ['24 h', '12 h', '0 h'];
    const now = new Date();

    if (currentSpan === 'Day') {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() - offset);
      chartLabel = targetDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      if (offset === 0) chartLabel = 'Today (' + chartLabel + ')';
      else if (offset === 1) chartLabel = 'Yesterday (' + chartLabel + ')';
      
      const tzOffset = targetDate.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(targetDate.getTime() - tzOffset)).toISOString().slice(0, 10);
      const match = allDaily.find(x => x.report_date === localISOTime);
      
      const intervals = match ? (match.intervals || []) : [];
      
      for (let hour = 0; hour < 24; hour++) {
        let onSeconds = 0;
        
        const hourStart = new Date(targetDate);
        hourStart.setHours(hour, 0, 0, 0);
        const hourEnd = new Date(targetDate);
        hourEnd.setHours(hour + 1, 0, 0, 0);
        const hStartT = hourStart.getTime();
        const hEndT = hourEnd.getTime();
        
        intervals.forEach(iv => {
          if (iv.status !== 'ON' && iv.status !== 'LIKELY_ON') return;
          const ivStart = new Date(iv.start_time).getTime();
          const ivEnd = ivStart + ((iv.duration_hours || 0) * 3600 * 1000);
          
          const overlapStart = Math.max(hStartT, ivStart);
          const overlapEnd = Math.min(hEndT, ivEnd);
          if (overlapEnd > overlapStart) {
            onSeconds += (overlapEnd - overlapStart) / 1000;
          }
        });
        
        const onHours = onSeconds / 3600;
        
        // Show labels every 4 hours for 24h
        let label = '';
        if (hour % 4 === 0) {
          label = hour === 0 ? '12am' : (hour === 12 ? '12pm' : (hour < 12 ? hour+'am' : (hour-12)+'pm'));
        }
        
        fixedData.push({
          dateObj: hourStart,
          label: label,
          on_hours: onHours,
          isToday: offset === 0 && hour === now.getHours(),
          original: match
        });
      }
      yAxisMax = 1;
      yAxisLabels = ['60m', '30m', '0m'];
      hasMatrix = false;

    } else if (currentSpan === 'Week') {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() - (offset * 7));
      const dayOfWeek = targetDate.getDay();
      const sunday = new Date(targetDate);
      sunday.setDate(sunday.getDate() - dayOfWeek);
      
      const saturday = new Date(sunday);
      saturday.setDate(saturday.getDate() + 6);
      
      chartLabel = `${sunday.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} - ${saturday.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`;
      if (offset === 0) chartLabel = 'This Week (' + chartLabel + ')';
      else if (offset === 1) chartLabel = 'Last Week (' + chartLabel + ')';
      
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      for (let i = 0; i < 7; i++) {
        const d = new Date(sunday);
        d.setDate(d.getDate() + i);
        const tzOffset = d.getTimezoneOffset() * 60000;
        const dateStr = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 10);
        const match = allDaily.find(x => x.report_date === dateStr);
        
        fixedData.push({
          dateObj: d,
          label: dayNames[i],
          on_hours: match ? match.on_hours : 0,
          isToday: offset === 0 && d.getDate() === now.getDate() && d.getMonth() === now.getMonth(),
          original: match
        });
      }
      yAxisMax = 24;
      hasMatrix = true;

    } else if (currentSpan === 'Month') {
      const targetMonth = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      chartLabel = targetMonth.toLocaleDateString('en-US', { month: 'long', year: targetMonth.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
      
      const daysInMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate();
      
      for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), i);
        const tzOffset = d.getTimezoneOffset() * 60000;
        const dateStr = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 10);
        const match = allDaily.find(x => x.report_date === dateStr);
        
        fixedData.push({
          dateObj: d,
          label: (i === 1 || i % 5 === 0 || i === daysInMonth) ? i : '',
          on_hours: match ? match.on_hours : 0,
          isToday: offset === 0 && d.getDate() === now.getDate(),
          original: match
        });
      }
      yAxisMax = 24;
      hasMatrix = true;
    }

    return { fixedData, chartLabel, yAxisMax, yAxisLabels, hasMatrix };
  }

  const prevPeriod = generateDataForOffset(periodOffset + 1);
  const currentPeriod = generateDataForOffset(periodOffset);
  const nextPeriod = periodOffset > 0 ? generateDataForOffset(periodOffset - 1) : null;

  const yAxisMax = currentPeriod.yAxisMax;
  const yAxisLabels = currentPeriod.yAxisLabels;
  const hasMatrix = currentPeriod.hasMatrix;
  const chartLabel = currentPeriod.chartLabel;
  const fixedData = currentPeriod.fixedData;
  
  if (currentSpan === 'Day') {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() - periodOffset);
    chartLabel = targetDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    if (periodOffset === 0) chartLabel = 'Today (' + chartLabel + ')';
    else if (periodOffset === 1) chartLabel = 'Yesterday (' + chartLabel + ')';
    
    // Using local timezone offset to match the report_date exactly (which is local date string)
    // Wait, report_date is generated via postgres CURRENT_DATE, which is UTC or timezone-dependent.
    // Let's just use the YYYY-MM-DD format manually:
    const tzOffset = targetDate.getTimezoneOffset() * 60000; // offset in milliseconds
    const localISOTime = (new Date(targetDate.getTime() - tzOffset)).toISOString().slice(0, 10);
    const match = allDaily.find(x => x.report_date === localISOTime);
    
    const intervals = match ? (match.intervals || []) : [];
    
    for (let hour = 0; hour < 24; hour++) {
      let onSeconds = 0;
      
      const hourStart = new Date(targetDate);
      hourStart.setHours(hour, 0, 0, 0);
      const hourEnd = new Date(targetDate);
      hourEnd.setHours(hour + 1, 0, 0, 0);
      const hStartT = hourStart.getTime();
      const hEndT = hourEnd.getTime();
      
      intervals.forEach(iv => {
        if (iv.status !== 'ON' && iv.status !== 'LIKELY_ON') return;
        const ivStart = new Date(iv.start_time).getTime();
        const ivEnd = ivStart + ((iv.duration_hours || 0) * 3600 * 1000);
        
        const overlapStart = Math.max(hStartT, ivStart);
        const overlapEnd = Math.min(hEndT, ivEnd);
        if (overlapEnd > overlapStart) {
          onSeconds += (overlapEnd - overlapStart) / 1000;
        }
      });
      
      const onHours = onSeconds / 3600;
      
      fixedData.push({
        dateObj: hourStart,
        label: (hour % 6 === 0) ? (hour === 0 ? '12am' : (hour === 12 ? '12pm' : (hour < 12 ? hour+'am' : (hour-12)+'pm'))) : '',
        on_hours: onHours,
        isToday: periodOffset === 0 && hour === now.getHours(),
        original: match // store the day match
      });
    }
    yAxisMax = 1;
    yAxisLabels = ['60m', '30m', '0m'];
    hasMatrix = false; // We use a simple toast for hourly bars

  } else if (currentSpan === 'Week') {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() - (periodOffset * 7));
    const dayOfWeek = targetDate.getDay();
    const sunday = new Date(targetDate);
    sunday.setDate(sunday.getDate() - dayOfWeek);
    
    const saturday = new Date(sunday);
    saturday.setDate(saturday.getDate() + 6);
    
    chartLabel = `${sunday.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} - ${saturday.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`;
    if (periodOffset === 0) chartLabel = 'This Week (' + chartLabel + ')';
    else if (periodOffset === 1) chartLabel = 'Last Week (' + chartLabel + ')';
    
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(d.getDate() + i);
      const tzOffset = d.getTimezoneOffset() * 60000;
      const dateStr = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 10);
      const match = allDaily.find(x => x.report_date === dateStr);
      
      fixedData.push({
        dateObj: d,
        label: dayNames[i],
        on_hours: match ? match.on_hours : 0,
        isToday: periodOffset === 0 && d.getDate() === now.getDate() && d.getMonth() === now.getMonth(),
        original: match
      });
    }
    yAxisMax = 24;
    hasMatrix = true;

  } else if (currentSpan === 'Month') {
    const targetMonth = new Date(now.getFullYear(), now.getMonth() - periodOffset, 1);
    chartLabel = targetMonth.toLocaleDateString('en-US', { month: 'long', year: targetMonth.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
    
    const daysInMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate();
    
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), i);
      const tzOffset = d.getTimezoneOffset() * 60000;
      const dateStr = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 10);
      const match = allDaily.find(x => x.report_date === dateStr);
      
      fixedData.push({
        dateObj: d,
        label: (i === 1 || i % 8 === 0 || i === daysInMonth) ? i : '',
        on_hours: match ? match.on_hours : 0,
        isToday: periodOffset === 0 && d.getDate() === now.getDate(),
        original: match
      });
    }
    yAxisMax = 24;
    hasMatrix = true;
  }

  let totalHours = 0;
  let totalDaysInDataset = currentSpan === 'Day' ? 1 : fixedData.length;
  fixedData.forEach(d => totalHours += d.on_hours);
  const avgDailyHours = totalDaysInDataset > 0 ? (totalHours / totalDaysInDataset) : 0;
  
  let chartHtml = `
    <div class="card" style="margin-bottom: 20px; padding: 20px 16px;">
      <!-- Header & Toggle -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
        <div>
          <h3 style="font-size: 1.1rem; margin: 0; margin-bottom: 4px; font-weight: 700;">Supply Log</h3>
          <div style="font-size: 0.85rem; color: var(--text-muted);">Avg: <strong style="color:var(--text-main); font-weight: 700;">${formatDuration(avgDailyHours)}${currentSpan === 'Day' ? ' total' : ' / day'}</strong></div>
        </div>
        
        <div style="background: var(--bg-surface); padding: 4px; border-radius: 20px; display: flex; gap: 2px;">
          <button class="span-toggle ${currentSpan === 'Day' ? 'active' : ''}" data-span="Day" style="border:none; background:${currentSpan === 'Day' ? 'var(--primary-fade)' : 'transparent'}; color:${currentSpan === 'Day' ? 'var(--primary)' : 'var(--text-muted)'}; padding: 4px 12px; border-radius: 16px; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">Day</button>
          <button class="span-toggle ${currentSpan === 'Week' ? 'active' : ''}" data-span="Week" style="border:none; background:${currentSpan === 'Week' ? 'var(--primary-fade)' : 'transparent'}; color:${currentSpan === 'Week' ? 'var(--primary)' : 'var(--text-muted)'}; padding: 4px 12px; border-radius: 16px; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">Week</button>
          <button class="span-toggle ${currentSpan === 'Month' ? 'active' : ''}" data-span="Month" style="border:none; background:${currentSpan === 'Month' ? 'var(--primary-fade)' : 'transparent'}; color:${currentSpan === 'Month' ? 'var(--primary)' : 'var(--text-muted)'}; padding: 4px 12px; border-radius: 16px; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">Month</button>
        </div>
      </div>

      <!-- Navigation Header -->
      <div style="display: flex; justify-content: center; align-items: center; gap: 20px; margin-bottom: 25px;">
         <button id="btn-prev-period" style="background: none; border: none; color: var(--text-main); font-size: 1.2rem; cursor: pointer; padding: 4px 12px;">&lt;</button>
         <span style="font-weight: 600; font-size: 0.95rem; min-width: 140px; text-align: center;">${chartLabel}</span>
         <button id="btn-next-period" ${periodOffset === 0 ? 'disabled style="opacity:0.2;"' : ''} style="background: none; border: none; color: var(--text-main); font-size: 1.2rem; cursor: pointer; padding: 4px 12px;">&gt;</button>
      </div>
      
      <!-- Chart Area -->
      <div id="chart-swipe-area" style="position: relative; height: 180px; margin-bottom: 10px; overflow: hidden; padding-top: 15px;">
        
        <!-- Y-Axis Grid (Fixed Behind) -->
        <div style="position: absolute; top: 15px; left: 0; right: 0; bottom: 24px; display: flex; flex-direction: column; justify-content: space-between; pointer-events: none; z-index: 0;">
          <div style="border-top: 1px solid rgba(255,255,255,0.05); position: relative; width: 100%;">
             <span style="position: absolute; right: 4px; top: -14px; font-size: 0.65rem; color: var(--text-muted); text-align: right; width: 30px; background: var(--bg-surface); padding: 2px;">${yAxisLabels[0]}</span>
          </div>
          <div style="border-top: 1px solid rgba(255,255,255,0.05); position: relative; width: 100%;">
             <span style="position: absolute; right: 4px; top: -14px; font-size: 0.65rem; color: var(--text-muted); text-align: right; width: 30px; background: var(--bg-surface); padding: 2px;">${yAxisLabels[1]}</span>
          </div>
          <div style="border-top: 1px solid rgba(255,255,255,0.05); position: relative; width: 100%;">
             <span style="position: absolute; right: 4px; top: -14px; font-size: 0.65rem; color: var(--text-muted); text-align: right; width: 30px; background: var(--bg-surface); padding: 2px;">${yAxisLabels[2]}</span>
          </div>
        </div>

        <!-- 3-Panel Swipe Track -->
        <div id="chart-swipe-track" style="display: flex; align-items: flex-end; height: 100%; position: relative; z-index: 1; transition: transform 0.3s ease-out; width: 300%; transform: translateX(-33.333%);">
  `;

  function renderPanelBars(panelData) {
    if (!panelData) {
      return `<div style="flex: 1; height: 100%; display: flex; padding-right: 40px;"></div>`;
    }
    
    let html = `<div style="flex: 1; height: 100%; display: flex; padding-right: 40px;">`; // 40px right padding for Y-axis

    panelData.fixedData.forEach((d, i) => {
      const heightPct = Math.min((d.on_hours / panelData.yAxisMax) * 100, 100);
      const color = d.on_hours >= (panelData.yAxisMax/2) ? 'var(--green)' : 'var(--primary)';
      const isInteractive = 'cursor: pointer;';
      
      let barWidth = '8px';
      if (currentSpan === 'Week') barWidth = '16px';
      if (currentSpan === 'Month') barWidth = '6px';

      const labelBg = (d.isToday && d.label !== '')
        ? 'background-color: var(--border-light); border-radius: 12px; padding: 2px 6px; display: flex; align-items: center; justify-content: center; color: var(--text-main);'
        : (d.label !== '' ? 'padding: 2px 6px; display: flex; align-items: center; justify-content: center;' : '');
      
      html += `
        <div class="interactive-bar" data-index="${i}" data-period="${panelData === currentPeriod ? 'current' : ''}" style="position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; flex: 1; height: 100%; ${isInteractive}">
          <div style="width: 100%; display: flex; justify-content: center; position: absolute; top: 0; bottom: 24px; align-items: flex-end; pointer-events: none;">
            ${d.on_hours > 0 ? `<div style="width: ${barWidth}; background-color: ${color}; height: ${Math.max(1, heightPct)}%; border-radius: 4px 4px 0 0; transition: transform 0.1s, opacity 0.2s;" class="bar-fill"></div>` : ''}
          </div>
          <div class="bar-label" style="position: absolute; bottom: 0; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 0.55rem; color: ${d.isToday ? 'var(--text-main)' : 'var(--text-muted)'}; font-weight: ${d.isToday ? '700' : '600'}; pointer-events: none; white-space: nowrap; width: 100%;">
            <div style="${labelBg}">${d.label}</div>
          </div>
        </div>
      `;
    });
    
    html += `</div>`;
    return html;
  }

  chartHtml += renderPanelBars(prevPeriod);
  chartHtml += renderPanelBars(currentPeriod);
  chartHtml += renderPanelBars(nextPeriod);
  
  chartHtml += `
        </div>
      </div>
  `;
  
  chartWrapper.innerHTML = chartHtml;

  // Animate initial load of current panel bars
  setTimeout(() => {
    const track = document.getElementById('chart-swipe-track');
    if (track) {
      const bars = track.querySelectorAll('.interactive-bar[data-period="current"] .bar-fill');
      bars.forEach((b, idx) => {
        b.style.animation = `grow-up 0.6s ease-out backwards`;
        b.style.animationDelay = `${idx * 0.02}s`;
      });
    }
  }, 10);

  // Bind toggles
  const toggles = chartWrapper.querySelectorAll('.span-toggle');
  toggles.forEach(t => {
    t.addEventListener('click', (e) => {
      const newSpan = e.target.getAttribute('data-span');
      if (newSpan !== currentSpan) {
        currentSpan = newSpan;
        periodOffset = 0; // reset to current period
        renderChartSection();
      }
    });
  });

  // Bind paginators
  const btnPrev = document.getElementById('btn-prev-period');
  const btnNext = document.getElementById('btn-next-period');
  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      const track = document.getElementById('chart-swipe-track');
      if (track) {
         track.style.transform = 'translateX(0%)'; // slide to prev (which is at 0%)
      }
      setTimeout(() => {
        periodOffset++;
        renderChartSection();
      }, 300);
    });
  }
  if (btnNext && periodOffset > 0) {
    btnNext.addEventListener('click', () => {
      const track = document.getElementById('chart-swipe-track');
      if (track) {
         track.style.transform = 'translateX(-66.666%)'; // slide to next
      }
      setTimeout(() => {
        periodOffset--;
        renderChartSection();
      }, 300);
    });
  }

  // Bind Swipe
  const swipeArea = document.getElementById('chart-swipe-area');
  const track = document.getElementById('chart-swipe-track');
  
  if (swipeArea && track) {
    let touchStartX = 0;
    let currentDeltaX = 0;
    let isDragging = false;
    let trackWidth = 0;

    swipeArea.addEventListener('touchstart', e => {
      touchStartX = e.changedTouches[0].screenX;
      isDragging = true;
      trackWidth = swipeArea.offsetWidth;
      track.style.transition = 'none'; // disable transition during drag
    }, {passive: true});

    swipeArea.addEventListener('touchmove', e => {
      if (!isDragging) return;
      const currentX = e.changedTouches[0].screenX;
      currentDeltaX = currentX - touchStartX;
      
      if (periodOffset === 0 && currentDeltaX < 0) {
        currentDeltaX = currentDeltaX * 0.2; // rubber band
      }
      
      // Calculate new translate percentage based on delta
      // Track is 300% width, container is 100% width
      // Base position is -33.333%
      const deltaPct = (currentDeltaX / (trackWidth / 3)) * 33.333;
      const newPos = -33.333 + deltaPct;
      track.style.transform = `translateX(${newPos}%)`;
    }, {passive: true});

    swipeArea.addEventListener('touchend', e => {
      if (!isDragging) return;
      isDragging = false;
      
      const threshold = (trackWidth / 3) * 0.25; // 25% of one panel width
      track.style.transition = 'transform 0.3s ease-out';
      
      if (currentDeltaX < -threshold) {
        if (periodOffset > 0) {
          track.style.transform = `translateX(-66.666%)`;
          setTimeout(() => {
            periodOffset--;
            renderChartSection();
          }, 300);
        } else {
          track.style.transform = `translateX(-33.333%)`;
        }
      } else if (currentDeltaX > threshold) {
        track.style.transform = `translateX(0%)`;
        setTimeout(() => {
          periodOffset++;
          renderChartSection();
        }, 300);
      } else {
        track.style.transform = `translateX(-33.333%)`;
      }
    }, {passive: true});
  }

  bars.forEach(bar => {
    if (bar.getAttribute('data-period') !== 'current') return;

    const handleInteraction = (e) => {
      try {
        bars.forEach(b => {
           if (b.getAttribute('data-period') !== 'current') return;
           const fill = b.querySelector('.bar-fill');
           if (fill) fill.style.opacity = '0.5';
           const label = b.querySelector('.bar-label');
           if (label) label.style.color = 'var(--text-muted)';
        });
        
        const activeFill = bar.querySelector('.bar-fill');
        if (activeFill) activeFill.style.opacity = '1';
        const activeLabel = bar.querySelector('.bar-label');
        if (activeLabel) activeLabel.style.color = 'var(--text-main)';
        
        const idx = parseInt(bar.getAttribute('data-index'));
        const fixedItem = fixedData[idx];
        if (!fixedItem) return;
        
        if (currentSpan === 'Day') {
          // Toast or simple text instead of huge matrix
          const hourLabel = fixedItem.dateObj.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'});
          const mins = Math.round(fixedItem.on_hours * 60);
          showToast(`${hourLabel}: Supplied for ${mins} minutes`, 'success');
          return;
        }

        const dateStr = fixedItem.dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
        const dayData = fixedItem.original || {};
        
        let intervalsHtml = '<div style="color: var(--text-muted); font-style: italic;">Aggregated data only. Update backend to see granular spans.</div>';
        
        if (dayData.intervals && dayData.intervals.length > 0) {
          const onSpans = dayData.intervals.filter(iv => iv.status === 'ON' || iv.status === 'LIKELY_ON');
          if (onSpans.length > 0) {
            intervalsHtml = onSpans.map(iv => {
              const start = formatTime(iv.start_time);
              const endD = new Date(new Date(iv.start_time).getTime() + ((iv.duration_hours || 0) * 3600 * 1000));
              const end = formatTime(endD.toISOString());
              return `<div style="background: var(--bg-surface); padding: 6px 10px; border-radius: 4px; display: inline-block; margin: 4px; border: 1px solid var(--border);">
                        <span style="color: var(--primary); font-weight: 600;">${start} - ${end}</span> 
                        <span style="color: var(--text-muted); margin-left: 6px;">(${formatDuration(iv.duration_hours || 0)})</span>
                      </div>`;
            }).join('');
          } else {
            intervalsHtml = '<div style="color: var(--red); font-weight: 600; padding: 4px;">Total Blackout</div>';
          }
        } else if (fixedItem.on_hours === 0) {
          intervalsHtml = '<div style="color: var(--text-muted); font-weight: 600; padding: 4px;">No power logged on this day.</div>';
        }

        matrixContainer.style.display = 'block';
        matrixContainer.style.animation = 'none';
        void matrixContainer.offsetWidth; // trigger reflow
        matrixContainer.style.animation = 'slide-down 0.3s ease-out';
        matrixContainer.innerHTML = `
          <div style="font-weight: 700; margin-bottom: 8px; display: flex; justify-content: space-between;">
            <span>${dateStr} Log</span>
            <span>${dayData.interruptions || 0} Interruptions</span>
          </div>
          <div style="margin-bottom: 10px;">Total Supply: <strong>${formatDuration(fixedItem.on_hours)}</strong></div>
          <div>${intervalsHtml}</div>
        `;
      } catch (error) {
        console.error("Error in bar interaction:", error);
        showToast('Error: ' + error.message, 'error');
      }
    };

    bar.addEventListener('click', handleInteraction);
  });
  
  // Auto-click the last bar (if not Day view)
  if (hasMatrix && bars.length > 0) {
     bars[bars.length - 1].click();
  }
}
