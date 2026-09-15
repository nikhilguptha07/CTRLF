import type { 
  InvestigationCase, 
  InvestigationStatus, 
  InvestigationNote 
} from '../types/investigation';

/**
 * Initial Pre-seeded Investigation Cases
 * Designed per Phase 5 Specifications (including example case INV-2026-00421)
 */
const INITIAL_CASES: Record<string, InvestigationCase> = {
  'INV-2026-00421': {
    caseId: 'INV-2026-00421',
    objectName: 'Black Tactical Backpack',
    objectClass: 'backpack',
    objectColor: 'Black',
    status: 'ACTIVE',
    priority: 'HIGH',
    searchStartedAt: '14:28:10 UTC',
    firstDetectionAt: '14:32:15 UTC',
    lastDetectionAt: '14:36:40 UTC',
    camerasAnalyzedCount: 4,
    analyzedCameraIds: ['CAM-07', 'CAM-12', 'CAM-18', 'CAM-01'],
    positiveMatchesCount: 3,
    lastKnownLocation: 'Loading Dock West • Perimeter Gate Delta',
    lastKnownCamera: 'CAM-18 (Loading Dock Gate)',
    leadInvestigator: 'Operator Chen',
    assignedUnit: 'Security Operations Center Alpha',
    evidenceHash: '9e2b1f48039c63d8b18a31e84df94ac3257ec8124806b0b2e359a58498f395d1',
    summaryNotes: 'Continuous multi-angle tracking active. Subject unattended near loading dock bay after transit from main corridor axis.',
    primaryEvidenceUrl: '/camera_feed_sample.jpg',
    originalEvidenceUrl: '/camera_feed_sample.jpg',
    primaryConfidence: 94.2,
    cameraJourney: [
      {
        id: 'cj-01',
        stepNumber: 1,
        timestamp: '14:32:15 UTC',
        timeShort: '14:32',
        cameraId: 'CAM-07',
        cameraName: 'CAM-07 (Overhead Sector A)',
        location: 'Desk Surface Alpha • Workspace',
        evidenceFrameUrl: '/camera_feed_sample.jpg',
        originalFrameUrl: '/camera_feed_sample.jpg',
        confidence: 94.8,
        dwellTimeSeconds: 42,
        transitionNote: 'Initial contact logged. Target static on workstation bench surface.',
        boundingBox: { x: 260, y: 380, width: 90, height: 130 },
      },
      {
        id: 'cj-02',
        stepNumber: 2,
        timestamp: '14:34:20 UTC',
        timeShort: '14:34',
        cameraId: 'CAM-12',
        cameraName: 'CAM-12 (Main Corridor West)',
        location: 'West Transit Axis • Zone 2',
        evidenceFrameUrl: '/camera_feed_sample.jpg',
        originalFrameUrl: '/camera_feed_sample.jpg',
        confidence: 91.5,
        dwellTimeSeconds: 18,
        transitionNote: 'Transited western portal towards loading dock staging zone.',
        boundingBox: { x: 420, y: 310, width: 85, height: 120 },
      },
      {
        id: 'cj-03',
        stepNumber: 3,
        timestamp: '14:36:40 UTC',
        timeShort: '14:36',
        cameraId: 'CAM-18',
        cameraName: 'CAM-18 (Loading Dock Gate)',
        location: 'Loading Dock West • Perimeter Gate Delta',
        evidenceFrameUrl: '/camera_feed_sample.jpg',
        originalFrameUrl: '/camera_feed_sample.jpg',
        confidence: 96.4,
        dwellTimeSeconds: 165,
        transitionNote: 'Target stationary at loading staging platform near cargo barrier.',
        boundingBox: { x: 510, y: 410, width: 95, height: 135 },
      },
    ],
    timeline: [
      {
        id: 'tl-01',
        timestamp: '2026-09-15T14:32:15Z',
        timeFormatted: '14:32',
        title: 'First detection',
        description: 'Candidate detected on CAM-07 (Overhead Sector A) with 94.8% confidence score.',
        type: 'FIRST_DETECTION',
        camera: 'CAM-07',
        location: 'Desk Surface Alpha',
      },
      {
        id: 'tl-02',
        timestamp: '2026-09-15T14:34:20Z',
        timeFormatted: '14:34',
        title: 'Camera transition',
        description: 'Target correlated moving along West Corridor to CAM-12 with temporal sequence match.',
        type: 'CAMERA_TRANSITION',
        camera: 'CAM-12',
        location: 'West Transit Axis',
      },
      {
        id: 'tl-03',
        timestamp: '2026-09-15T14:36:40Z',
        timeFormatted: '14:36',
        title: 'Possible match',
        description: 'High-confidence visual candidate acquired on CAM-18 (Loading Dock Gate).',
        type: 'POSSIBLE_MATCH',
        camera: 'CAM-18',
        location: 'Perimeter Gate Delta',
      },
      {
        id: 'tl-04',
        timestamp: '2026-09-15T14:37:10Z',
        timeFormatted: '14:37',
        title: 'Match confirmed',
        description: 'Optical tracking lock engaged. Human operator confirmed target features and texture profile.',
        type: 'MATCH_CONFIRMED',
        operator: 'Operator Chen',
      },
      {
        id: 'tl-05',
        timestamp: '2026-09-15T14:40:00Z',
        timeFormatted: '14:40',
        title: 'Investigation created',
        description: 'Formal investigation case #INV-2026-00421 opened and assigned to SOC Alpha.',
        type: 'INVESTIGATION_CREATED',
        operator: 'Operator Chen',
      },
    ],
    notes: [
      {
        id: 'nt-01',
        timestamp: '2026-09-15T14:41:00Z',
        timeFormatted: '14:41',
        author: 'Operator Chen',
        authorRole: 'Senior Security Analyst',
        content: 'Object verified as black tactical backpack with dual exterior molle webbing and reflective zipper tag. Dispatched ground patrol to Loading Dock Staging Area #2.',
      },
      {
        id: 'nt-02',
        timestamp: '2026-09-15T14:45:30Z',
        timeFormatted: '14:45',
        author: 'Agent Miller',
        authorRole: 'Field Operations Unit',
        content: 'Patrol officer 104 en route to perimeter gate. Area monitored under fixed zoom on CAM-18.',
      },
    ],
    activityLog: [
      {
        id: 'act-01',
        timestamp: '2026-09-15T14:28:10Z',
        timeFormatted: '14:28',
        actor: 'System',
        action: 'Search Query Initiated',
        details: 'Multi-camera sweep started across Sectors 1-4 for "Black Backpack".',
        category: 'AUDIT',
      },
      {
        id: 'act-02',
        timestamp: '2026-09-15T14:37:10Z',
        timeFormatted: '14:37',
        actor: 'Operator Chen',
        action: 'Human Verification Confirmed',
        details: 'Target match confirmed on CAM-18 (96.4% confidence).',
        category: 'VERIFICATION',
      },
      {
        id: 'act-03',
        timestamp: '2026-09-15T14:40:00Z',
        timeFormatted: '14:40',
        actor: 'Operator Chen',
        action: 'Case Docket Created',
        details: 'Case record #INV-2026-00421 registered in Oracle 21c security ledger.',
        category: 'STATUS',
      },
    ],
  },
  'INV-2026-00388': {
    caseId: 'INV-2026-00388',
    objectName: 'Hydro Flask Bottle',
    objectClass: 'bottle',
    objectColor: 'Red',
    status: 'CONFIRMED',
    priority: 'MEDIUM',
    searchStartedAt: '12:15:00 UTC',
    firstDetectionAt: '12:18:22 UTC',
    lastDetectionAt: '12:20:05 UTC',
    camerasAnalyzedCount: 3,
    analyzedCameraIds: ['CAM-01', 'CAM-02', 'CAM-03'],
    positiveMatchesCount: 2,
    lastKnownLocation: 'Conference Hall North • Room 302',
    lastKnownCamera: 'CAM-03 (Conference Hall North)',
    leadInvestigator: 'Chief Reyes',
    assignedUnit: 'Facilities Security',
    evidenceHash: 'c4ca4238a0b923820dcc509a6f75849b257ec8124806b0b2e359a58498f395d2',
    summaryNotes: 'Identified red double-wall insulated bottle forgotten on lecture podium.',
    primaryEvidenceUrl: '/camera_feed_sample.jpg',
    primaryConfidence: 96.8,
    cameraJourney: [
      {
        id: 'cj-bot-01',
        stepNumber: 1,
        timestamp: '12:18:22 UTC',
        timeShort: '12:18',
        cameraId: 'CAM-01',
        cameraName: 'CAM-01 (Overhead Sector A)',
        location: 'Desk Surface Alpha • Workspace',
        evidenceFrameUrl: '/camera_feed_sample.jpg',
        confidence: 96.8,
        transitionNote: 'Left on table edge during morning briefing.',
      },
      {
        id: 'cj-bot-02',
        stepNumber: 2,
        timestamp: '12:20:05 UTC',
        timeShort: '12:20',
        cameraId: 'CAM-03',
        cameraName: 'CAM-03 (Conference Hall North)',
        location: 'Conference Hall North • Room 302',
        evidenceFrameUrl: '/camera_feed_sample.jpg',
        confidence: 95.2,
        transitionNote: 'Carried into presentation hall and set on speaker lectern.',
      },
    ],
    timeline: [
      {
        id: 'tl-bot-01',
        timestamp: '2026-09-15T12:18:22Z',
        timeFormatted: '12:18',
        title: 'First detection',
        description: 'Target spotted on CAM-01 table surface.',
        type: 'FIRST_DETECTION',
        camera: 'CAM-01',
      },
      {
        id: 'tl-bot-02',
        timestamp: '2026-09-15T12:20:05Z',
        timeFormatted: '12:20',
        title: 'Camera transition',
        description: 'Observed moving into Conference Hall North.',
        type: 'CAMERA_TRANSITION',
        camera: 'CAM-03',
      },
      {
        id: 'tl-bot-03',
        timestamp: '2026-09-15T12:22:00Z',
        timeFormatted: '12:22',
        title: 'Match confirmed',
        description: 'Verified by Chief Reyes.',
        type: 'MATCH_CONFIRMED',
        operator: 'Chief Reyes',
      },
    ],
    notes: [
      {
        id: 'nt-bot-01',
        timestamp: '2026-09-15T12:25:00Z',
        timeFormatted: '12:25',
        author: 'Chief Reyes',
        authorRole: 'Security Administrator',
        content: 'Item tagged with visitor ID #409. Ready for retrieval.',
      },
    ],
    activityLog: [
      {
        id: 'act-bot-01',
        timestamp: '2026-09-15T12:15:00Z',
        timeFormatted: '12:15',
        actor: 'Chief Reyes',
        action: 'Case Docket Created',
        details: 'Investigation initiated for lost red flask.',
        category: 'STATUS',
      },
    ],
  },
};

