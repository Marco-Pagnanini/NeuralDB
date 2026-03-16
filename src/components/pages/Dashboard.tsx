import { useState } from "react"
import {
  Network, Code2, GitCompare, Pencil, List,
  ZoomIn, ZoomOut, Maximize2, Hand,
  Share2, MoreHorizontal, Play,
} from "lucide-react"
import { DbSidebar } from "../ui/DbSidebar"
import { TableCard } from "../ui/TableCard"
import { SqlPane } from "../ui/SqlPane"
import { Button } from "../ui/Button"
import { TABLES, RELATIONS } from "../../data/mockDb"

type MainTab = "erd" | "sql" | "diff"

/* ─── Relation SVG lines ─────────────────────────────── */
const CARD_WIDTH = 280
const HEADER_H   = 30

function getAnchor(tableId: string, side: "left" | "right") {
  const t = TABLES.find(t => t.id === tableId)
  if (!t) return { x: 0, y: 0 }
  const x = side === "right" ? t.x + CARD_WIDTH : t.x
  const y = t.y + HEADER_H + 16
  return { x, y }
}

function ErdLines() {
  return (
    <svg
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      overflow="visible"
    >
      {RELATIONS.map((rel, i) => {
        const from = TABLES.find(t => t.id === rel.from)!
        const to   = TABLES.find(t => t.id === rel.to)!
        const fromRight = from.x < to.x
        const a = getAnchor(rel.from, fromRight ? "right" : "left")
        const b = getAnchor(rel.to,   fromRight ? "left"  : "right")
        const cx = (a.x + b.x) / 2
        return (
          <path
            key={i}
            d={`M ${a.x} ${a.y} C ${cx} ${a.y}, ${cx} ${b.y}, ${b.x} ${b.y}`}
            fill="none"
            stroke="var(--border2)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        )
      })}
    </svg>
  )
}

/* ─── Dashboard ──────────────────────────────────────── */
interface DashboardProps {
  dbName?: string
}

const BOTTOM_H = 255

export function Dashboard({ dbName = "my-database.sqlite" }: DashboardProps) {
  const [activeTab, setActiveTab]   = useState<MainTab>("erd")
  const [activeTable, setActiveTable] = useState<string | null>(null)
  const [zoom, setZoom]             = useState(100)

  const mainTabs: { id: MainTab; icon: React.ReactNode; label: string }[] = [
    { id: "erd",  icon: <Network size={13} />,  label: "ERD"       },
    { id: "sql",  icon: <Code2 size={13} />,    label: "SQL"       },
    { id: "diff", icon: <GitCompare size={13} />,  label: "HCL Diff"  },
  ]

  return (
    <div style={{
      width: "100vw",
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      background: "var(--bg0)",
      overflow: "hidden",
    }}>

      {/* ══ TOP BAR ══════════════════════════════════════ */}
      <header style={{
        height: 44,
        display: "flex",
        alignItems: "center",
        gap: 0,
        borderBottom: "1px solid var(--border1)",
        background: "var(--bg1)",
        flexShrink: 0,
        padding: "0 14px 0 0",
      }}>
        {/* breadcrumb — takes up the sidebar width */}
        <div style={{
          width: 240,
          minWidth: 240,
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "0 14px",
          borderRight: "1px solid var(--border1)",
          height: "100%",
        }}>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text3)" }}>
            neuraldb
          </span>
          <span style={{ color: "var(--border2)" }}>/</span>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {dbName}
          </span>
        </div>

        {/* main tabs */}
        <nav style={{ display: "flex", alignItems: "center", height: "100%", paddingLeft: 8, flex: 1 }}>
          {mainTabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                height: "100%",
                padding: "0 14px",
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                fontWeight: activeTab === t.id ? 500 : 400,
                color: activeTab === t.id ? "var(--text1)" : "var(--text3)",
                background: "transparent",
                border: "none",
                borderBottom: activeTab === t.id ? "2px solid var(--accent)" : "2px solid transparent",
                cursor: "pointer",
                transition: "color 0.1s",
              }}
            >
              <span style={{ opacity: 0.7 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
          <button style={{ padding: "0 10px", height: "100%", background: "transparent", border: "none", cursor: "pointer", color: "var(--text3)" }}>
            <Pencil size={12} />
          </button>
          <button style={{ padding: "0 10px", height: "100%", background: "transparent", border: "none", cursor: "pointer", color: "var(--text3)" }}>
            <List size={12} />
          </button>
        </nav>

        {/* right actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Button variant="ghost" size="sm" leftIcon={<Share2 size={12} />}>Share</Button>
          <Button variant="ghost" size="icon" aria-label="More"><MoreHorizontal size={13} /></Button>
          <Button variant="default" size="sm" leftIcon={<Play size={11} />}>RunSQL</Button>
        </div>
      </header>

      {/* ══ BODY (sidebar + main) ═════════════════════════ */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── Sidebar ── */}
        <DbSidebar activeTable={activeTable} onSelectTable={setActiveTable} />

        {/* ── Main area ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* ERD canvas */}
          {activeTab === "erd" && (
            <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>

              {/* zoom toolbar */}
              <div style={{
                position: "absolute",
                bottom: 12,
                right: 12,
                zIndex: 10,
                display: "flex",
                alignItems: "center",
                gap: 4,
                background: "var(--bg2)",
                border: "1px solid var(--border2)",
                borderRadius: 8,
                padding: "4px 6px",
              }}>
                <Button variant="ghost" size="icon" aria-label="Zoom in"  onClick={() => setZoom(z => Math.min(z + 10, 200))}><ZoomIn  size={12} /></Button>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text2)", minWidth: 34, textAlign: "center" }}>{zoom}%</span>
                <Button variant="ghost" size="icon" aria-label="Zoom out" onClick={() => setZoom(z => Math.max(z - 10,  30))}><ZoomOut size={12} /></Button>
                <div style={{ width: 1, height: 14, background: "var(--border2)", margin: "0 2px" }} />
                <Button variant="ghost" size="icon" aria-label="Fit"><Maximize2 size={12} /></Button>
                <Button variant="ghost" size="icon" aria-label="Pan"><Hand size={12} /></Button>
              </div>

              {/* scrollable canvas */}
              <div style={{ width: "100%", height: "100%", overflow: "auto" }}>
                <div style={{
                  position: "relative",
                  width: 1200,
                  height: 700,
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: "top left",
                }}>
                  {/* grid dots bg */}
                  <div style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage: "radial-gradient(circle, var(--border1) 1px, transparent 1px)",
                    backgroundSize: "24px 24px",
                    opacity: 0.6,
                  }} />

                  {/* relation lines */}
                  <ErdLines />

                  {/* table cards */}
                  {TABLES.map(table => (
                    <TableCard
                      key={table.id}
                      table={table}
                      selected={activeTable === table.id}
                      onSelect={() => setActiveTable(table.id === activeTable ? null : table.id)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SQL tab placeholder */}
          {activeTab === "sql" && (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text3)" }}>SQL editor — coming soon</span>
            </div>
          )}

          {/* Diff tab placeholder */}
          {activeTab === "diff" && (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text3)" }}>Schema diff — coming soon</span>
            </div>
          )}

          {/* ── Bottom SQL pane ── */}
          <div style={{ height: BOTTOM_H, flexShrink: 0 }}>
            <SqlPane />
          </div>
        </div>
      </div>
    </div>
  )
}
