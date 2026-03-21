import { useState, useEffect, useRef } from "react"
import { invoke } from "@tauri-apps/api/core"
import {
    Network, Sheet, GitCompare, Pencil, List,
    ZoomIn, ZoomOut, Maximize2, Hand,
    Share2, MoreHorizontal, Play, Sparkles,
} from "lucide-react"
import { DbSidebar } from "../ui/erd/DbSidebar"
import { TableCard } from "../ui/erd/TableCard"
import { DataPanel } from "../ui/erd/DataPanel"
import { SqlPane } from "../ui/editor/SqlPane"
import { AiChat } from "../ui/ai/AiChat"
import { Button } from "../ui/base/Button"

// ── Types from Rust backend ───────────────────────────────────────────────────

export interface ColumnInfo {
    name: string
    type: string
    nullable: boolean
    pk: boolean
    fk: boolean
    fk_table: string | null
}

export interface TableSchema {
    id: string
    name: string
    columns: ColumnInfo[]
}

// ── Local ERD layout types ────────────────────────────────────────────────────

export interface TableDef {
    id: string
    name: string
    color: string
    x: number
    y: number
    columns: ColumnInfo[]
}

export interface RelationDef {
    from: string
    to: string
    fromCol: string
    toCol: string
}

// ── Color palette for table headers ──────────────────────────────────────────

const TABLE_COLORS = [
    "var(--table-blue)",
    "var(--table-green)",
    "var(--table-orange)",
    "#a78bfa",
    "#f43f5e",
    "#06b6d4",
]

// ── Auto-layout: arrange tables in a grid ────────────────────────────────────

const CARD_W = 280
const CARD_GAP = 60
const COLS = 3

function layoutTables(schemas: TableSchema[]): TableDef[] {
    return schemas.map((s, i) => ({
        id: s.id,
        name: s.name,
        color: TABLE_COLORS[i % TABLE_COLORS.length],
        x: 60 + (i % COLS) * (CARD_W + CARD_GAP),
        y: 60 + Math.floor(i / COLS) * 260,
        columns: s.columns,
    }))
}

function buildRelations(tables: TableDef[]): RelationDef[] {
    const relations: RelationDef[] = []
    for (const table of tables) {
        for (const col of table.columns) {
            if (col.fk && col.fk_table) {
                relations.push({
                    from: table.id,
                    to: col.fk_table,
                    fromCol: col.name,
                    toCol: "id",
                })
            }
        }
    }
    return relations
}

// ── Relation SVG lines ────────────────────────────────────────────────────────

const HEADER_H = 30

function getAnchor(tables: TableDef[], tableId: string, side: "left" | "right") {
    const t = tables.find(t => t.id === tableId)
    if (!t) return { x: 0, y: 0 }
    const x = side === "right" ? t.x + CARD_W : t.x
    const y = t.y + HEADER_H + 16
    return { x, y }
}

