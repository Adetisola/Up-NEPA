/* ======================================================
   UP NEPA — Status Engine
   Confidence-weighted status calculation
   ====================================================== */

/**
 * Status states from the spec:
 * - ON          → 3+ weighted reports agreeing power ON in last 90 mins
 * - OFF         → 3+ weighted reports agreeing power OFF in last 90 mins
 * - LIKELY_ON   → Fewer than 3 reports but leaning ON
 * - LIKELY_OFF  → Fewer than 3 reports but leaning OFF
 * - UNCONFIRMED → No reports in last 2 hours OR conflicting reports
 */

const CONFIRMED_THRESHOLD = 3;        // Reports needed for confirmed status
const RECENT_WINDOW_MS = 90 * 60 * 1000;   // 90 minutes
const STALE_WINDOW_MS = 120 * 60 * 1000;   // 2 hours

/**
 * Calculate time-decay weight for a report.
 * Recent reports have more weight.
 * @param {number} ageMs - Age of the report in milliseconds
 * @returns {number} Weight between 0 and 1
 */
function timeDecayWeight(ageMs) {
  // Exponential decay: half-life of 45 minutes
  const halfLife = 45 * 60 * 1000;
  return Math.pow(0.5, ageMs / halfLife);
}

/**
 * Calculate area status from a set of reports.
 * @param {Array} reports - Array of { status: 'ON'|'OFF', createdAt, reliability }
 * @returns {{ currentStatus, confidence, reportCount }}
 */
export function calculateAreaStatus(reports) {
  const now = Date.now();

  // Filter to recent reports only
  const recentReports = reports.filter((r) => {
    const age = now - new Date(r.createdAt).getTime();
    return age <= STALE_WINDOW_MS;
  });

  if (recentReports.length === 0) {
    return {
      currentStatus: 'UNCONFIRMED',
      confidence: 0,
      reportCount: 0,
    };
  }

  // Calculate weighted ON vs OFF scores
  let onScore = 0;
  let offScore = 0;
  let onCount = 0;
  let offCount = 0;

  for (const report of recentReports) {
    const age = now - new Date(report.createdAt).getTime();
    const timeWeight = timeDecayWeight(age);
    const reliability = report.reliability || 0.5;
    const weight = timeWeight * (0.5 + reliability * 0.5); // Combined weight

    if (report.status === 'ON') {
      onScore += weight;
      onCount++;
    } else {
      offScore += weight;
      offCount++;
    }
  }

  const totalScore = onScore + offScore;
  const dominantIsOn = onScore >= offScore;
  const dominantCount = dominantIsOn ? onCount : offCount;
  const ratio = totalScore > 0
    ? (dominantIsOn ? onScore : offScore) / totalScore
    : 0;

  // Determine status
  let currentStatus;
  if (dominantCount >= CONFIRMED_THRESHOLD && ratio >= 0.6) {
    currentStatus = dominantIsOn ? 'ON' : 'OFF';
  } else if (dominantCount >= 1 && ratio >= 0.5) {
    currentStatus = dominantIsOn ? 'LIKELY_ON' : 'LIKELY_OFF';
  } else {
    currentStatus = 'UNCONFIRMED';
  }

  return {
    currentStatus,
    confidence: Math.round(ratio * 100) / 100,
    reportCount: recentReports.length,
  };
}

/**
 * Get display-friendly status label.
 */
export function getStatusLabel(status) {
  switch (status) {
    case 'ON': return 'LIGHT IS UP';
    case 'OFF': return 'LIGHT IS OUT';
    case 'LIKELY_ON': return 'POSSIBLE — UNCONFIRMED';
    case 'LIKELY_OFF': return 'PROBABLY OUT';
    case 'UNSTABLE': return 'UNSTABLE / FLICKERING';
    case 'UNCONFIRMED':
    default: return 'UNCONFIRMED';
  }
}

/**
 * Get status type for CSS class.
 */
export function getStatusType(status) {
  switch (status) {
    case 'ON':
      return 'on';
    case 'LIKELY_ON':
    case 'UNSTABLE':
      return 'amber';
    case 'OFF':
    case 'LIKELY_OFF':
      return 'off';
    default:
      return 'unknown';
  }
}

/**
 * Get status emoji/icon.
 */
export function getStatusIcon(status) {
  switch (status) {
    case 'ON':
    case 'LIKELY_ON':
    case 'UNSTABLE':
      return '⚡';
    case 'OFF':
    case 'LIKELY_OFF':
      return '🔴';
    default:
      return '—';
  }
}

/**
 * Get short status text for nearby area list.
 */
export function getStatusShort(status) {
  switch (status) {
    case 'ON': return 'ON';
    case 'LIKELY_ON': return 'POSS';
    case 'UNSTABLE': return 'FLSH';
    case 'OFF': return 'OFF';
    case 'LIKELY_OFF': return 'OFF?';
    case 'UNCONFIRMED':
    default: return '—';
  }
}
