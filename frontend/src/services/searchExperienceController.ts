/**
 * CONTROL F — SearchExperienceController
 * Phase 14: Mandatory CCTV Search Experience & Synchronized Result Revealing
 *
 * Authoritative State Machine:
 * IDLE -> INITIALIZING -> ANALYZING + CCTV_SCANNING -> CCTV_SCAN_COMPLETE -> FINALIZING -> TARGET_ACQUIRED or NOT_DETECTED -> RESULT
 *
 * Rules:
 * 1. CCTV 360° search experience MUST be a mandatory intermediate stage for EVERY video search.
 * 2. CCTV screen opens immediately upon clicking "Search This Video".
 * 3. CCTV performs EXACTLY ONE 360° horizontal rotation (0° -> 360°), then stops.
 * 4. Video analysis runs in parallel without blocking CCTV animation.
 * 5. Completion requires BOTH:
 *    - analysisComplete === true
 *    - rotationComplete === true
 * 6. If analysis finishes first, CCTV continues until reaching 360°.
 * 7. If CCTV finishes first (at 360°), CCTV stops, status shows "FINALIZING", waiting for analysis.
 * 8. If Target Found:
 *    - CCTV turns GREEN
 *    - CCTV smoothly aims toward LAST KNOWN VIEW POSITION (from real lastTargetObservation)
 *    - In-scene TARGET ACQUIRED display
 *    - Then transition to Results
 * 9. If Target Not Found:
 *    - CCTV turns RED
 *    - CCTV remains at final scan position
 *    - In-scene NOT DETECTED display
 *    - Then transition to Results
 * 10. Watchdog timeout prevents hanging indefinitely.
 */

import { soundService } from './soundService';

export type SearchControllerState =
  | 'IDLE'
  | 'INITIALIZING'
  | 'ANALYZING'
  | 'CCTV_SCANNING'
  | 'CCTV_SCAN_COMPLETE'
  | 'FINALIZING'
  | 'TARGET_ACQUIRED'
  | 'NOT_DETECTED'
  | 'ERROR'
  | 'RESULT';

export interface ControllerCallbacks {
  onStateChange: (state: SearchControllerState) => void;
  onCCTVGreenLock: () => void;
  onCCTVRedLock: () => void;
  onShowResults: () => void;
  onError?: (errorMessage: string) => void;
}

export class SearchExperienceController {
  private static instance: SearchExperienceController;

  private state: SearchControllerState = 'IDLE';
  private rotationStarted: boolean = false;
  private rotationComplete: boolean = false;
  private analysisComplete: boolean = false;
  private targetFound: boolean = false;
  private scanAngleDeg: number = 0;
  private postLockTimer: any = null;
  private watchdogTimer: any = null;
  private callbacks: ControllerCallbacks | null = null;
  private lastLoggedDeg: number = -1;

  private readonly WATCHDOG_TIMEOUT_MS = 60000; // 60s max before explicit error

  private constructor() {}

  public static getInstance(): SearchExperienceController {
    if (!SearchExperienceController.instance) {
      SearchExperienceController.instance = new SearchExperienceController();
    }
    return SearchExperienceController.instance;
  }

  public registerCallbacks(callbacks: ControllerCallbacks) {
    this.callbacks = callbacks;
  }

  public getState(): SearchControllerState {
    return this.state;
  }

  public isRotationStarted(): boolean {
    return this.rotationStarted;
  }

  public isRotationComplete(): boolean {
    return this.rotationComplete;
  }

  public isAnalysisComplete(): boolean {
    return this.analysisComplete;
  }

  public getScanAngleDeg(): number {
    return this.scanAngleDeg;
  }

  private setState(newState: SearchControllerState) {
    if (this.state === newState) return;
    this.state = newState;
    console.log(`[CTRL-F] state=${this.state}`);
    this.callbacks?.onStateChange(this.state);
  }

  private startWatchdog() {
    this.clearWatchdog();
    this.watchdogTimer = setTimeout(() => {
      if (['INITIALIZING', 'ANALYZING', 'CCTV_SCANNING', 'CCTV_SCAN_COMPLETE', 'FINALIZING'].includes(this.state)) {
        console.error(`[CTRL-F] WATCHDOG FIRED! Search remained in ${this.state} longer than ${this.WATCHDOG_TIMEOUT_MS / 1000}s`);
        this.notifyError(`Search processing timed out after ${this.WATCHDOG_TIMEOUT_MS / 1000}s`);
      }
    }, this.WATCHDOG_TIMEOUT_MS);
  }

