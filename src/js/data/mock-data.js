/* ======================================================
   UP NEPA — Mock Data
   8 areas in Magboro with realistic status data
   ====================================================== */

export const AREAS = [
  {
    id: 'area-pipeline',
    name: 'Pipeline Road',
    city: 'Magboro',
    state: 'Ogun',
  },
  {
    id: 'area-arepo',
    name: 'Arepo',
    city: 'Magboro',
    state: 'Ogun',
  },
  {
    id: 'area-owoade',
    name: 'Owoade',
    city: 'Magboro',
    state: 'Ogun',
  },
  {
    id: 'area-likosi',
    name: 'Likosi',
    city: 'Magboro',
    state: 'Ogun',
  },
  {
    id: 'area-opic',
    name: 'Opic Estate',
    city: 'Magboro',
    state: 'Ogun',
  },
  {
    id: 'area-kosoko',
    name: 'Kosoko',
    city: 'Magboro',
    state: 'Ogun',
  },
  {
    id: 'area-ibafo',
    name: 'Ibafo',
    city: 'Magboro',
    state: 'Ogun',
  },
  {
    id: 'area-premier',
    name: 'Premier Junction',
    city: 'Magboro',
    state: 'Ogun',
  },
];

/**
 * Generate mock area statuses with realistic timestamps.
 * Called once on app init to seed the store.
 */
export function generateMockStatuses() {
  const now = Date.now();

  return {
    'area-pipeline': {
      areaId: 'area-pipeline',
      currentStatus: 'ON',
      confidence: 0.85,
      reportCount: 6,
      lastUpdated: new Date(now - 8 * 60 * 1000).toISOString(), // 8 mins ago
    },
    'area-arepo': {
      areaId: 'area-arepo',
      currentStatus: 'ON',
      confidence: 0.72,
      reportCount: 4,
      lastUpdated: new Date(now - 4 * 60 * 1000).toISOString(), // 4 mins ago
    },
    'area-owoade': {
      areaId: 'area-owoade',
      currentStatus: 'OFF',
      confidence: 0.91,
      reportCount: 7,
      lastUpdated: new Date(now - 12 * 60 * 1000).toISOString(), // 12 mins ago
    },
    'area-likosi': {
      areaId: 'area-likosi',
      currentStatus: 'ON',
      confidence: 0.6,
      reportCount: 3,
      lastUpdated: new Date(now - 65 * 60 * 1000).toISOString(), // 65 mins ago
    },
    'area-opic': {
      areaId: 'area-opic',
      currentStatus: 'OFF',
      confidence: 0.78,
      reportCount: 5,
      lastUpdated: new Date(now - 25 * 60 * 1000).toISOString(), // 25 mins ago
    },
    'area-kosoko': {
      areaId: 'area-kosoko',
      currentStatus: 'UNCONFIRMED',
      confidence: 0,
      reportCount: 0,
      lastUpdated: new Date(now - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
    },
    'area-ibafo': {
      areaId: 'area-ibafo',
      currentStatus: 'LIKELY_ON',
      confidence: 0.45,
      reportCount: 2,
      lastUpdated: new Date(now - 100 * 60 * 1000).toISOString(), // 100 mins ago
    },
    'area-premier': {
      areaId: 'area-premier',
      currentStatus: 'ON',
      confidence: 0.95,
      reportCount: 9,
      lastUpdated: new Date(now - 2 * 60 * 1000).toISOString(), // 2 mins ago
    },
  };
}

/**
 * Generate mock report history for the current user.
 */
export function generateMockReports(userId, areaId) {
  const now = Date.now();
  return [
    {
      id: 'report-1',
      userId,
      areaId,
      status: 'ON',
      createdAt: new Date(now - 8 * 60 * 1000).toISOString(),
    },
    {
      id: 'report-2',
      userId,
      areaId,
      status: 'OFF',
      createdAt: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'report-3',
      userId,
      areaId,
      status: 'ON',
      createdAt: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}
