import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface VirtualMouseCursorProps {
  onTargetClick?: () => void;
  active?: boolean;
}

export const VirtualMouseCursor: React.FC<VirtualMouseCursorProps> = ({
  onTargetClick,
  active = true,
}) => {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active || !cursorRef.current) return;

    const cursor = cursorRef.current;
    
    // Initial position: Bottom right (as seen in frame 0 of reference)
    gsap.set(cursor, {
      x: 240,
      y: 190,
      opacity: 1,
      scale: 1,
    });

    const tl = gsap.timeline({
      delay: 0.1,
    });

    // 0.1s to 1.0s: Smooth glide from bottom-right towards "Connect to Live CC Cam"
    tl.to(cursor, {
      x: 120,
      y: 42,
      duration: 0.95,
      ease: 'power2.out',
    })
    // 1.0s: Click press down
    .to(cursor, {
      scale: 0.85,
      duration: 0.1,
      ease: 'power1.inOut',
      onComplete: () => {
        onTargetClick?.();
      },
    })
    // 1.1s: Release click
    .to(cursor, {
      scale: 1.0,
      duration: 0.12,
      ease: 'power1.out',
    })
    // 1.4s to 2.0s: Glide away slightly and fade out
    .to(cursor, {
      x: 130,
      y: 60,
      opacity: 0,
      duration: 0.5,
      ease: 'power2.in',
    }, '+=0.2');

    return () => {
      tl.kill();
    };
  }, [active, onTargetClick]);

  if (!active) return null;

  return (
    <div
      ref={cursorRef}
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none drop-shadow-md"
      style={{ willChange: 'transform, opacity' }}
    >
      {/* Modern High-Precision Vector Mouse Cursor matching reference */}
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M3 2L10 20L13.5 13.5L20 10L3 2Z"
          fill="#ffffff"
          stroke="#1e293b"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