class InvestigationService {
  private cases: Record<string, InvestigationCase> = { ...INITIAL_CASES };

  public getAllCases(): InvestigationCase[] {
    return Object.values(this.cases);
  }

  public getCase(caseId: string): InvestigationCase | null {
    return this.cases[caseId] || null;
  }

  public getDefaultCaseId(): string {
    return 'INV-2026-00421';
  }

  public updateCaseStatus(caseId: string, status: InvestigationStatus, operator = 'Operator Chen', note?: string): InvestigationCase | null {
    const targetCase = this.cases[caseId];
    if (!targetCase) return null;

    targetCase.status = status;

    const now = new Date();
    const timeFormatted = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // Append to timeline
    const timelineType = status === 'CONFIRMED' 
      ? 'MATCH_CONFIRMED' 
      : status === 'RECOVERED' 
        ? 'RECOVERED' 
        : 'CLOSED';

    targetCase.timeline.push({
      id: `tl-${Date.now()}`,
      timestamp: now.toISOString(),
      timeFormatted,
      title: status === 'CONFIRMED' ? 'Match confirmed' : status === 'RECOVERED' ? 'Object marked recovered' : 'Investigation closed',
      description: note || `Investigation status updated to ${status} by ${operator}.`,
      type: timelineType,
      operator,
    });

    // Append to activity log
    targetCase.activityLog.unshift({
      id: `act-${Date.now()}`,
      timestamp: now.toISOString(),
      timeFormatted,
      actor: operator,
      action: `Status Changed to ${status}`,
      details: note || `Status transitioned to ${status}`,
      category: 'STATUS',
    });

    return { ...targetCase };
  }

