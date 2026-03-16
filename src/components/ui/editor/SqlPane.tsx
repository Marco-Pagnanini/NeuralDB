/**
 * SqlPane — thin orchestrator.
 * Layout: SqlEditor (left, fixed width) | ResultsPanel (right, flex-1)
 *
 * State is lifted here so Dashboard can pass `sql` / `onSqlChange`
 * to the AiChat panel as well.
 */
import { useState, useEffect } from "react"
import { invoke } from "@tauri-apps/api/core"
import { explainQuery, generateQuery } from "../../../lib/api"
import { SqlEditor } from "./SqlEditor"
import { ResultsPanel } from "./ResultsPanel"
import type { QueryResult } from "./ResultsPanel"

interface SqlPaneProps {
  sql:         string
  onSqlChange: (s: string) => void
}

export function SqlPane({ sql, onSqlChange }: SqlPaneProps) {
  const [result,          setResult]          = useState<QueryResult | null>(null)
  const [running,         setRunning]         = useState(false)
  const [error,           setError]           = useState<string | null>(null)
  const [logs,            setLogs]            = useState<string[]>([])
  const [explanation,     setExplanation]     = useState<string | null>(null)
  const [explaining,      setExplaining]      = useState(false)
  const [explainError,    setExplainError]    = useState<string | null>(null)
  const [lastExplainedSql, setLastExplainedSql] = useState<string | null>(null)
  const [nlMode,          setNlMode]          = useState(false)
  const [nlInput,         setNlInput]         = useState("")
  const [nlLoading,       setNlLoading]       = useState(false)

  // Lazy explain: debounce 1 s after SQL changes
  useEffect(() => {
    if (!sql.trim() || sql === lastExplainedSql) return
    const timer = setTimeout(() => triggerExplain(sql), 1000)
    return () => clearTimeout(timer)
  }, [sql])

  // ── SQL execution ──────────────────────────────────────────────────────────

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
    } catch (e) {
      const msg = String(e)
      setError(msg)
      setLogs(prev => [`[${ts}] ERROR — ${msg}`, ...prev])
    } finally {
      setRunning(false)
    }
  }

  // ── Explain ────────────────────────────────────────────────────────────────

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

  // ── NL generation ──────────────────────────────────────────────────────────

  async function handleNlSubmit() {
    if (!nlInput.trim()) return
    setNlLoading(true)
    try {
      const generated = await generateQuery(nlInput, [])
      onSqlChange(generated)
      setNlMode(false)
      setNlInput("")
    } catch (e) {
      console.error("generateQuery failed:", e)
    } finally {
      setNlLoading(false)
    }
  }

  return (
    <div style={{
      height:        "100%",
      display:       "flex",
      flexDirection: "row",
      background:    "var(--bg1)",
      borderTop:     "1px solid var(--border1)",
      overflow:      "hidden",
    }}>
      <SqlEditor
        sql={sql}
        onChange={onSqlChange}
        running={running}
        onRun={runSql}
        nlMode={nlMode}
        nlInput={nlInput}
        nlLoading={nlLoading}
        onNlInputChange={setNlInput}
        onNlSubmit={handleNlSubmit}
        onNlModeOn={() => setNlMode(true)}
        onNlModeOff={() => { setNlMode(false); setNlInput("") }}
      />
      <ResultsPanel
        result={result}
        error={error}
        logs={logs}
        explanation={explanation}
        explaining={explaining}
        explainError={explainError}
      />
    </div>
  )
}
