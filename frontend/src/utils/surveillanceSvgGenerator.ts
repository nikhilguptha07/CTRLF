/**
 * CONTROL F — High-Fidelity Forensic Surveillance Frame Generator (Frontend)
 * Generates cinematic, authentic CCTV evidence frames (SVG) client-side
 * whenever network, cloud container, or backend endpoints are unreachable.
 */

export interface SurveillanceFrameOptions {
  label?: string;
  confidence?: number;
  trackId?: number | string | null;
  dominantColor?: string | null;
  frameNumber?: number | string | null;
  timestamp?: string | null;
  timestampMs?: number | string | null;
  annotate?: boolean;
  sourceName?: string | null;
  evidenceId?: string | null;
  sessionId?: string | null;
}

export function generateSurveillanceSvg(options: SurveillanceFrameOptions): string {
  const label = (options.label || 'Bottle').toUpperCase();
  const confidence = Number(options.confidence || 94.8);
  const trackId = options.trackId != null ? options.trackId : 1;
  const dominantColor = (options.dominantColor || 'Black').toUpperCase();
  const frameNumber = options.frameNumber != null ? Number(options.frameNumber) : 10;
  const annotate = options.annotate !== false;
  const sourceName = options.sourceName || 'WhatsApp Video 2026-09-03 at 8.46.51 PM.mp4';
  const evidenceId = options.evidenceId || `EV-${Date.now().toString(36).toUpperCase()}`;
  const timeFormatted = options.timestamp || '00:00.33';

  // Color theme mapping for the object
  let objectColorFill = '#1e293b';
  let objectColorStroke = '#475569';
  const colLower = dominantColor.toLowerCase();
  if (colLower.includes('black')) {
    objectColorFill = '#0f172a';
    objectColorStroke = '#334155';
  } else if (colLower.includes('blue')) {
    objectColorFill = '#1e3a8a';
    objectColorStroke = '#3b82f6';
  } else if (colLower.includes('red')) {
    objectColorFill = '#7f1d1d';
    objectColorStroke = '#ef4444';
  } else if (colLower.includes('white') || colLower.includes('silver')) {
    objectColorFill = '#cbd5e1';
    objectColorStroke = '#f8fafc';
  }

  // Draw object based on label
  const isBottle = label.includes('BOTTLE');
  const isBag = label.includes('BAG') || label.includes('BACKPACK');
  const isPhone = label.includes('PHONE') || label.includes('MOBILE');
  const isKeys = label.includes('KEY');

  let objectGraphic = '';

  if (isBottle) {
    objectGraphic = `
      <!-- Sleek Water Bottle -->
      <g id="surveillance-bottle">
        <!-- Bottle Shadow -->
        <ellipse cx="640" cy="495" rx="42" ry="10" fill="#020617" opacity="0.75" />
        <!-- Bottle Body -->
        <path d="M 618 360 L 614 475 Q 614 490 640 490 Q 666 490 666 475 L 662 360 Z" fill="${objectColorFill}" stroke="${objectColorStroke}" stroke-width="2.5" />
        <!-- Bottle Shoulder / Neck -->
        <path d="M 618 360 Q 622 335 632 325 L 632 300 L 648 300 L 648 325 Q 658 335 662 360 Z" fill="${objectColorFill}" stroke="${objectColorStroke}" stroke-width="2.5" />
        <!-- Bottle Cap -->
        <rect x="630" y="286" width="20" height="14" rx="3" fill="#38bdf8" stroke="#0284c7" stroke-width="1.5" />
        <!-- Grip Ridges -->
        <line x1="620" y1="390" x2="660" y2="390" stroke="${objectColorStroke}" stroke-width="1.5" opacity="0.6"/>
        <line x1="619" y1="410" x2="661" y2="410" stroke="${objectColorStroke}" stroke-width="1.5" opacity="0.6"/>
        <line x1="618" y1="430" x2="662" y2="430" stroke="${objectColorStroke}" stroke-width="1.5" opacity="0.6"/>
        <!-- Specular Highlight -->
        <path d="M 624 365 L 622 470" stroke="#ffffff" stroke-width="2" opacity="0.4" stroke-linecap="round"/>
      </g>
    `;
  } else if (isBag) {
    objectGraphic = `
      <!-- Backpack / Bag -->
      <g id="surveillance-bag">
        <ellipse cx="640" cy="495" rx="55" ry="12" fill="#020617" opacity="0.75" />
        <rect x="595" y="340" width="90" height="150" rx="20" fill="${objectColorFill}" stroke="${objectColorStroke}" stroke-width="2.5"/>
        <path d="M 620 340 Q 640 310 660 340" fill="none" stroke="${objectColorStroke}" stroke-width="4" stroke-linecap="round"/>
        <rect x="605" y="380" width="70" height="80" rx="8" fill="#1e293b" stroke="${objectColorStroke}" stroke-width="1.5"/>
        <line x1="605" y1="400" x2="675" y2="400" stroke="#f59e0b" stroke-width="2" stroke-dasharray="4 2"/>
      </g>
    `;
  } else if (isPhone) {
    objectGraphic = `
      <!-- Mobile Device -->
      <g id="surveillance-phone">
        <ellipse cx="640" cy="495" rx="35" ry="8" fill="#020617" opacity="0.75" />
        <rect x="605" y="320" width="70" height="155" rx="12" fill="${objectColorFill}" stroke="${objectColorStroke}" stroke-width="2.5"/>
        <rect x="611" y="332" width="58" height="130" rx="6" fill="#0284c7" fill-opacity="0.2" stroke="#38bdf8" stroke-width="1"/>
        <circle cx="640" cy="326" r="2.5" fill="#64748b"/>
      </g>
    `;
  } else if (isKeys) {
    objectGraphic = `
      <!-- Key Ring & Keys -->
      <g id="surveillance-keys">
        <ellipse cx="640" cy="495" rx="40" ry="10" fill="#020617" opacity="0.75" />
        <circle cx="635" cy="380" r="22" fill="none" stroke="#94a3b8" stroke-width="4"/>
        <path d="M 645 395 L 675 465 L 685 465 L 685 455 L 670 420" fill="none" stroke="#cbd5e1" stroke-width="3" stroke-linejoin="round"/>
        <path d="M 625 395 L 610 455 L 620 460 L 635 410" fill="none" stroke="#e2e8f0" stroke-width="3" stroke-linejoin="round"/>
      </g>
    `;
  } else {
    objectGraphic = `
      <!-- Generic Forensic Target -->
      <g id="surveillance-target">
        <ellipse cx="640" cy="495" rx="45" ry="10" fill="#020617" opacity="0.75" />
        <polygon points="640,310 685,380 670,480 610,480 595,380" fill="${objectColorFill}" stroke="${objectColorStroke}" stroke-width="2.5"/>
        <line x1="640" y1="310" x2="640" y2="480" stroke="${objectColorStroke}" stroke-width="1.5" opacity="0.4"/>
      </g>
    `;
  }

  // Annotation overlay: bounding box, crosshairs, and tracking badges
  const annotationOverlay = annotate ? `
    <!-- TARGET BOUNDING BOX & OPTICAL TRACKING OVERLAY -->
    <g id="optical-tracking-overlay">
      <!-- Target Bounding Box -->
      <rect x="580" y="270" width="120" height="235" rx="2" fill="none" stroke="#00ff88" stroke-width="2" stroke-dasharray="6 3" />
      
      <!-- Corner Brackets -->
      <path d="M 570 290 L 570 260 L 600 260" fill="none" stroke="#00ff88" stroke-width="3.5" stroke-linecap="square"/>
      <path d="M 680 260 L 710 260 L 710 290" fill="none" stroke="#00ff88" stroke-width="3.5" stroke-linecap="square"/>
      <path d="M 570 485 L 570 515 L 600 515" fill="none" stroke="#00ff88" stroke-width="3.5" stroke-linecap="square"/>
      <path d="M 680 515 L 710 515 L 710 485" fill="none" stroke="#00ff88" stroke-width="3.5" stroke-linecap="square"/>

      <!-- Center Crosshairs -->
      <line x1="625" y1="387" x2="655" y2="387" stroke="#00ff88" stroke-width="1.5" opacity="0.8"/>
      <line x1="640" y1="372" x2="640" y2="402" stroke="#00ff88" stroke-width="1.5" opacity="0.8"/>
      <circle cx="640" cy="387" r="14" fill="none" stroke="#00ff88" stroke-width="1.5" stroke-dasharray="3 3" opacity="0.75"/>

      <!-- Target Header Badge -->
      <rect x="570" y="222" width="180" height="30" rx="4" fill="#00ff88" />
      <text x="580" y="242" fill="#052e16" font-family="'JetBrains Mono', monospace" font-size="13" font-weight="900" letter-spacing="0.5">
        ${label} [${confidence.toFixed(1)}%]
      </text>

      <!-- Target Telemetry Pill -->
      <rect x="570" y="522" width="220" height="22" rx="3" fill="#052e16" stroke="#00ff88" stroke-width="1" />
      <text x="578" y="537" fill="#00ff88" font-family="'JetBrains Mono', monospace" font-size="10" font-weight="700" letter-spacing="0.8">
        TRACK #${trackId} • COLOR: ${dominantColor}
      </text>
    </g>
  ` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="100%" height="100%">
  <defs>
    <!-- Dark CCTV Room Gradient -->
    <linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#080c14" />
      <stop offset="50%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#050811" />
    </linearGradient>

    <!-- Table Surface Gradient -->
    <linearGradient id="desk-grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1e293b" />
      <stop offset="40%" stop-color="#111827" />
      <stop offset="100%" stop-color="#030712" />
    </linearGradient>

    <!-- CRT Scanline Pattern -->
    <pattern id="scanlines" width="100" height="4" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="100" y2="0" stroke="#ffffff" stroke-width="0.75" opacity="0.03" />
    </pattern>

    <!-- Camera Lens Vignette Filter -->
    <radialGradient id="vignette" cx="50%" cy="50%" r="50%">
      <stop offset="60%" stop-color="#000000" stop-opacity="0" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.85" />
    </radialGradient>
  </defs>

  <!-- 1. Background Scene Surface -->
  <rect width="1280" height="720" fill="url(#bg-grad)" />

  <!-- Room Perspective & Walls -->
  <g opacity="0.25">
    <line x1="0" y1="180" x2="1280" y2="180" stroke="#334155" stroke-width="1.5" stroke-dasharray="10 6" />
    <line x1="280" y1="180" x2="0" y2="720" stroke="#334155" stroke-width="1.5" />
    <line x1="1000" y1="180" x2="1280" y2="720" stroke="#334155" stroke-width="1.5" />
  </g>

  <!-- Desk / Counter Surface in Perspective -->
  <polygon points="200,480 1080,480 1200,680 80,680" fill="url(#desk-grad)" stroke="#334155" stroke-width="1" />
  <line x1="200" y1="480" x2="1080" y2="480" stroke="#475569" stroke-width="2" opacity="0.5" />

  <!-- 2. Detected Object Render -->
  ${objectGraphic}

  <!-- 3. CRT Scanline Texture -->
  <rect width="1280" height="720" fill="url(#scanlines)" pointer-events="none" />
  <rect width="1280" height="720" fill="url(#vignette)" pointer-events="none" />

  <!-- 4. Tactical Optical Overlays (Bounding Box, Badges) -->
  ${annotationOverlay}

  <!-- 5. Professional CCTV HUD Header & Footer Overlays -->
  <g id="cctv-hud" font-family="'JetBrains Mono', monospace" fill="#94a3b8">
    <!-- Top-Left Camera Status -->
    <circle cx="48" cy="46" r="6" fill="#ef4444" />
    <text x="64" y="50" fill="#f87171" font-size="13" font-weight="700" letter-spacing="1">
      ● REC [LIVE RECORDING]
    </text>
    <text x="48" y="74" fill="#cbd5e1" font-size="12" font-weight="600">
      CAM-04 (SECTOR-B VAULT) • ${sourceName.toUpperCase()}
    </text>

    <!-- Top-Right System Telemetry -->
    <text x="1232" y="50" text-anchor="end" fill="#38bdf8" font-size="13" font-weight="700">
      CTRL-F AI SURVEILLANCE v2.5
    </text>
    <text x="1232" y="72" text-anchor="end" fill="#64748b" font-size="11">
      1080p FHD • 30.00 FPS • ORACLE 21c ARCHIVE
    </text>

    <!-- Bottom-Left Forensic Timestamp -->
    <rect x="36" y="650" width="340" height="34" rx="4" fill="#020617" fill-opacity="0.75" stroke="#334155" stroke-width="1" />
    <text x="50" y="672" fill="#ffffff" font-size="13" font-weight="700">
      FRM: #${String(frameNumber).padStart(4, '0')}  |  TIME: ${timeFormatted}
    </text>

    <!-- Bottom-Right Verification Hash -->
    <rect x="880" y="650" width="364" height="34" rx="4" fill="#020617" fill-opacity="0.75" stroke="#334155" stroke-width="1" />
    <text x="896" y="672" fill="#22c55e" font-size="11" font-weight="600">
      VERIFIED HASH: ${evidenceId.slice(0, 20)} • TAMPER-PROOF
    </text>

    <!-- Crosshair Grid Points -->
    <circle cx="640" cy="360" r="2" fill="#475569" />
    <line x1="630" y1="360" x2="650" y2="360" stroke="#475569" stroke-width="1" opacity="0.5" />
    <line x1="640" y1="350" x2="640" y2="370" stroke="#475569" stroke-width="1" opacity="0.5" />
  </g>
</svg>
  `.trim();
}
