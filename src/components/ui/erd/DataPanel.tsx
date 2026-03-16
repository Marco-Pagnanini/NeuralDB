import { useState, useEffect } from "react"
import { invoke } from "@tauri-apps/api/core"
import { Table2, MousePointerClick } from "lucide-react"

interface QueryResult {
    columns:       string[]
    rows:          unknown[][]
    rows_affected: number
    exec_ms:       number
}

interface DataPanelProps {
    tableName: string | null
}

export function DataPanel({ tableName }: DataPanelProps) {
    const [result,    setResult]    = useState<QueryResult | null>(null)
    const [loading,   setLoading]   = useState(false)
    const [error,     setError]     = useState<string | null>(null)
    const [totalRows, setTotalRows] = useState<number | null>(null)

    useEffect(() => {
        if (!tableName) { setResult(null); setTotalRows(null); return }

        setLoading(true)
        setError(null)
        setResult(null)

        // count totale in parallelo
        invoke<QueryResult>("run_query", {
            sql: `SELECT COUNT(*) FROM "${tableName}"`,
        }).then(r => {
            const n = r.rows[0]?.[0]
            setTotalRows(typeof n === "number" ? n : null)
        }).catch(() => setTotalRows(null))

        invoke<QueryResult>("run_query", {
            sql: `SELECT * FROM "${tableName}" LIMIT 500`,
        })
            .then(res => setResult(res))
            .catch(e  => setError(String(e)))
            .finally(() => setLoading(false))
    }, [tableName])

    // ── No table selected ──────────────────────────────────────────────────────
    if (!tableName) {
        return (
            <div style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
            }}>
                <MousePointerClick size={22} style={{ color: "var(--text3)" }} />
                <span style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    color: "var(--text3)",
                }}>
                    Clicca una tabella nella sidebar per visualizzarne i dati
                </span>
            </div>
        )
    }

    // ── Loading ────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text3)" }}>
                    Caricamento dati…
                </span>
            </div>
        )
    }

    // ── Error ──────────────────────────────────────────────────────────────────
    if (error) {
        return (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#f43f5e" }}>
                    Errore: {error}
                </span>
            </div>
        )
    }

    if (!result) return null

    const { columns, rows, exec_ms } = result
    const limited = rows.length === 500

    // ── Table ──────────────────────────────────────────────────────────────────
    return (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* ── Header bar ── */}
            <div style={{
                height: 36,
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "0 14px",
                borderBottom: "1px solid var(--border1)",
                background: "var(--bg1)",
                flexShrink: 0,
            }}>
                <Table2 size={12} style={{ color: "var(--text3)" }} />
                <span style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text1)",
                    letterSpacing: "-0.01em",
                }}>
                    {tableName}
                </span>
                <span style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--text3)",
                    background: "var(--bg3)",
                    border: "1px solid var(--border2)",
                    borderRadius: 4,
                    padding: "1px 6px",
                }}>
                    {totalRows !== null
                        ? `${totalRows.toLocaleString()} righe`
                        : `${rows.length} righe`}
                    {limited ? " · LIMIT 500" : ""}
                </span>
                <span style={{
                    marginLeft: "auto",
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--text3)",
                }}>
                    {exec_ms.toFixed(1)} ms
                </span>
            </div>

            {/* ── Scrollable data table ── */}
            <div style={{ flex: 1, overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "auto" }}>

                    {/* sticky header */}
                    <thead>
                        <tr style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--bg2)" }}>
                            {/* row number */}
                            <th style={{
                                padding: "5px 10px",
                                textAlign: "right",
                                fontFamily: "var(--font-mono)",
                                fontSize: 9,
                                fontWeight: 500,
                                color: "var(--text3)",
                                letterSpacing: "0.05em",
                                borderBottom: "1px solid var(--border1)",
                                borderRight: "1px solid var(--border1)",
                                width: 44,
                                userSelect: "none",
                            }}>
                                #
                            </th>
                            {columns.map(col => (
                                <th key={col} style={{
                                    padding: "5px 14px",
                                    textAlign: "left",
                                    fontFamily: "var(--font-mono)",
                                    fontSize: 10,
                                    fontWeight: 500,
                                    color: "var(--text3)",
                                    letterSpacing: "0.04em",
                                    borderBottom: "1px solid var(--border1)",
                                    borderRight: "1px solid var(--border1)",
                                    whiteSpace: "nowrap",
                                }}>
                                    {col.toUpperCase()}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {rows.map((row, i) => (
                            <tr
                                key={i}
                                style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.012)" }}
                            >
                                {/* row number */}
                                <td style={{
                                    padding: "3px 10px",
                                    fontFamily: "var(--font-mono)",
                                    fontSize: 10,
                                    color: "var(--text3)",
                                    textAlign: "right",
                                    borderBottom: "1px solid var(--border1)",
                                    borderRight: "1px solid var(--border1)",
                                    userSelect: "none",
                                }}>
                                    {i + 1}
                                </td>

                                {(row as unknown[]).map((cell, j) => {
                                    const isNull   = cell === null
                                    const isNumber = typeof cell === "number"
                                    const isBool   = typeof cell === "boolean"
                                    return (
                                        <td key={j} style={{
                                            padding: "3px 14px",
                                            fontFamily: "var(--font-sans)",
                                            fontSize: 12,
                                            color: isNull
                                                ? "var(--text3)"
                                                : isNumber
                                                    ? "#fb923c"
                                                    : isBool
                                                        ? "#34d399"
                                                        : "var(--text1)",
                                            fontStyle:  isNull ? "italic" : "normal",
                                            borderBottom: "1px solid var(--border1)",
                                            borderRight:  "1px solid var(--border1)",
                                            whiteSpace:   "nowrap",
                                            maxWidth:     360,
                                            overflow:     "hidden",
                                            textOverflow: "ellipsis",
                                        }}>
                                            {isNull ? "NULL" : String(cell)}
                                        </td>
                                    )
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* bottom padding / limit notice */}
                {limited && (
                    <div style={{
                        padding: "10px 14px",
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        color: "var(--text3)",
                        borderTop: "1px solid var(--border1)",
                        textAlign: "center",
                    }}>
                        Visualizzando le prime 500 righe · usa la SQL console per query personalizzate
                    </div>
                )}
            </div>
        </div>
    )
}
