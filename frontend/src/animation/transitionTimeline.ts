import gsap from 'gsap';

export interface CinematicTransitionCallbacks {
  onStageChange?: (stage: string) => void;
  onDarknessReached?: () => void;
  onCameraFaintlyVisible?: () => void;
  onLightPoweredOn?: () => void;
  onComplete?: () => void;
}

/**
 * MASTER CINEMATIC TRANSITION
 * Cross-dissolve fade from Scene 1 into Scene 2 matching frames 89-95 (3.7s - 3.95s)
 */
export function playMasterCinematicTransition(
  dashboardElement: HTMLElement | null,
  overlayElement: HTMLElement | null,
  _cloudCanvasElement: HTMLElement | null,
  callbacks?: CinematicTransitionCallbacks
): gsap.core.Timeline {
  const master = gsap.timeline({
    defaults: { ease: 'power2.inOut' },
    onComplete: () => {
      if (overlayElement) {
        gsap.set(overlayElement, { clearProps: 'all', opacity: 0 });
      }
      callbacks?.onComplete?.();
    },
  });

  // Fade out dashboard and high-key environment (0.0s to 0.22s)
  if (dashboardElement) {
    master.to(
      dashboardElement,
      {
        opacity: 0,
        scale: 0.96,
        duration: 0.22,
        ease: 'power2.inOut',
      },
      0.0
    );
  }

  // Fade in darkness overlay (0.0s to 0.20s)
  if (overlayElement) {
    master.to(
      overlayElement,
      {
        opacity: 1,
        duration: 0.20,
        ease: 'power2.inOut',
      },
      0.0
    );
  }

  // Switch stage to SEARCHING while screen is black (at 0.20s)
  master.call(() => {
    callbacks?.onDarknessReached?.();
    callbacks?.onStageChange?.('SEARCHING');
  }, undefined, 0.20);

  // Fade out darkness overlay to reveal full brightness dark CCTV studio (0.20s to 0.40s)
  if (overlayElement) {
    master.to(
      overlayElement,
      {
        opacity: 0,
        duration: 0.20,
        ease: 'power2.out',
      },
      0.20
    );
  }

  return master;
}

// Backward compatibility
export const playCinematicTransition = playMasterCinematicTransition;

