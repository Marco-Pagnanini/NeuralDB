/**
 * NeuralDB — Spacing & Layout Tokens
 */

export const spacing = {
  // ── Base scale (px) ───────────────────────────────────
  0:   "0px",
  1:   "2px",
  2:   "4px",
  3:   "6px",
  4:   "8px",
  5:   "10px",
  6:   "12px",
  7:   "14px",
  8:   "16px",
  10:  "20px",
  12:  "24px",
  16:  "32px",
  20:  "40px",
  24:  "48px",
} as const

export const radius = {
  none: "0px",
  sm:   "4px",
  md:   "6px",
  lg:   "8px",
  xl:   "12px",
  "2xl":"16px",
  full: "9999px",
} as const

export const layout = {
  // ── Panel widths ──────────────────────────────────────
  sidebar:       "260px",
  sidebarMin:    "48px",
  rightPanel:    "320px",
  bottomPanel:   "220px",

  // ── Z-index scale ─────────────────────────────────────
  z: {
    base:    0,
    overlay: 10,
    dropdown:20,
    modal:   30,
    toast:   40,
    tooltip: 50,
  },
} as const