  private clearWatchdog() {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  /**
   * Called immediately when user triggers search ("SEARCH THIS VIDEO").
   * Enters INITIALIZING, starts watchdog, then enters ANALYZING + CCTV_SCANNING.
   */
  public startSearch() {
    if (this.postLockTimer) {
      clearTimeout(this.postLockTimer);
      this.postLockTimer = null;
    }
    this.clearWatchdog();

    this.rotationStarted = true;
    this.rotationComplete = false;
    this.analysisComplete = false;
    this.targetFound = false;
    this.scanAngleDeg = 0;
    this.lastLoggedDeg = -1;

    // Step 1: INITIALIZING
    this.setState('INITIALIZING');
    this.startWatchdog();

    // Step 2: ANALYZING + CCTV_SCANNING
    setTimeout(() => {
      if (this.state === 'INITIALIZING') {
        this.setState('CCTV_SCANNING');
      }
    }, 50);
  }

  /**
   * Called by the CCTV render loop as rotation progresses.
   * angleDeg is between 0 and 360.
   */
  public notifyRotationProgress(angleDeg: number, isComplete: boolean = false) {
    const rounded = Math.min(360, Math.max(0, Math.round(angleDeg)));
    this.scanAngleDeg = rounded;

    // Log progress at 30-degree increments to avoid console spam
    if (Math.abs(rounded - this.lastLoggedDeg) >= 30 || (isComplete && this.lastLoggedDeg !== 360)) {
      this.lastLoggedDeg = rounded;
      console.log(`[CTRL-F] cctvRotation=${rounded}° (progress=${((rounded / 360) * 100).toFixed(0)}%)`);
    }

    if (isComplete && !this.rotationComplete) {
      this.notifyRotationComplete();
    }
  }

  /**
   * Called when exactly 1 complete 360° sweep has finished.
   */
  public notifyRotationComplete() {
    if (this.rotationComplete) return;
    this.rotationComplete = true;
    this.scanAngleDeg = 360;
    console.log('[CTRL-F] cctvScanComplete=true');

    if (!this.analysisComplete) {
      // CCTV finished 360° first: stop and wait for analysis
      this.setState('CCTV_SCAN_COMPLETE');
      setTimeout(() => {
        if (this.state === 'CCTV_SCAN_COMPLETE' && !this.analysisComplete) {
          this.setState('FINALIZING');
        }
      }, 100);
      return;
    }

    // Both are complete!
    this.evaluateAndTransition();
  }

  /**
   * Called when background analysis reports progress.
   */
  public notifyAnalysisProgress(progressPercent: number, stageName?: string) {
    console.log(`[CTRL-F] analysisProgress=${progressPercent.toFixed(1)}% stage=${stageName || this.state}`);
  }

  /**
   * Called when the real backend video analysis pipeline has completed.
   */
  public notifyAnalysisComplete(isTargetFound: boolean) {
    this.analysisComplete = true;
    this.targetFound = isTargetFound;
    console.log(`[CTRL-F] analysisComplete=true finalResult=${isTargetFound ? 'TARGET_FOUND' : 'NOT_DETECTED'}`);

    if (!this.rotationComplete) {
      // Analysis finished first: CCTV continues rotating until 360° sweep completes.
      console.log('[CTRL-F] Analysis finished early; CCTV will continue until 360° scan completes.');
      return;
    }

    // Both CCTV scan and analysis are complete!
    this.evaluateAndTransition();
  }

  /**
   * Evaluates synchronization condition when BOTH analysis & rotation are complete.
   */
  private evaluateAndTransition() {
    this.clearWatchdog();

    if (!this.analysisComplete || !this.rotationComplete) {
      return;
    }

    if (this.state === 'TARGET_ACQUIRED' || this.state === 'NOT_DETECTED' || this.state === 'RESULT') {
      return;
    }

    if (this.targetFound) {
      // FOUND: CCTV turns GREEN, aims toward real lastTargetObservation position
      this.setState('TARGET_ACQUIRED');
      this.callbacks?.onCCTVGreenLock();
      soundService.playDetected();
    } else {
      // NOT FOUND: CCTV turns RED, remains at final scan bearing
      this.setState('NOT_DETECTED');
      this.callbacks?.onCCTVRedLock();
      soundService.playFailed();
    }

    // Automatically transition to detailed Results drawer after showing in-scene confirmation
    if (this.postLockTimer) {
      clearTimeout(this.postLockTimer);
    }
    this.postLockTimer = setTimeout(() => {
      if (this.state === 'TARGET_ACQUIRED' || this.state === 'NOT_DETECTED') {
        this.revealResults();
      }
    }, 3800);
  }

  /**
   * Transitions to explicit ERROR state when a failure occurs.
   */
  public notifyError(errorMessage: string) {
    this.clearWatchdog();
    if (this.postLockTimer) {
      clearTimeout(this.postLockTimer);
      this.postLockTimer = null;
    }

    console.error(`[CTRL-F] state=ERROR error=${errorMessage}`);
    this.setState('ERROR');
    this.callbacks?.onError?.(errorMessage);
    soundService.playFailed();
  }

  /**
   * Reveals the final detailed forensic results view.
   */
  public revealResults() {
    if (this.postLockTimer) {
      clearTimeout(this.postLockTimer);
      this.postLockTimer = null;
    }
    this.clearWatchdog();

    console.log('[CTRL-F] navigation=RESULT_VIEW');
    this.setState('RESULT');
    this.callbacks?.onShowResults();
  }

  /**
   * Resets controller to IDLE.
   */
  public reset() {
    if (this.postLockTimer) {
      clearTimeout(this.postLockTimer);
      this.postLockTimer = null;
    }
    this.clearWatchdog();

    this.rotationStarted = false;
    this.rotationComplete = false;
    this.analysisComplete = false;
    this.targetFound = false;
    this.scanAngleDeg = 0;
    this.lastLoggedDeg = -1;
    this.setState('IDLE');
  }
}

export const searchExperienceController = SearchExperienceController.getInstance();
