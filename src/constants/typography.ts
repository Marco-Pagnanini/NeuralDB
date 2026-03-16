/**
 * NeuralDB — Typography Tokens
 */

export const typography = {
  // ── Font families ─────────────────────────────────────
  font: {
    sans:  "'Geist', system-ui, -apple-system, sans-serif",
    mono:  "'Geist Mono', 'JetBrains Mono', 'Fira Code', monospace",
  },

  // ── Font sizes (rem) ──────────────────────────────────
  size: {
    xs:   "10px",   // badge, hint, shortcut
    sm:   "11px",   // caption, meta
    base: "13px",   // testo UI standard
    md:   "14px",   // label, bottoni
    lg:   "16px",   // subtitle
    xl:   "20px",   // section title
    "2xl":"24px",   // page title
    "3xl":"32px",   // hero
  },

  // ── Font weights ──────────────────────────────────────
  weight: {
    regular:  400,
    medium:   500,
    semibold: 600,
    bold:     700,
  },

  // ── Line heights ──────────────────────────────────────
  leading: {
    tight:  1.2,
    snug:   1.4,
    normal: 1.6,
    relaxed:1.8,
  },

  // ── Letter spacing ────────────────────────────────────
  tracking: {
    tight:  "-0.03em",
    normal: "-0.01em",
    wide:   "0.04em",
    widest: "0.08em",  // per badge uppercase
  },
} as const

export type TypographyToken = typeof typography