function ErdLines({ tables, relations }: { tables: TableDef[]; relations: RelationDef[] }) {
    return (
        <svg
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
            overflow="visible"
        >
            {relations.map((rel, i) => {
                const from = tables.find(t => t.id === rel.from)
                const to = tables.find(t => t.id === rel.to)
                if (!from || !to) return null
                const fromRight = from.x < to.x
                const a = getAnchor(tables, rel.from, fromRight ? "right" : "left")
                const b = getAnchor(tables, rel.to, fromRight ? "left" : "right")
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

// ── Dashboard ─────────────────────────────────────────────────────────────────

type MainTab = "erd" | "data" | "diff"

interface DashboardProps {
    dbPath: string
    setDbPath: (path: string) => void
}

const BOTTOM_H = 255

export function Dashboard({ dbPath, setDbPath }: DashboardProps) {
    const [activeTab, setActiveTab] = useState<MainTab>("erd")
    const [activeTable, setActiveTable] = useState<string | null>(null)
    const [zoom, setZoom] = useState(100)
    const [tables, setTables] = useState<TableDef[]>([])
    const [relations, setRelations] = useState<RelationDef[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    // shared SQL state (lifted from SqlPane so AiChat can inject queries)
    const [sql, setSql] = useState("")
    const [aiOpen, setAiOpen] = useState(false)

    const dbName = dbPath.split("/").pop() ?? dbPath

    // ── Drag-and-drop state ───────────────────────────────────────────────────
    // All stored in refs so mousemove handler never goes stale
    const dragRef = useRef<{
        tableId: string
        startTableX: number
        startTableY: number
        startMouseX: number
        startMouseY: number
    } | null>(null)

    // Keep a live ref to zoom so the mousemove closure doesn't go stale
    const zoomRef = useRef(zoom)
    useEffect(() => { zoomRef.current = zoom }, [zoom])

    // Tracks whether the mouse actually moved; prevents onSelect firing after drag
    const hasDraggedRef = useRef(false)

    function startDrag(tableId: string, e: React.MouseEvent) {
        e.preventDefault()
        const table = tables.find(t => t.id === tableId)
        if (!table) return
        hasDraggedRef.current = false
        dragRef.current = {
            tableId,
            startTableX: table.x,
            startTableY: table.y,
            startMouseX: e.clientX,
            startMouseY: e.clientY,
        }
    }

    // Register window-level events so drag works even when mouse leaves the canvas
    useEffect(() => {
        function onMouseMove(e: MouseEvent) {
            if (!dragRef.current) return
            hasDraggedRef.current = true
            const scale = zoomRef.current / 100
            const dx = (e.clientX - dragRef.current.startMouseX) / scale
            const dy = (e.clientY - dragRef.current.startMouseY) / scale
            const newX = Math.max(0, dragRef.current.startTableX + dx)
            const newY = Math.max(0, dragRef.current.startTableY + dy)
            setTables(prev => prev.map(t =>
                t.id === dragRef.current!.tableId
                    ? { ...t, x: newX, y: newY }
                    : t
            ))
            // live-update relations (SVG lines follow the card)
            setRelations(prev => [...prev])
        }

        function onMouseUp() {
            if (dragRef.current) {
                dragRef.current = null
                // Re-compute relations with final positions
                setTables(prev => {
                    setRelations(buildRelations(prev))
                    return prev
                })
            }
        }

        window.addEventListener("mousemove", onMouseMove)
        window.addEventListener("mouseup", onMouseUp)
        return () => {
            window.removeEventListener("mousemove", onMouseMove)
            window.removeEventListener("mouseup", onMouseUp)
        }
    }, []) // empty deps — reads everything through refs

    useEffect(() => {
        setLoading(true)
        setError(null)
        invoke<TableSchema[]>("get_schema")
            .then(schemas => {
                const laid = layoutTables(schemas)
                setTables(laid)
                setRelations(buildRelations(laid))
            })
            .catch(e => setError(String(e)))
            .finally(() => setLoading(false))
    }, [dbPath])

    const mainTabs: { id: MainTab; icon: React.ReactNode; label: string }[] = [
        { id: "erd", icon: <Network size={13} />, label: "ERD" },
        { id: "data", icon: <Sheet size={13} />, label: "Data" },
        { id: "diff", icon: <GitCompare size={13} />, label: "HCL Diff" },
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
                {/* breadcrumb */}
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
                    <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text3)" }} onClick={() => {
                        setDbPath("")
                    }}>
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
                    {/* AI Chat toggle */}
                    <Button
                        variant={aiOpen ? "default" : "secondary"}
                        size="sm"
                        leftIcon={<Sparkles size={11} />}
                        onClick={() => setAiOpen(o => !o)}
                    >
                        AI
                    </Button>
                    <Button variant="default" size="sm" leftIcon={<Play size={11} />}>Run SQL</Button>
                </div>
            </header>

            {/* ══ BODY ════════════════════════════════════════ */}
            <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>

                {/* Sidebar */}
                <DbSidebar
                    tables={tables}
                    activeTable={activeTable}
                    onSelectTable={id => {
                        setActiveTable(id)
                        setActiveTab("data")   // auto-switch to Data tab
                    }}
                />

                {/* Main area */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

                    {/* ERD canvas */}
                    {activeTab === "erd" && (
                        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>

                            {/* Loading / error states */}
                            {loading && (
                                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text3)" }}>
                                        Caricamento schema…
                                    </span>
                                </div>
                            )}
                            {error && (
                                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#f43f5e" }}>
                                        Errore: {error}
                                    </span>
                                </div>
                            )}

                            {/* zoom toolbar */}
                            {!loading && !error && (
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
                                    <Button variant="ghost" size="icon" aria-label="Zoom in" onClick={() => setZoom(z => Math.min(z + 10, 200))}><ZoomIn size={12} /></Button>
                                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text2)", minWidth: 34, textAlign: "center" }}>{zoom}%</span>
                                    <Button variant="ghost" size="icon" aria-label="Zoom out" onClick={() => setZoom(z => Math.max(z - 10, 30))}><ZoomOut size={12} /></Button>
                                    <div style={{ width: 1, height: 14, background: "var(--border2)", margin: "0 2px" }} />
                                    <Button variant="ghost" size="icon" aria-label="Fit" onClick={() => setZoom(100)}><Maximize2 size={12} /></Button>
                                    <Button variant="ghost" size="icon" aria-label="Pan"><Hand size={12} /></Button>
                                </div>
                            )}

                            {/* scrollable canvas */}
                            {!loading && !error && (
                                <div style={{ width: "100%", height: "100%", overflow: "auto" }}>
                                    <div style={{
                                        position: "relative",
                                        // canvas grows to always contain every card + 120px margin
                                        width: Math.max(
                                            1200,
                                            tables.length > 0
                                                ? Math.max(...tables.map(t => t.x + CARD_W)) + 120
                                                : 0
                                        ),
                                        height: Math.max(
                                            700,
                                            tables.length > 0
                                                ? Math.max(...tables.map(t => t.y + 260)) + 120
                                                : 0
                                        ),
                                        transform: `scale(${zoom / 100})`,
                                        transformOrigin: "top left",
                                    }}>
                                        {/* grid dots */}
                                        <div style={{
                                            position: "absolute",
                                            inset: 0,
                                            backgroundImage: "radial-gradient(circle, var(--border1) 1px, transparent 1px)",
                                            backgroundSize: "24px 24px",
                                            opacity: 0.6,
                                        }} />

                                        <ErdLines tables={tables} relations={relations} />

                                        {tables.map(table => (
                                            <TableCard
                                                key={table.id}
                                                table={table}
                                                selected={activeTable === table.id}
                                                onSelect={() => {
                                                    // don't toggle selection if the user just finished dragging
                                                    if (hasDraggedRef.current) return
                                                    setActiveTable(prev => prev === table.id ? null : table.id)
                                                }}
                                                onDragStart={e => startDrag(table.id, e)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Data tab — table viewer */}
                    {activeTab === "data" && (
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                            <DataPanel tableName={activeTable} />
                        </div>
                    )}

                    {/* Diff tab placeholder */}
                    {activeTab === "diff" && (
                        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text3)" }}>Schema diff — coming soon</span>
                        </div>
                    )}

                    {/* Bottom SQL pane */}
                    <div style={{ height: BOTTOM_H, flexShrink: 0 }}>
                        <SqlPane sql={sql} onSqlChange={setSql} />
                    </div>
                </div>

                {/* AI Chat side panel — absolute over the body area */}
                <AiChat
                    open={aiOpen}
                    onClose={() => setAiOpen(false)}
                    currentSql={sql}
                    onInsertSql={(generated) => { setSql(generated); setAiOpen(false) }}
                />
            </div>
        </div>
    )
}
