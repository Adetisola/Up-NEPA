


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

    content.innerHTML = `
      <div id="chart-wrapper"></div>
      
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

    renderChartSection('7D');

  } catch (err) {
    console.error('Error fetching expanded analytics:', err);
    const content = document.getElementById('analytics-content');
    if (content) content.innerHTML = '<div style="color: var(--amber); text-align: center;">Failed to load analytics</div>';
  }
}

function renderChartSection(span) {
  const chartWrapper = document.getElementById('chart-wrapper');
  if (!chartWrapper || !globalAnalyticsData) return;

  const allDaily = globalAnalyticsData.daily_stats_parsed;
  const allMonthly = globalAnalyticsData.monthly_stats_parsed;

  let fixedData = [];
  let hasMatrix = false;
  const now = new Date();
  
  if (span === '7D') {
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const match = allDaily.find(x => x.report_date === dateStr);
      fixedData.push({
        dateObj: d,
        label: d.toLocaleDateString('en-US', { weekday: 'short' }), // Mon, Tue...
        on_hours: match ? match.on_hours : 0,
        isToday: i === 0,
        original: match
      });
    }
    hasMatrix = true;
  } else if (span === '30D') {
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const match = allDaily.find(x => x.report_date === dateStr);
      fixedData.push({
        dateObj: d,
        // Only show label every 5 days to avoid clutter
        label: (i % 5 === 0 || i === 0) ? d.getDate() : '',
        on_hours: match ? match.on_hours : 0,
        isToday: i === 0,
        original: match
      });
    }
    hasMatrix = true;
  } else if (span === '1Y') {
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setDate(1); // avoid end of month shifting bugs
      d.setMonth(now.getMonth() - i);
      const monthStr = d.toISOString().substring(0, 7);
      const match = allMonthly.find(x => x.report_month === monthStr);
      const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      fixedData.push({
        dateObj: d,
        label: d.toLocaleDateString('en-US', { month: 'short' }), // Jan, Feb...
        on_hours: match ? (match.on_hours / daysInMonth) : 0, // average daily hours
        isToday: i === 0,
        original: match
      });
    }
    hasMatrix = false;
  }

  // Calculate average
  let totalHours = 0;
  let totalDaysInDataset = fixedData.length;
  fixedData.forEach(d => totalHours += d.on_hours);
  const avgDailyHours = totalDaysInDataset > 0 ? (totalHours / totalDaysInDataset) : 0;
  
  const maxAxisValue = span === '1Y' ? 24 : 24; // Always 24 for daily avg/sum
  
  let chartHtml = `
    <div class="card" style="margin-bottom: 20px; padding: 20px 16px;">
      <!-- Header & Toggle -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px;">
        <div>
          <h3 style="font-size: 1.1rem; margin: 0; margin-bottom: 4px; font-weight: 700;">Supply Log</h3>
          <div style="font-size: 0.85rem; color: var(--text-muted);">Avg: <strong style="color:var(--text-main); font-weight: 700;">${formatDuration(avgDailyHours)} / day</strong></div>
        </div>
        
        <div style="background: var(--bg-surface); padding: 4px; border-radius: 20px; display: flex; gap: 2px;">
          <button class="span-toggle ${span === '7D' ? 'active' : ''}" data-span="7D" style="border:none; background:${span === '7D' ? 'var(--primary-fade)' : 'transparent'}; color:${span === '7D' ? 'var(--primary)' : 'var(--text-muted)'}; padding: 4px 12px; border-radius: 16px; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">7D</button>
          <button class="span-toggle ${span === '30D' ? 'active' : ''}" data-span="30D" style="border:none; background:${span === '30D' ? 'var(--primary-fade)' : 'transparent'}; color:${span === '30D' ? 'var(--primary)' : 'var(--text-muted)'}; padding: 4px 12px; border-radius: 16px; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">30D</button>
          <button class="span-toggle ${span === '1Y' ? 'active' : ''}" data-span="1Y" style="border:none; background:${span === '1Y' ? 'var(--primary-fade)' : 'transparent'}; color:${span === '1Y' ? 'var(--primary)' : 'var(--text-muted)'}; padding: 4px 12px; border-radius: 16px; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">1Y</button>
        </div>
      </div>
      
      <!-- Chart Area -->
      <div style="position: relative; height: 180px; margin-bottom: 10px; padding-right: 30px; padding-left: 10px;">
        
        <!-- Y-Axis Grid (Right Aligned, Solid Subtle Lines) -->
        <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 24px; display: flex; flex-direction: column; justify-content: space-between; pointer-events: none;">
          <div style="border-top: 1px solid rgba(255,255,255,0.05); position: relative; width: 100%;">
             <span style="position: absolute; right: 0; top: -7px; font-size: 0.65rem; color: var(--text-muted); text-align: right; width: 25px;">24 h</span>
          </div>
          <div style="border-top: 1px solid rgba(255,255,255,0.05); position: relative; width: 100%;">
             <span style="position: absolute; right: 0; top: -7px; font-size: 0.65rem; color: var(--text-muted); text-align: right; width: 25px;">12 h</span>
          </div>
          <div style="border-top: 1px solid rgba(255,255,255,0.05); position: relative; width: 100%;">
             <span style="position: absolute; right: 0; top: -7px; font-size: 0.65rem; color: var(--text-muted); text-align: right; width: 25px;">0 h</span>
          </div>
        </div>

        <!-- Bars Container -->
        <div id="bar-chart-container" style="display: flex; align-items: flex-end; justify-content: space-between; height: 100%; position: relative; z-index: 1; overflow-x: auto; scrollbar-width: none; gap: ${span === '30D' ? '2px' : '0'};">
  `;
  
  fixedData.forEach((d, i) => {
    const heightPct = Math.min((d.on_hours / maxAxisValue) * 100, 100);
    const color = d.on_hours >= 12 ? 'var(--green)' : 'var(--primary)';
    const isInteractive = hasMatrix ? 'cursor: pointer;' : '';
    
    let barWidth = '16px';
    if (span === '30D') barWidth = '6px';
    if (span === '1Y') barWidth = '14px';

    const labelBg = d.isToday ? 'background-color: var(--border-light); border-radius: 12px; padding: 2px 6px; display: flex; align-items: center; justify-content: center; color: var(--text-main);' : 'padding: 2px 6px; display: flex; align-items: center; justify-content: center;';
    
    chartHtml += `
      <div class="interactive-bar" data-index="${i}" style="display: flex; flex-direction: column; align-items: center; justify-content: flex-end; flex: ${span === '30D' ? '0 0 auto' : '1'}; min-width: ${span === '30D' ? '12px' : 'auto'}; height: 100%; ${isInteractive}">
        <div style="width: 100%; display: flex; justify-content: center; height: calc(100% - 24px); align-items: flex-end;">
          ${d.on_hours > 0 ? `<div style="width: ${barWidth}; background-color: ${color}; height: ${Math.max(2, heightPct)}%; border-radius: 4px 4px 0 0; transition: transform 0.1s, opacity 0.2s; animation: grow-up 0.6s ease-out backwards; animation-delay: ${i * 0.02}s;" class="bar-fill"></div>` : ''}
        </div>
        <div class="bar-label" style="font-size: ${span === '30D' ? '0.55rem' : '0.65rem'}; color: ${d.isToday ? 'var(--text-main)' : 'var(--text-muted)'}; font-weight: ${d.isToday ? '700' : '600'}; margin-top: 4px;">
          <div style="${labelBg}">${d.label}</div>
        </div>
      </div>
    `;
  });
  
  chartHtml += `
        </div>
      </div>
      
      ${hasMatrix ? `<div style="text-align: left; font-size: 0.75rem; color: var(--text-muted); margin-top: 15px;">Tap any bar to see detailed log matrix.</div>` : ''}
      <div id="matrix-container" style="display: none; margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.05); font-size: 0.85rem;"></div>
    </div>
  `;

  chartWrapper.innerHTML = chartHtml;

  // Bind toggles
  const toggles = chartWrapper.querySelectorAll('.span-toggle');
  toggles.forEach(t => {
    t.addEventListener('click', (e) => {
      const newSpan = e.target.getAttribute('data-span');
      if (newSpan !== span) {
        renderChartSection(newSpan);
      }
    });
  });

  // Bind bars for Matrix
  if (hasMatrix) {
    const bars = chartWrapper.querySelectorAll('.interactive-bar');
    const matrixContainer = document.getElementById('matrix-container');
    
    bars.forEach(bar => {
      bar.addEventListener('click', () => {
        bars.forEach(b => {
           const fill = b.querySelector('.bar-fill');
           if (fill) fill.style.opacity = '0.5';
           b.querySelector('.bar-label').style.color = 'var(--text-muted)';
        });
        const activeFill = bar.querySelector('.bar-fill');
        if (activeFill) activeFill.style.opacity = '1';
        bar.querySelector('.bar-label').style.color = 'var(--text-main)';
        
        const idx = parseInt(bar.getAttribute('data-index'));
        const fixedItem = fixedData[idx];
        if (!fixedItem) return;
        
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
                        <span style="color: var(--primary); font-weight: 600;">${start} → ${end}</span> 
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
      });
    });
    
    // Auto-click the last bar
    if (bars.length > 0) {
       bars[bars.length - 1].click();
       // scroll to end if 30D
       if (span === '30D') {
         const container = document.getElementById('bar-chart-container');
         container.scrollLeft = container.scrollWidth;
       }
    }
  }
}

function formatDuration(hours) { return hours + 'h'; }
globalAnalyticsData = { 
  daily_stats_parsed: [
    { report_date: new Date().toISOString().split('T')[0], on_hours: 5, interruptions: 1, intervals: [] }
  ], 
  monthly_stats_parsed: [] 
};
renderChartSection('7D');
console.log('Bars found:', document.querySelectorAll('.interactive-bar').length);
try {
  document.querySelectorAll('.interactive-bar')[6].click();
  console.log('Matrix display:', document.getElementById('matrix-container').style.display);
  console.log('Matrix content:', document.getElementById('matrix-container').innerHTML);
} catch (e) {
  console.error('Click error:', e);
}
