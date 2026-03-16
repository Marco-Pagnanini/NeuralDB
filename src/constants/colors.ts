/**
 * NeuralDB — Color Tokens
 * Usare sempre queste costanti al posto di valori raw.
 * Le CSS variables in App.css corrispondono 1:1.
 */

export const colors = {
  // ── Backgrounds ──────────────────────────────────────
  bg: {
    base:    "#0b0b0e",   // --bg0  schermo principale
    subtle:  "#111116",   // --bg1  sidebar, pannelli secondari
    muted:   "#18181f",   // --bg2  cards, dropdown
    elevated:"#22222b",   // --bg3  tooltip, modali
  },

  // ── Borders ───────────────────────────────────────────
  border: {
    default: "#1e1e27",   // --border1
    strong:  "#2a2a36",   // --border2
  },

  // ── Accent (blu-ciano — palette owl) ─────────────────
  accent: {
    default: "#5db8f5",   // --accent   bottoni, highlight
    hover:   "#82ceff",   // --accent2  hover state
    dim:     "rgba(93, 184, 245, 0.08)", // --accent-dim  bg trasparente
  },

  // ── Text ──────────────────────────────────────────────
  text: {
    primary:   "#e4e6eb",  // --text1  titoli, label attivi
    secondary: "#9ba3af",  // --text2  testo normale
    muted:     "#5a6270",  // --text3  placeholder, hint
    inverse:   "#060b10",  // su bg accent (es. testo bottone)
  },

  // ── Table header accents (come nello screenshot) ──────
  table: {
    blue:   "#3b82f6",   // tabelle principali
    green:  "#22c55e",   // tabelle relazionali
    orange: "#f97316",   // tabelle pivot / join
    purple: "#a855f7",   // tabelle di sistema
    yellow: "#eab308",   // tabelle di log / audit
  },

  // ── Status ────────────────────────────────────────────
  status: {
    success: "#22c55e",
    warning: "#eab308",
    error:   "#ef4444",
    info:    "#5db8f5",
  },

  // ── Syntax highlight (SQL console) ───────────────────
  syntax: {
    keyword:  "#c084fc",   // SELECT, WHERE, ORDER BY …
    string:   "#86efac",   // 'valori stringa'
    number:   "#fb923c",   // 500, 10 …
    comment:  "#4b5563",
    operator: "#67e8f9",
    table:    "#facc15",   // nomi tabelle
    function: "#60a5fa",   // COUNT(), MAX() …
  },
} as const

export type ColorToken = typeof colors
