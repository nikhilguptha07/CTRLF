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
  'GREY',
  'MULTICOLOR',
  'UNKNOWN',
] as const;

export type SupportedColor = typeof COLOR_VOCABULARY[number];

export const COLOR_DISPLAY_NAMES: Record<string, string> = {
  RED: 'Red',
  ORANGE: 'Orange',
  YELLOW: 'Yellow',
  GREEN: 'Green',
  BLUE: 'Blue',
  PURPLE: 'Purple',
  PINK: 'Pink',
  BROWN: 'Brown',
  BLACK: 'Black',
  WHITE: 'White',
  GRAY: 'Gray',
  GREY: 'Gray',
  MULTICOLOR: 'Multicolor',
  UNKNOWN: 'Unknown',
};

export const COLOR_HEX_MAP: Record<string, { bg: string; text: string; border: string }> = {
  RED: { bg: 'rgba(239, 68, 68, 0.2)', text: '#fca5a5', border: 'rgba(239, 68, 68, 0.5)' },
  ORANGE: { bg: 'rgba(249, 115, 22, 0.2)', text: '#fdba74', border: 'rgba(249, 115, 22, 0.5)' },
  YELLOW: { bg: 'rgba(234, 179, 8, 0.2)', text: '#fde047', border: 'rgba(234, 179, 8, 0.5)' },
  GREEN: { bg: 'rgba(34, 197, 94, 0.2)', text: '#86efac', border: 'rgba(34, 197, 94, 0.5)' },
  BLUE: { bg: 'rgba(59, 130, 246, 0.2)', text: '#93c5fd', border: 'rgba(59, 130, 246, 0.5)' },
  PURPLE: { bg: 'rgba(168, 85, 247, 0.2)', text: '#d8b4fe', border: 'rgba(168, 85, 247, 0.5)' },
  PINK: { bg: 'rgba(236, 72, 153, 0.2)', text: '#f9a8d4', border: 'rgba(236, 72, 153, 0.5)' },
  BROWN: { bg: 'rgba(146, 64, 14, 0.25)', text: '#d97706', border: 'rgba(146, 64, 14, 0.6)' },
  BLACK: { bg: 'rgba(15, 23, 42, 0.8)', text: '#94a3b8', border: 'rgba(51, 65, 85, 0.7)' },
  WHITE: { bg: 'rgba(248, 250, 252, 0.2)', text: '#ffffff', border: 'rgba(248, 250, 252, 0.6)' },
  GRAY: { bg: 'rgba(100, 116, 139, 0.25)', text: '#cbd5e1', border: 'rgba(100, 116, 139, 0.5)' },
  GREY: { bg: 'rgba(100, 116, 139, 0.25)', text: '#cbd5e1', border: 'rgba(100, 116, 139, 0.5)' },
  MULTICOLOR: { bg: 'linear-gradient(135deg, rgba(239,68,68,0.3), rgba(59,130,246,0.3))', text: '#f1f5f9', border: 'rgba(168, 85, 247, 0.5)' },
  UNKNOWN: { bg: 'rgba(148, 163, 184, 0.15)', text: '#94a3b8', border: 'rgba(148, 163, 184, 0.3)' },
};

export interface ParsedClientTarget {
  rawQuery: string;
  className: string | null;
  color: string | null; // NULL if not requested (ANY color rule)
  displayName: string;
}

const COLOR_NAME_SET = new Set(COLOR_VOCABULARY.map((c) => c.toLowerCase()));

/**
 * Deterministic target parser for natural language and structured queries.
 * Respects the OPTIONAL COLOR rule: if no color is specified, color is null (meaning ANY COLOR).
 */
export function parseClientTarget(input: string | { className?: string | null; color?: string | null }): ParsedClientTarget {
  if (typeof input === 'object' && input !== null) {
    const rawClass = (input.className || '').trim().toLowerCase() || null;
    let rawColor = (input.color || '').trim().toUpperCase() || null;
    if (rawColor === 'GREY') rawColor = 'GRAY';
    if (rawColor && !COLOR_VOCABULARY.includes(rawColor as any)) {
      rawColor = null;
    }
    const display = rawColor ? `${rawColor} ${rawClass || 'OBJECT'}` : (rawClass || 'ANY OBJECT');
    return {
      rawQuery: display,
      className: rawClass,
      color: rawColor,
      displayName: display,
    };
  }

  const trimmed = (input || '').trim();
  if (!trimmed) {
    return {
      rawQuery: '',
      className: null,
      color: null,
      displayName: 'ANY OBJECT',
    };
  }

  const tokens = trimmed.toLowerCase().split(/\s+/);

  // Check if first token is a color
  if (tokens.length >= 2 && COLOR_NAME_SET.has(tokens[0])) {
    let col = tokens[0].toUpperCase();
    if (col === 'GREY') col = 'GRAY';
    const cls = tokens.slice(1).join(' ');
    return {
      rawQuery: trimmed,
      className: cls,
      color: col,
      displayName: `${col} ${cls.toUpperCase()}`,
    };
  }

  // Check if entire query is just a color
  if (tokens.length === 1 && COLOR_NAME_SET.has(tokens[0])) {
    let col = tokens[0].toUpperCase();
    if (col === 'GREY') col = 'GRAY';
    return {
      rawQuery: trimmed,
      className: null,
      color: col,
      displayName: `ANY ${col} OBJECT`,
    };
  }

  // Pure object name: color is strictly null (ANY COLOR)
  return {
    rawQuery: trimmed,
    className: trimmed.toLowerCase(),
    color: null,
    displayName: `${trimmed.toUpperCase()} (ANY COLOR)`,
  };
}
