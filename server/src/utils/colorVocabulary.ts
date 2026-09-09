/**
 * CONTROL F — Centralized Color Vocabulary & Normalization
 * Phase 11: Real Object + Color Detection and Search
 */

export const COLOR_VOCABULARY = [
  'RED',
  'ORANGE',
  'YELLOW',
  'GREEN',
  'BLUE',
  'PURPLE',
  'PINK',
  'BROWN',
  'BLACK',
  'WHITE',
  'GRAY',
  'MULTICOLOR',
  'UNKNOWN',
] as const;

export type CanonicalColor = (typeof COLOR_VOCABULARY)[number];

export const COLOR_ALIASES: Record<string, CanonicalColor> = {
  GREY: 'GRAY',
  'LIGHT GRAY': 'GRAY',
  'DARK GRAY': 'GRAY',
  'LIGHT BLUE': 'BLUE',
  'DARK BLUE': 'BLUE',
  CYAN: 'BLUE',
  NAVY: 'BLUE',
  MAROON: 'RED',
  CRIMSON: 'RED',
  SCARLET: 'RED',
  GOLD: 'YELLOW',
  VIOLET: 'PURPLE',
  MAGENTA: 'PINK',
  BEIGE: 'WHITE',
};

/**
 * Normalizes an arbitrary color input string to a canonical uppercase color name or null.
 */
export function normalizeColor(name?: string | null): CanonicalColor | null {
  if (!name) return null;
  const cleaned = name.trim().toUpperCase();
  if ((COLOR_VOCABULARY as readonly string[]).includes(cleaned)) {
    return cleaned as CanonicalColor;
  }
  if (COLOR_ALIASES[cleaned]) {
    return COLOR_ALIASES[cleaned];
  }
  return null;
}

/**
 * Determines whether detected color satisfies target color requirement.
 * CRITICAL RULE: Color is ALWAYS optional.
 * If targetColor is null or undefined, returns true (no color filtering applied).
 */
export function isColorMatch(
  detectedDominant?: string | null,
  targetColor?: string | null,
  detectedSecondary?: string[] | null
): boolean {
  if (!targetColor) {
    return true; // No color filtering required
  }

  const normTarget = normalizeColor(targetColor);
  if (!normTarget) {
    return true; // Unrecognized color filter treated as optional
  }

  const normDom = normalizeColor(detectedDominant) || 'UNKNOWN';
  if (normDom === normTarget) {
    return true;
  }

  if (detectedSecondary && Array.isArray(detectedSecondary)) {
    for (const sec of detectedSecondary) {
      if (normalizeColor(sec) === normTarget) {
        return true;
      }
    }
  }

  return false;
}
