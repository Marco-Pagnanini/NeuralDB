import { Sparkles } from "lucide-react"

interface NlSuggestionsProps {
  onSelectPrompt: (sql: string) => void
  onAskCustom:   () => void
}

const CHIPS: { label: string; sql: string }[] = [
  {
    label: "Show all tables",
    sql:   "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;",
  },
  {
    label: "Count rows in each table",
    sql:   "SELECT name FROM sqlite_master WHERE type='table';",
  },
  {
    label: "Find all foreign keys",
    sql:   "SELECT * FROM pragma_foreign_key_list((SELECT name FROM sqlite_master WHERE type='table' LIMIT 1));",
  },
  {
    label: "Show columns of a table",
    sql:   "PRAGMA table_info('your_table');",
  },
]

const chipBase: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 11,
  padding: "3px 10px",
  borderRadius: 999,
  border: "1px solid var(--border2)",
  background: "var(--bg2)",
  color: "var(--text2)",
  cursor: "pointer",
  transition: "border-color 0.1s, color 0.1s",
}

export function NlSuggestions({ onSelectPrompt, onAskCustom }: NlSuggestionsProps) {
  return (
    <div style={{
      display: "flex",
      flexWrap: "wrap",
      gap: 6,
      padding: "8px 14px",
      alignItems: "center",
      minHeight: 60,
    }}>
      {CHIPS.map(chip => (
        <button
          key={chip.label}
          onClick={() => onSelectPrompt(chip.sql)}
          style={chipBase}
        >
          {chip.label}
        </button>
      ))}

      <button
        onClick={onAskCustom}
        style={{
          ...chipBase,
          display: "flex",
          alignItems: "center",
          gap: 5,
          borderColor: "var(--accent)",
          color: "var(--accent)",
        }}
      >
        <Sparkles size={10} />
        Ask AI
      </button>
    </div>
  )
}
