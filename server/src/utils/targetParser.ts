/**
 * CONTROL F — Deterministic Target Normalizer & Parser
 * Phase 11: Real Object + Color Detection and Search
 *
 * Normalizes user queries into canonical (targetClass, targetColor).
 * Color is strictly optional.
 * Examples:
 *   "red bottle"          -> { targetClass: "bottle", targetColor: "RED" }
 *   "bottle"              -> { targetClass: "bottle", targetColor: null }
 *   "red"                 -> { targetClass: null, targetColor: "RED" }
 *   "dark blue backpack"  -> { targetClass: "backpack", targetColor: "BLUE" }
 *   "black laptop"        -> { targetClass: "laptop", targetColor: "BLACK" }
 */

import { normalizeColor, CanonicalColor, COLOR_VOCABULARY, COLOR_ALIASES } from './colorVocabulary';

export interface ParsedTarget {
  targetClass: string | null;
  targetColor: CanonicalColor | null;
  targetText: string;
  normalizedTarget: string;
}

export function parseTarget(
  input: string | {
    className?: string | null;
    objectName?: string | null;
    color?: string | null;
    target?: string | null;
    targetText?: string | null;
  }
): ParsedTarget {
  // If structured object with explicit className and/or color
  if (typeof input === 'object' && input !== null) {
    const rawClass = input.className || input.objectName || null;
    const rawColor = input.color || null;

    if (rawClass || rawColor) {
      const normColor = normalizeColor(rawColor);
      const cleanClass = rawClass ? rawClass.trim().toLowerCase() : null;
      const textParts: string[] = [];
      if (normColor) textParts.push(normColor.toLowerCase());
      if (cleanClass) textParts.push(cleanClass);
      const combinedText = textParts.join(' ') || 'object';

      return {
        targetClass: cleanClass,
        targetColor: normColor,
        targetText: combinedText,
        normalizedTarget: combinedText,
      };
    }

    // Fallback to target or targetText string within object
    const textStr = input.targetText || input.target || '';
    return parseTargetString(textStr);
  }

  return parseTargetString(String(input || ''));
}

function parseTargetString(rawText: string): ParsedTarget {
  const text = rawText.trim();
  if (!text) {
    return {
      targetClass: null,
      targetColor: null,
      targetText: '',
      normalizedTarget: '',
    };
  }

  const tokens = text.split(/\s+/);
  let matchedColor: CanonicalColor | null = null;
  const remainingTokens: string[] = [];

  let i = 0;
  while (i < tokens.length) {
    // Check two-word color alias (e.g., "dark blue", "light gray")
    if (i + 1 < tokens.length) {
      const twoWord = `${tokens[i]} ${tokens[i + 1]}`.toUpperCase();
      if (COLOR_ALIASES[twoWord]) {
        matchedColor = COLOR_ALIASES[twoWord];
        i += 2;
        continue;
      }
    }

    // Check single-word color
    const oneWord = tokens[i].toUpperCase();
    if ((COLOR_VOCABULARY as readonly string[]).includes(oneWord) && oneWord !== 'UNKNOWN') {
      matchedColor = oneWord as CanonicalColor;
      i += 1;
      continue;
    } else if (COLOR_ALIASES[oneWord]) {
      matchedColor = COLOR_ALIASES[oneWord];
      i += 1;
      continue;
    }

    remainingTokens.push(tokens[i]);
    i += 1;
  }

  const classPart = remainingTokens.length > 0 ? remainingTokens.join(' ').trim().toLowerCase() : null;

  // Build normalized target representation
  const normParts: string[] = [];
  if (matchedColor) normParts.push(matchedColor.toLowerCase());
  if (classPart) normParts.push(classPart);
  const normalized = normParts.join(' ') || text.toLowerCase();

  return {
    targetClass: classPart,
    targetColor: matchedColor,
    targetText: text,
    normalizedTarget: normalized,
  };
}
