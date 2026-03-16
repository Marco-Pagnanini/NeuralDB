import { useState, useRef, useEffect } from "react"
import { invoke } from "@tauri-apps/api/core"
import { Play, Plus, MoreHorizontal, PanelBottomClose, X, Sparkles } from "lucide-react"
import { Button } from "./Button"
import { NlSuggestions } from "./NlSuggestions"
import { explainQuery, generateQuery } from "../../lib/api"

type ResultTab = "results" | "logs" | "issues" | "explain"

interface QueryResult {
  columns:       string[]
  rows:          unknown[][]
  rows_affected: number
  exec_ms:       number
}

export function SqlPane() {
  const [tab, setTab]                           = useState<ResultTab>("results")
  const [sql, setSql]                           = useState("")
  const [result, setResult]                     = useState<QueryResult | null>(null)
  const [running, setRunning]                   = useState(false)
  const [error, setError]                       = useState<string | null>(null)
  const [logs, setLogs]                         = useState<string[]>([])
  const [explanation, setExplanation]           = useState<string | null>(null)
  const [explaining, setExplaining]             = useState(false)
  const [explainError, setExplainError]         = useState<string | null>(null)
  const [lastExplainedSql, setLastExplainedSql] = useState<string | null>(null)
  const [nlMode, setNlMode]                     = useState(false)
  const [nlInput, setNlInput]                   = useState("")
  const [nlLoading, setNlLoading]               = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (tab === "explain") {
      triggerExplain(sql)
    }
  }, [tab, sql])

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
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      runSql()
    }
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

  async function triggerExplain(query: string) {
    if (!query.trim() || query === lastExplainedSql) return
    setExplaining(true)
    setExplainError(null)
    try {
      const text = await explainQuery(query)
      setExplanation(text)
      setLastExplainedSql(query)
    } catch (e) {
      setExplainError(String(e))
    } finally {
      setExplaining(false)
    }
  }

  async function handleNlSubmit() {
    if (!nlInput.trim()) return
    setNlLoading(true)
    try {
      const generated = await generateQuery(nlInput, [])
      setSql(generated)
      setNlMode(false)
      setNlInput("")
      // focus the textarea after generation so it's ready to edit/run
      requestAnimationFrame(() => textareaRef.current?.focus())
    } catch (e) {
      // fall back gracefully — stay in nl mode, let user retry
      console.error("generateQuery failed:", e)
    } finally {
      setNlLoading(false)
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

        {/* Textarea area — chips, nl input, or plain SQL editor */}
        <div style={{ position: "relative" }}>

          {/* Chips: only when sql is empty and not in nl mode */}
          {sql === "" && !nlMode && (
            <NlSuggestions
              onSelectPrompt={async (prompt) => {
                setNlLoading(true)
                try {
                  const generated = await generateQuery(prompt, [])
                  setSql(generated)
                } catch (e) {
                  console.error("generateQuery failed:", e)
                } finally {
                  setNlLoading(false)
                }
              }}
              onAskCustom={() => setNlMode(true)}
            />
          )}

          {/* Natural language input mode */}
          {nlMode ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px" }}>
              <Sparkles size={12} style={{ color: "var(--accent)", flexShrink: 0 }} />
              <input
                autoFocus
                value={nlInput}
                onChange={e => setNlInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") { e.preventDefault(); handleNlSubmit() }
                  if (e.key === "Escape") { setNlMode(false); setNlInput("") }
                }}
                disabled={nlLoading}
                placeholder="Describe what you want… (Enter to generate, Esc to cancel)"
                style={{
                  flex: 1,
                  fontFamily: "var(--font-sans)",
                  fontSize: 11.5,
                  color: "var(--text1)",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  opacity: nlLoading ? 0.5 : 1,
                  minHeight: 60,
                  lineHeight: 1.7,
                }}
              />
              {nlLoading && (
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text3)" }}>
                  generating…
                </span>
              )}
            </div>
          ) : (
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
          )}
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
          {(["results", "logs", "issues", "explain"] as ResultTab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
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
              {t === "explain" && <Sparkles size={10} />}
              {t === "results" ? "Query Results"
                : t === "logs"   ? "System Logs"
                : t === "issues" ? "Schema Issues"
                :                  "Explain"}
            </button>
          ))}

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 2 }}>
            <Button variant="ghost" size="icon" aria-label="Add"><Plus size={12} /></Button>
            <Button variant="ghost" size="icon" aria-label="More"><MoreHorizontal size={12} /></Button>
            <Button variant="ghost" size="icon" aria-label="Split"><PanelBottomClose size={12} /></Button>
            <Button variant="ghost" size="icon" aria-label="Close"><X size={12} /></Button>
          </div>
        </div>

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
    </div>
  )
}
