import { useState, useRef } from "react"
import { invoke } from "@tauri-apps/api/core"
import { Play, Plus, MoreHorizontal, PanelBottomClose, X } from "lucide-react"
import { Button } from "./Button"

type ResultTab = "results" | "logs" | "issues"

interface QueryResult {
  columns:       string[]
  rows:          unknown[][]
  rows_affected: number
  exec_ms:       number
}

const DEFAULT_SQL = `SELECT * FROM sqlite_master WHERE type='table' ORDER BY name;`

export function SqlPane() {
  const [tab, setTab]         = useState<ResultTab>("results")
  const [sql, setSql]         = useState(DEFAULT_SQL)
  const [result, setResult]   = useState<QueryResult | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [logs, setLogs]       = useState<string[]>([])
  const textareaRef           = useRef<HTMLTextAreaElement>(null)

  async function runSql() {
    const query = sql.trim()
    if (!query) return
    setRunning(true)
    setError(null)
    const ts = new Date().toLocaleTimeString()
    try {
      const res = await invoke<QueryResult>("run_query", { sql: query })
      setResult(res)
      setLogs(prev => [`[${ts}] OK — ${res.rows_affected} rows, ${res.exec_ms.toFixed(2)} ms`, ...prev])
      setTab("results")
    } catch (e) {
      const msg = String(e)
      setError(msg)
      setLogs(prev => [`[${ts}] ERROR — ${msg}`, ...prev])
      setTab("logs")
    } finally {
      setRunning(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Cmd/Ctrl + Enter → run
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      runSql()
    }
    // Tab → insert 2 spaces instead of focus-jump
    if (e.key === "Tab") {
      e.preventDefault()
      const ta = textareaRef.current!
      const start = ta.selectionStart
      const end   = ta.selectionEnd
      const next  = sql.substring(0, start) + "  " + sql.substring(end)
      setSql(next)
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + 2 })
    }
  }

  const columns = result?.columns ?? []
  const rows    = result?.rows    ?? []

  return (
    <div style={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      background: "var(--bg1)",
      borderTop: "1px solid var(--border1)",
      overflow: "hidden",
    }}>

      {/* ── Editor area ── */}
      <div style={{ flex: "0 0 auto", borderBottom: "1px solid var(--border1)" }}>

        {/* header bar */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 8px 5px 12px",
          borderBottom: "1px solid var(--border1)",
        }}>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 500, color: "var(--text2)", flex: 1 }}>
            Schema Console
          </span>
          <Button
            variant="default"
            size="sm"
            leftIcon={<Play size={10} />}
            loading={running}
            onClick={runSql}
          >
            Run
          </Button>
        </div>

        {/* Editable SQL textarea */}
        <div style={{ position: "relative" }}>
          <textarea
            ref={textareaRef}
            value={sql}
            onChange={e => setSql(e.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "8px 14px",
              fontFamily: "var(--font-mono)",
              fontSize: 11.5,
              color: "var(--text1)",
              lineHeight: 1.7,
              background: "var(--bg1)",
              border: "none",
              outline: "none",
              resize: "none",
              maxHeight: 110,
              minHeight: 60,
              overflowY: "auto",
            }}
            placeholder="Type SQL here… (⌘↵ to run)"
          />
        </div>
      </div>

      {/* ── Results area ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* tab bar */}
        <div style={{
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid var(--border1)",
          background: "var(--bg2)",
          padding: "0 8px",
          gap: 2,
        }}>
          {(["results", "logs", "issues"] as ResultTab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                fontWeight: tab === t ? 500 : 400,
                color: tab === t ? "var(--text1)" : "var(--text3)",
                padding: "6px 10px",
                background: "transparent",
                border: "none",
                borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
                cursor: "pointer",
                transition: "color 0.1s",
              }}
            >
              {t === "results" ? "Query Results" : t === "logs" ? "System Logs" : "Schema Issues"}
            </button>
          ))}

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 2 }}>
            <Button variant="ghost" size="icon" aria-label="Add"><Plus size={12} /></Button>
            <Button variant="ghost" size="icon" aria-label="More"><MoreHorizontal size={12} /></Button>
            <Button variant="ghost" size="icon" aria-label="Split"><PanelBottomClose size={12} /></Button>
            <Button variant="ghost" size="icon" aria-label="Close"><X size={12} /></Button>
          </div>
        </div>

        {/* results table */}
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

                {/* status bar */}
                <div style={{
                  padding: "5px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  borderTop: "1px solid var(--border1)",
                }}>
                  <span style={{ fontSize: 10, color: "#22c55e", fontFamily: "var(--font-sans)" }}>✓</span>
                  <span style={{ fontSize: 10, color: "var(--text3)", fontFamily: "var(--font-sans)" }}>
                    {rows.length} rows returned. Executed in {result.exec_ms.toFixed(2)} ms.
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

        {tab === "issues" && (
          <div style={{ padding: 14, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text3)" }}>
            No schema issues detected.
          </div>
        )}
      </div>
    </div>
  )
}
