import { Sparkles } from "lucide-react"

interface NlSuggestionsProps {
  onSelectPrompt: (prompt: string) => void
  onAskCustom:   () => void
}

const CHIPS = [
  "Show all tables",
  "Count rows in each table",
  "Find all foreign keys",
  "Show columns of a table",
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
          key={chip}
          onClick={() => onSelectPrompt(chip)}
          style={chipBase}
        >
          {chip}
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
        Ask in plain English
      </button>
    </div>
  )
}
