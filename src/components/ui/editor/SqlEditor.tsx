import { useRef } from "react"
import { Play, Sparkles } from "lucide-react"
import { Button } from "../base/Button"
import { NlSuggestions } from "./NlSuggestions"

interface SqlEditorProps {
  sql:             string
  onChange:        (sql: string) => void
  running:         boolean
  onRun:           () => void
  nlMode:          boolean
  nlInput:         string
  nlLoading:       boolean
  onNlInputChange: (v: string) => void
  onNlSubmit:      () => void
  onNlModeOn:      () => void
  onNlModeOff:     () => void
}

export function SqlEditor({
  sql, onChange, running, onRun,
  nlMode, nlInput, nlLoading,
  onNlInputChange, onNlSubmit,
  onNlModeOn, onNlModeOff,
}: SqlEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      onRun()
    }
    if (e.key === "Tab") {
      e.preventDefault()
      const ta    = textareaRef.current!
      const start = ta.selectionStart
      const end   = ta.selectionEnd
      const next  = sql.substring(0, start) + "  " + sql.substring(end)
      onChange(next)
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + 2 })
    }
  }

  return (
    <div style={{
      width: 360,
      minWidth: 240,
      flexShrink: 0,
      display: "flex",
      flexDirection: "column",
      borderRight: "1px solid var(--border1)",
      background: "var(--bg1)",
    }}>

      {/* ── header ── */}
      <div style={{
        height: 34,
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "0 8px 0 12px",
        borderBottom: "1px solid var(--border1)",
        flexShrink: 0,
      }}>
        <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 500, color: "var(--text2)", flex: 1 }}>
          SQL Editor
        </span>
        <Button
          variant="default"
          size="sm"
          leftIcon={<Play size={10} />}
          loading={running}
          onClick={onRun}
        >
          Run
        </Button>
      </div>

      {/* ── body: chips / nl input / textarea ── */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative", display: "flex", flexDirection: "column" }}>
        {sql === "" && !nlMode ? (
          <NlSuggestions
            onSelectPrompt={onChange}
            onAskCustom={onNlModeOn}
          />
        ) : nlMode ? (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 6, padding: "8px 14px", flex: 1 }}>
            <Sparkles size={12} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 3 }} />
            <input
              autoFocus
              value={nlInput}
              onChange={e => onNlInputChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter")  { e.preventDefault(); onNlSubmit() }
                if (e.key === "Escape") { onNlModeOff() }
              }}
              disabled={nlLoading}
              placeholder="Describe your query… (↵ to generate, Esc to cancel)"
              style={{
                flex: 1,
                fontFamily: "var(--font-sans)",
                fontSize: 11.5,
                color: "var(--text1)",
                background: "transparent",
                border: "none",
                outline: "none",
                opacity: nlLoading ? 0.5 : 1,
                lineHeight: 1.7,
              }}
            />
            {nlLoading && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text3)", flexShrink: 0 }}>
                generating…
              </span>
            )}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={sql}
            onChange={e => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            style={{
              flex: 1,
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
            }}
            placeholder="Type SQL here… (⌘↵ to run)"
          />
        )}
      </div>
    </div>
  )
}
