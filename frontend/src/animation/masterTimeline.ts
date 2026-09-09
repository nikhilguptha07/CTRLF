import gsap from 'gsap';
import { useExperienceStore } from '../store/useExperienceStore';

export interface MasterTimelineOptions {
  onTimeUpdate?: (time: number) => void;
  onStageChange?: (stage: string) => void;
  loop?: boolean;
}

/**
 * MASTER 10-SECOND REFERENCE VIDEO TIMELINE
 * Matches reference/cctv-reference.mp4 (240 frames @ 24fps)
 */
export function createMasterDemoTimeline(options: MasterTimelineOptions = {}) {
  const store = useExperienceStore.getState();
  const tl = gsap.timeline({
    repeat: options.loop ? -1 : 0,
    repeatDelay: 0.5,
  });

  // Track time continuously
  tl.eventCallback('onUpdate', () => {
    const t = tl.time();
    options.onTimeUpdate?.(t);
  });

  // 0.00s: Scene 1 - Intro High-Key Studio & Dashboard
  tl.call(() => {
    store.setSearchQuery('Keyz');
    store.setStage('HOME');
    options.onStageChange?.('HOME');
  }, undefined, 0.0);

  // 1.15s: Connect button clicked -> Search Form view
  tl.call(() => {
    store.setStage('OBJECT_INPUT');
    options.onStageChange?.('OBJECT_INPUT');
  }, undefined, 1.15);

  // 3.75s: Transition fade into Scene 2
  tl.call(() => {
    store.setStage('PREPARING');
    options.onStageChange?.('PREPARING');
  }, undefined, 3.75);

  // 3.90s: Scene 2 - Dark Studio CCTV Camera Sweep
  tl.call(() => {
    store.setStage('SEARCHING');
    options.onStageChange?.('SEARCHING');
  }, undefined, 3.90);

  // 6.71s: Cut to Scene 3 - CCTV Green Beam projecting onto Wall Monitor
  tl.call(() => {
    store.simulateDetection(true);
    options.onStageChange?.('DETECTED');
  }, undefined, 6.71);

  // 7.96s: Cut to Scene 4 - Camera close-up with Red Alarm Beam & Holographic HUD
  tl.call(() => {
    store.simulateDetection(false);
    options.onStageChange?.('NOT_DETECTED');
  }, undefined, 7.96);

  // Pad out timeline to exactly 10.00s
  tl.to({}, { duration: 2.04 }, 7.96);

  return tl;
}
