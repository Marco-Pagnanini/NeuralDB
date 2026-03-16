import { useState } from "react"
import { Plus, MoreHorizontal, PanelBottomClose, X, Sparkles } from "lucide-react"
import { Button } from "../base/Button"

type ResultTab = "results" | "logs" | "issues" | "explain"

export interface QueryResult {
  columns:       string[]
  rows:          unknown[][]
  rows_affected: number
  exec_ms:       number
}

interface ResultsPanelProps {
  result:       QueryResult | null
  error:        string | null
  logs:         string[]
  explanation:  string | null
  explaining:   boolean
  explainError: string | null
}

export function ResultsPanel({
  result, error, logs,
  explanation, explaining, explainError,
}: ResultsPanelProps) {
  const [tab, setTab] = useState<ResultTab>("results")

  const columns = result?.columns ?? []
  const rows    = result?.rows    ?? []

  const TABS: { id: ResultTab; label: string }[] = [
    { id: "results", label: "Query Results" },
    { id: "logs",    label: "System Logs"   },
    { id: "issues",  label: "Schema Issues" },
    { id: "explain", label: "Explain"       },
  ]

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ── tab bar ── */}
      <div style={{
        height: 34,
        display: "flex",
        alignItems: "center",
        borderBottom: "1px solid var(--border1)",
        background: "var(--bg2)",
        padding: "0 8px",
        gap: 2,
        flexShrink: 0,
      }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              fontWeight: tab === t.id ? 500 : 400,
              color: tab === t.id ? "var(--text1)" : "var(--text3)",
              padding: "0 10px",
              height: "100%",
              background: "transparent",
              border: "none",
              borderBottom: tab === t.id ? "2px solid var(--accent)" : "2px solid transparent",
              cursor: "pointer",
              transition: "color 0.1s",
            }}
          >
            {t.id === "explain" && <Sparkles size={10} />}
            {t.label}
          </button>
        ))}

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 2 }}>
          <Button variant="ghost" size="icon" aria-label="Add"><Plus size={12} /></Button>
          <Button variant="ghost" size="icon" aria-label="More"><MoreHorizontal size={12} /></Button>
          <Button variant="ghost" size="icon" aria-label="Split"><PanelBottomClose size={12} /></Button>
          <Button variant="ghost" size="icon" aria-label="Close"><X size={12} /></Button>
        </div>
      </div>

      {/* ── results ── */}
      {tab === "results" && (
        <div style={{ flex: 1, overflowY: "auto" }}>
          {error ? (
            <div style={{ padding: "10px 14px", fontFamily: "var(--font-mono)", fontSize: 11, color: "#f43f5e", lineHeight: 1.6 }}>
              {error}
            </div>
          ) : result ? (
            <>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--bg2)", position: "sticky", top: 0 }}>
                    {columns.map(col => (
                      <th key={col} style={{
                        padding: "5px 14px",
                        textAlign: "left",
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        fontWeight: 500,
                        color: "var(--text3)",
                        letterSpacing: "0.05em",
                        borderBottom: "1px solid var(--border1)",
                        whiteSpace: "nowrap",
                      }}>
                        {col.toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.012)" }}>
                      {(row as unknown[]).map((cell, j) => (
                        <td key={j} style={{
                          padding: "4px 14px",
                          fontFamily: "var(--font-sans)",
                          fontSize: 12,
                          color: typeof cell === "number" ? "#fb923c" : cell === null ? "var(--text3)" : "var(--text1)",
                          borderBottom: "1px solid var(--border1)",
                          whiteSpace: "nowrap",
                        }}>
                          {cell === null ? "NULL" : String(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{
                padding: "5px 14px",
                display: "flex",
                alignItems: "center",
                gap: 6,
                borderTop: "1px solid var(--border1)",
              }}>
                <span style={{ fontSize: 10, color: "#22c55e", fontFamily: "var(--font-sans)" }}>✓</span>
                <span style={{ fontSize: 10, color: "var(--text3)", fontFamily: "var(--font-sans)" }}>
                  {rows.length} rows returned in {result.exec_ms.toFixed(2)} ms.
                </span>
              </div>
            </>
          ) : (
            <div style={{ padding: 14, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text3)" }}>
              Run a query to see results. (⌘↵)
            </div>
          )}
        </div>
      )}

      {/* ── logs ── */}
      {tab === "logs" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 14px", display: "flex", flexDirection: "column", gap: 3 }}>
          {logs.length === 0
            ? <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text3)" }}>No system logs.</span>
            : logs.map((l, i) => (
                <span key={i} style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: l.includes("ERROR") ? "#f43f5e" : "#22c55e",
                  lineHeight: 1.6,
                }}>{l}</span>
              ))
          }
        </div>
      )}

      {/* ── issues ── */}
      {tab === "issues" && (
        <div style={{ padding: 14, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text3)" }}>
          No schema issues detected.
        </div>
      )}

      {/* ── explain ── */}
      {tab === "explain" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
          {explaining ? (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text3)" }}>
              Generating explanation…
            </span>
          ) : explainError ? (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#f43f5e" }}>
              {explainError}
            </span>
          ) : explanation ? (
            <div style={{
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "var(--text1)",
              lineHeight: 1.75,
              background: "var(--bg2)",
              border: "1px solid var(--border1)",
              borderRadius: 8,
              padding: "12px 16px",
            }}>
              {explanation}
            </div>
          ) : (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text3)" }}>
              Write a query and switch here to explain it.
            </span>
          )}
        </div>
      )}
    </div>
  )
}
