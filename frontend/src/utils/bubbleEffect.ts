/**
 * Universal Bubble Feature for Frontend & Database UI
 * Spawns interactive fluid glass bubbles and ripple bursts on button interactions.
 */

interface BubbleParticleOptions {
  x: number;
  y: number;
  color?: string;
  count?: number;
}

export function createBubbleBurst({ x, y, color = 'rgba(99, 102, 241, 0.65)', count = 5 }: BubbleParticleOptions) {
  if (typeof document === 'undefined') return;

  const container = document.createElement('div');
  container.className = 'bubble-burst-container';
  container.style.position = 'fixed';
  container.style.left = `${x}px`;
  container.style.top = `${y}px`;
  container.style.pointerEvents = 'none';
  container.style.zIndex = '999999';
  document.body.appendChild(container);

  const colors = [
    color,
    'rgba(56, 189, 248, 0.7)',  // sky
    'rgba(168, 85, 247, 0.65)', // purple
    'rgba(16, 185, 129, 0.7)',  // emerald
    'rgba(255, 255, 255, 0.85)' // white reflection
  ];

  for (let i = 0; i < count; i++) {
    const bubble = document.createElement('div');
    const size = Math.floor(Math.random() * 14) + 8; // 8px to 22px
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const distance = Math.random() * 38 + 18;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance - (Math.random() * 30 + 20); // Float upward
    const chosenColor = colors[Math.floor(Math.random() * colors.length)];

    bubble.className = 'interactive-floating-bubble';
    bubble.style.position = 'absolute';
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;
    bubble.style.left = `${-size / 2}px`;
    bubble.style.top = `${-size / 2}px`;
    bubble.style.borderRadius = '50%';
    bubble.style.background = `radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.9) 0%, ${chosenColor} 60%, rgba(255, 255, 255, 0.2) 100%)`;
    bubble.style.boxShadow = `0 2px 8px ${chosenColor}, inset 0 1px 2px rgba(255, 255, 255, 0.8)`;
    bubble.style.border = '1px solid rgba(255, 255, 255, 0.6)';
    bubble.style.opacity = '1';
    bubble.style.transition = 'all 0.65s cubic-bezier(0.22, 1, 0.36, 1)';
    bubble.style.transform = 'scale(0.3) translate(0, 0)';

    container.appendChild(bubble);

    // Trigger animation on next tick
    requestAnimationFrame(() => {
      bubble.style.transform = `translate(${tx}px, ${ty}px) scale(${1 + Math.random() * 0.4})`;
      bubble.style.opacity = '0';
    });
  }

  // Cleanup container after animation completes
  setTimeout(() => {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }, 750);
}

/**
 * Initializes global click listener so all buttons across frontend and database views
 * produce fluid bubble bursts and bubble ripples.
 */
export function initGlobalBubbleEffect() {
  if (typeof window === 'undefined') return;

  const handlePointerDown = (e: PointerEvent | MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    // Find closest button, anchor, role="button", or element with bubble-btn class
    const button = target.closest('button, [role="button"], .bubble-btn, .cursor-pointer') as HTMLElement | null;
    if (!button) return;

    // Determine bubble color theme based on element context
    let bubbleColor = 'rgba(67, 97, 238, 0.65)'; // default indigo

    const text = button.innerText || '';
    const classList = button.className || '';

    if (
      classList.includes('emerald') || 
      text.includes('Oracle') || 
      text.includes('Database') || 
      text.includes('SYNC') ||
      button.closest('#oracle-modal, [data-database="true"]')
    ) {
      bubbleColor = 'rgba(16, 185, 129, 0.75)'; // emerald for database
    } else if (classList.includes('bg-indigo') || classList.includes('bg-[#4361ee]')) {
      bubbleColor = 'rgba(67, 97, 238, 0.75)'; // indigo
    } else if (classList.includes('cyan') || classList.includes('sky')) {
      bubbleColor = 'rgba(6, 182, 212, 0.75)'; // cyan
    }

    // 1. Spawn floating bubble particles from click point
    createBubbleBurst({
      x: e.clientX,
      y: e.clientY,
      color: bubbleColor,
      count: 6,
    });

    // 2. Spawn expanding bubble ripple inside button
    const rect = button.getBoundingClientRect();
    const ripple = document.createElement('span');
    const size = Math.max(rect.width, rect.height) * 1.5;
    const rippleX = e.clientX - rect.left - size / 2;
    const rippleY = e.clientY - rect.top - size / 2;

    ripple.className = 'bubble-ripple-wave';
    ripple.style.position = 'absolute';
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${rippleX}px`;
    ripple.style.top = `${rippleY}px`;
    ripple.style.borderRadius = '50%';
    ripple.style.pointerEvents = 'none';
    ripple.style.background = `radial-gradient(circle, ${bubbleColor.replace('0.75', '0.35').replace('0.65', '0.3')} 0%, rgba(255, 255, 255, 0.4) 60%, transparent 80%)`;
    ripple.style.boxShadow = 'inset 0 0 10px rgba(255, 255, 255, 0.6)';
    ripple.style.transform = 'scale(0)';
    ripple.style.opacity = '1';
    ripple.style.transition = 'transform 0.5s cubic-bezier(0.2, 0.8, 0.4, 1), opacity 0.5s ease-out';
    ripple.style.zIndex = '0';

    // Ensure button positioning allows containing the ripple
    const currentPosition = window.getComputedStyle(button).position;
    if (currentPosition === 'static') {
      button.style.position = 'relative';
    }
    const currentOverflow = window.getComputedStyle(button).overflow;
    if (currentOverflow !== 'hidden') {
      button.classList.add('bubble-overflow-contained');
    }

    button.appendChild(ripple);

    requestAnimationFrame(() => {
      ripple.style.transform = 'scale(2)';
      ripple.style.opacity = '0';
    });

    setTimeout(() => {
      if (ripple.parentNode === button) {
        button.removeChild(ripple);
      }
    }, 550);
  };

  window.addEventListener('pointerdown', handlePointerDown, { passive: true });
}
