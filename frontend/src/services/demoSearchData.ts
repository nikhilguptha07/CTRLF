export interface DemoCameraNode {
  id: string;
  name: string;
  zone: string;
  status: 'ONLINE' | 'SCANNING' | 'LOCKED' | 'OFFLINE';
}

/**
 * Centralized Demo Data Repository for Phase 4 Find Object Workflow
 * Ensures reproducible, high-fidelity demo runs when backend CV engine is in offline or mock mode.
 */
export const DEMO_CAMERA_NETWORK: DemoCameraNode[] = [
  { id: 'CAM-01', name: 'CAM-01 (Overhead Sector A)', zone: 'Desk Surface Alpha', status: 'SCANNING' },
  { id: 'CAM-02', name: 'CAM-02 (Perimeter Corridor)', zone: 'West Transit Axis', status: 'SCANNING' },
  { id: 'CAM-03', name: 'CAM-03 (Conference Hall North)', zone: 'Meeting Hall Entrance', status: 'SCANNING' },
  { id: 'CAM-04', name: 'CAM-04 (Loading Dock West)', zone: 'Perimeter Gate Delta', status: 'SCANNING' },
];

export function getDemoDetectionForQuery(query: string, cameraId?: string, location?: string) {
  const q = (query || '').toLowerCase();
  let objName = query || 'Bottle';
  let cam = cameraId && cameraId !== 'ALL' ? cameraId : 'CAM-01 (Overhead Sector A)';
  let loc = location && location !== 'All Monitored Sectors' ? location : 'Desk Surface Alpha';
  let conf = 94.5;

  if (q.includes('backpack') || q.includes('bag')) {
    objName = 'Tactical Backpack';
    cam = cameraId && cameraId !== 'ALL' ? cameraId : 'CAM-02 (Perimeter Corridor)';
    loc = location && location !== 'All Monitored Sectors' ? location : 'West Transit Axis';
    conf = 92.5;
  } else if (q.includes('laptop') || q.includes('macbook')) {
    objName = 'MacBook Pro';
    cam = cameraId && cameraId !== 'ALL' ? cameraId : 'CAM-03 (Conference Hall North)';
    loc = location && location !== 'All Monitored Sectors' ? location : 'Meeting Hall Entrance';
    conf = 88.1;
  } else if (q.includes('bottle') || q.includes('flask')) {
    objName = 'Hydro Flask Bottle';
    cam = cameraId && cameraId !== 'ALL' ? cameraId : 'CAM-01 (Overhead Sector A)';
    loc = location && location !== 'All Monitored Sectors' ? location : 'Desk Surface Alpha';
    conf = 96.4;
  }

  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')} UTC`;

  return {
    objectName: objName,
    confidence: conf,
    timestamp: timeStr,
    camera: cam,
    location: loc,
    found: true,
    evidenceUrl: '/camera_feed_sample.jpg',
    originalUrl: '/camera_feed_sample.jpg',
    boundingBox: { x: 276, y: 442, width: 36, height: 108 },
    trackId: 104,
  };
}
