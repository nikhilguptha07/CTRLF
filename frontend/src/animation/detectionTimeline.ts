import gsap from 'gsap';

export function animateDetectionResult(
  monitorElement: HTMLElement | null,
  _isFound?: boolean
) {
  if (!monitorElement) return;

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  tl.fromTo(
    monitorElement,
    { y: 40, opacity: 0, scale: 0.95 },
    { y: 0, opacity: 1, scale: 1, duration: 0.7 }
  );

  return tl;
}