  public addNote(caseId: string, content: string, author = 'Operator Chen', authorRole = 'Security Analyst'): InvestigationNote | null {
    const targetCase = this.cases[caseId];
    if (!targetCase || !content.trim()) return null;

    const now = new Date();
    const timeFormatted = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const newNote: InvestigationNote = {
      id: `nt-${Date.now()}`,
      timestamp: now.toISOString(),
      timeFormatted,
      author,
      authorRole,
      content: content.trim(),
    };

    targetCase.notes.unshift(newNote);

    targetCase.activityLog.unshift({
      id: `act-${Date.now()}`,
      timestamp: now.toISOString(),
      timeFormatted,
      actor: author,
      action: 'Case Note Added',
      details: content.length > 50 ? `${content.slice(0, 50)}...` : content,
      category: 'AUDIT',
    });

    return newNote;
  }

  /**
   * Spawns an investigation case from an active search result (Phase 4 integration)
   */
  public createFromSearch(params: {
    objectName: string;
    camera: string;
    location: string;
    confidence: number;
    evidenceUrl?: string;
    timestamp?: string;
    operator?: string;
  }): InvestigationCase {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    const caseId = `INV-2026-${randomNum}`;

    const now = new Date();
    const timeFormatted = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const op = params.operator || 'Operator Chen';

    const newCase: InvestigationCase = {
      caseId,
      objectName: params.objectName || 'Detected Target',
      objectClass: params.objectName?.toLowerCase().includes('backpack') ? 'backpack' : 'bottle',
      status: 'CONFIRMED',
      priority: 'HIGH',
      searchStartedAt: `${now.getHours().toString().padStart(2, '0')}:${(now.getMinutes() - 2).toString().padStart(2, '0')}:00 UTC`,
      firstDetectionAt: params.timestamp || `${timeFormatted}:12 UTC`,
      lastDetectionAt: params.timestamp || `${timeFormatted}:45 UTC`,
      camerasAnalyzedCount: 4,
      analyzedCameraIds: ['CAM-07', 'CAM-12', 'CAM-18', 'CAM-01'],
      positiveMatchesCount: 2,
      lastKnownLocation: params.location || 'Desk Surface Alpha • Zone 1',
      lastKnownCamera: params.camera || 'CAM-01 (Overhead Sector A)',
      leadInvestigator: op,
      assignedUnit: 'Security Operations Center Alpha',
      evidenceHash: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      summaryNotes: `High-confidence optical tracking match for ${params.objectName}. Verified by security operator.`,
      primaryEvidenceUrl: params.evidenceUrl || '/camera_feed_sample.jpg',
      originalEvidenceUrl: params.evidenceUrl || '/camera_feed_sample.jpg',
      primaryConfidence: params.confidence || 94.5,
      cameraJourney: [
        {
          id: `cj-${Date.now()}-1`,
          stepNumber: 1,
          timestamp: `${timeFormatted}:12 UTC`,
          timeShort: timeFormatted,
          cameraId: 'CAM-07',
          cameraName: 'CAM-07 (Overhead Sector A)',
          location: 'Desk Surface Alpha • Workspace',
          evidenceFrameUrl: params.evidenceUrl || '/camera_feed_sample.jpg',
          confidence: params.confidence || 94.5,
          dwellTimeSeconds: 52,
          transitionNote: 'Candidate spotted in initial field of view.',
        },
        {
          id: `cj-${Date.now()}-2`,
          stepNumber: 2,
          timestamp: `${timeFormatted}:45 UTC`,
          timeShort: timeFormatted,
          cameraId: params.camera.startsWith('CAM') ? params.camera.split(' ')[0] : 'CAM-12',
          cameraName: params.camera || 'CAM-12 (Main Corridor West)',
          location: params.location || 'West Transit Axis',
          evidenceFrameUrl: params.evidenceUrl || '/camera_feed_sample.jpg',
          confidence: Math.max(90, (params.confidence || 94) - 1.5),
          dwellTimeSeconds: 120,
          transitionNote: 'Optical tracking lock established.',
        },
      ],
      timeline: [
        {
          id: `tl-${Date.now()}-1`,
          timestamp: now.toISOString(),
          timeFormatted,
          title: 'First detection',
          description: `Identified ${params.objectName} on ${params.camera} with ${(params.confidence || 94.5).toFixed(1)}% inference score.`,
          type: 'FIRST_DETECTION',
          camera: params.camera,
          location: params.location,
        },
        {
          id: `tl-${Date.now()}-2`,
          timestamp: now.toISOString(),
          timeFormatted,
          title: 'Match confirmed',
          description: `Target verified by operator ${op}. Optical reticle locked.`,
          type: 'MATCH_CONFIRMED',
          operator: op,
        },
        {
          id: `tl-${Date.now()}-3`,
          timestamp: now.toISOString(),
          timeFormatted,
          title: 'Investigation created',
          description: `Official case docket #${caseId} generated from live surveillance feed.`,
          type: 'INVESTIGATION_CREATED',
          operator: op,
        },
      ],
      notes: [
        {
          id: `nt-${Date.now()}-1`,
          timestamp: now.toISOString(),
          timeFormatted,
          author: op,
          authorRole: 'Security Operator',
          content: `Automated case docket spawned from successful real-time search verification for ${params.objectName}.`,
        },
      ],
      activityLog: [
        {
          id: `act-${Date.now()}-1`,
          timestamp: now.toISOString(),
          timeFormatted,
          actor: op,
          action: 'Investigation Created',
          details: `Docket #${caseId} registered.`,
          category: 'STATUS',
        },
      ],
    };

    this.cases[caseId] = newCase;
    return newCase;
  }
}

export const investigationService = new InvestigationService();
