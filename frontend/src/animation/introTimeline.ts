import gsap from 'gsap';

export function playIntroAnimation(containerElement: HTMLElement | null) {
  if (!containerElement) return;

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  tl.fromTo(
    containerElement,
    { opacity: 0, scale: 0.96, y: 20 },
    { opacity: 1, scale: 1.0, y: 0, duration: 1.2 }
  );

  return tl;
}
