import { JSDOM } from 'jsdom';
const dom = new JSDOM(`<!DOCTYPE html><html><body><div id='chart-wrapper'></div><div id='analytics-content'></div></body></html>`);
global.document = dom.window.document;
global.window = dom.window;

import fs from 'fs';
let code = fs.readFileSync('src/js/analytics.js', 'utf8');
code = code.replace(/import .*;/g, '');
code += `
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
`;
fs.writeFileSync('test_analytics.mjs', code);
