import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, X, Send, Code2, Copy, Check, RotateCcw } from "lucide-react"
import { Button } from "../base/Button"
import { generateQuery, explainQuery } from "../../../lib/api"

// ── Types ─────────────────────────────────────────────────────────────────────

type MessageRole = "user" | "assistant" | "system"

interface Message {
    id: string
    role: MessageRole
    content: string
    sql?: string   // populated when AI returns a SQL block
}

interface AiChatProps {
    open: boolean
    onClose: () => void
    currentSql?: string
    onInsertSql?: (sql: string) => void
}

// ── Intent detection ──────────────────────────────────────────────────────────

function detectIntent(text: string): "explain" | "generate" {
    const l = text.toLowerCase()
    if (
        l.includes("spiega") || l.includes("explain") ||
        l.includes("cosa fa") || l.includes("what does") ||
        l.includes("come funziona") || l.includes("how does")
    ) return "explain"
    return "generate"
}

// ── SQL block inside a message ─────────────────────────────────────────────────

function SqlBlock({ sql, onInsert }: { sql: string; onInsert?: (s: string) => void }) {
    const [copied, setCopied] = useState(false)

    function copy() {
        navigator.clipboard.writeText(sql)
        setCopied(true)
        setTimeout(() => setCopied(false), 1800)
    }

    return (
        <div style={{
            marginTop: 8,
            background: "var(--bg0)",
            border: "1px solid var(--border2)",
            borderRadius: 6,
            overflow: "hidden",
            fontSize: 0, // eliminate inline gaps
        }}>
            {/* mini toolbar */}
            <div style={{
                display: "flex",
                alignItems: "center",
                padding: "4px 8px",
                gap: 6,
                background: "var(--bg3)",
                borderBottom: "1px solid var(--border1)",
            }}>
                <Code2 size={10} style={{ color: "var(--text3)" }} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text3)", flex: 1, letterSpacing: "0.05em" }}>
                    SQL
                </span>
                <button
                    onClick={copy}
                    style={{
                        display: "flex", alignItems: "center", gap: 3,
                        background: "transparent", border: "none", cursor: "pointer",
                        fontFamily: "var(--font-sans)", fontSize: 9,
                        color: copied ? "#22c55e" : "var(--text3)",
                    }}
                >
                    {copied ? <Check size={10} /> : <Copy size={10} />}
                    {copied ? "Copied" : "Copy"}
                </button>
                {onInsert && (
                    <button
                        onClick={() => onInsert(sql)}
                        style={{
                            background: "var(--accent)",
                            border: "none",
                            cursor: "pointer",
                            color: "#060b10",
                            fontFamily: "var(--font-sans)",
                            fontSize: 9,
                            fontWeight: 700,
                            padding: "2px 7px",
                            borderRadius: 3,
                        }}
                    >
                        Insert ↗
                    </button>
                )}
            </div>

            {/* code */}
            <pre style={{
                margin: 0,
                padding: "8px 10px",
                fontFamily: "var(--font-mono)",
                fontSize: 10.5,
                color: "var(--text1)",
                lineHeight: 1.7,
                overflowX: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
            }}>
                {sql}
            </pre>
        </div>
    )
}

// ── Dot typing indicator ───────────────────────────────────────────────────────

function TypingDots() {
    return (
        <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "10px 14px",
            borderRadius: "12px 12px 12px 3px",
            background: "var(--bg2)",
            border: "1px solid var(--border2)",
        }}>
            {[0, 1, 2].map(i => (
                <motion.div
                    key={i}
                    animate={{ y: [0, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 0.7, delay: i * 0.15, ease: "easeInOut" }}
                    style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)", opacity: 0.8 }}
                />
            ))}
        </div>
    )
}

// ── Welcome message ────────────────────────────────────────────────────────────

const WELCOME_MSG: Message = {
    id: "welcome",
    role: "assistant",
    content: "Ciao! Sono il tuo assistente AI per NeuralDB.\n\nPosso aiutarti a:\n• Generare query SQL dal linguaggio naturale\n• Spiegare query esistenti\n• Ottimizzare le tue query",
}

// ── Quick action chips ─────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
    { label: "Mostra tutte le tabelle", prompt: "Genera una query per mostrare tutte le tabelle nel database" },
    { label: "Conta righe per tabella", prompt: "Genera una query che conta le righe per ogni tabella" },
    { label: "Spiega la query attiva", prompt: "__explain__" },
]

// ── Main AiChat component ──────────────────────────────────────────────────────

export function AiChat({ open, onClose, currentSql, onInsertSql }: AiChatProps) {
    const [messages, setMessages] = useState<Message[]>([WELCOME_MSG])
    const [input, setInput] = useState("")
    const [loading, setLoading] = useState(false)
    const bottomRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // Focus input when opened
    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 300)
    }, [open])

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages, loading])

    async function send(overridePrompt?: string) {
        const text = (overridePrompt ?? input).trim()
        if (!text || loading) return

        const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: text }
        setMessages(prev => [...prev, userMsg])
        if (!overridePrompt) setInput("")
        setLoading(true)

        try {
            // Special action: explain current SQL
            if (text === "__explain__") {
                if (!currentSql?.trim()) {
                    setMessages(prev => [...prev, {
                        id: `a-${Date.now()}`,
                        role: "assistant",
                        content: "Nessuna query da spiegare. Scrivi prima una query nell'editor SQL.",
                    }])
                    return
                }
                const explanation = await explainQuery(currentSql)
                setMessages(prev => [...prev, {
                    id: `a-${Date.now()}`,
                    role: "assistant",
                    content: explanation,
                }])
                return
            }

            // Classify and respond
            const intent = detectIntent(text)

            if (intent === "explain" && currentSql?.trim()) {
                const explanation = await explainQuery(currentSql)
                setMessages(prev => [...prev, {
                    id: `a-${Date.now()}`,
                    role: "assistant",
                    content: explanation,
                }])
            } else {
                const sql = await generateQuery(text, [])
                setMessages(prev => [...prev, {
                    id: `a-${Date.now()}`,
                    role: "assistant",
                    content: "Ecco la query generata:",
                    sql,
                }])
            }
        } catch (e) {
            setMessages(prev => [...prev, {
                id: `a-${Date.now()}`,
                role: "assistant",
                content: `Errore: ${String(e)}`,
            }])
        } finally {
            setLoading(false)
        }
    }

    function reset() {
        setMessages([WELCOME_MSG])
        setInput("")
    }

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ x: "100%", opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: "100%", opacity: 0 }}
                    transition={{ type: "spring", stiffness: 380, damping: 36 }}
                    style={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        bottom: 0,
                        width: 340,
                        display: "flex",
                        flexDirection: "column",
                        background: "var(--bg1)",
                        borderLeft: "1px solid var(--border1)",
                        zIndex: 50,
                        boxShadow: "-6px 0 32px rgba(0,0,0,0.45)",
                    }}
                >

                    {/* ── header ── */}
                    <div style={{
                        height: 44,
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "0 12px",
                        borderBottom: "1px solid var(--border1)",
                        background: "var(--bg2)",
                        flexShrink: 0,
                    }}>
                        {/* icon */}
                        <div style={{
                            width: 26,
                            height: 26,
                            borderRadius: "50%",
                            background: "var(--accent-dim)",
                            border: "1px solid rgba(93,184,245,0.3)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                        }}>
                            <Sparkles size={12} style={{ color: "var(--accent)" }} />
                        </div>

                        <div style={{ flex: 1 }}>
                            <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600, color: "var(--text1)", letterSpacing: "-0.01em" }}>
                                NeuralDB AI
                            </div>
                            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text3)", letterSpacing: "0.04em" }}>
                                ASSISTANT
                            </div>
                        </div>

                        <Button variant="ghost" size="icon" aria-label="Reset chat" onClick={reset}>
                            <RotateCcw size={12} />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
                            <X size={13} />
                        </Button>
                    </div>

                    {/* ── messages ── */}
                    <div style={{
                        flex: 1,
                        overflowY: "auto",
                        padding: "14px 12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 14,
                    }}>
                        {messages.map(msg => (
                            <div
                                key={msg.id}
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                                    gap: 4,
                                }}
                            >
                                {/* label */}
                                <span style={{
                                    fontFamily: "var(--font-mono)",
                                    fontSize: 9,
                                    color: "var(--text3)",
                                    letterSpacing: "0.05em",
                                    padding: "0 4px",
                                }}>
                                    {msg.role === "user" ? "YOU" : "NEURALDB AI"}
                                </span>

                                {/* bubble */}
                                <div style={{
                                    maxWidth: "90%",
                                    padding: "9px 13px",
                                    borderRadius: msg.role === "user"
                                        ? "12px 12px 3px 12px"
                                        : "12px 12px 12px 3px",
                                    background: msg.role === "user" ? "var(--accent-dim)" : "var(--bg2)",
                                    border: `1px solid ${msg.role === "user" ? "rgba(93,184,245,0.2)" : "var(--border2)"}`,
                                    fontFamily: "var(--font-sans)",
                                    fontSize: 12,
                                    color: msg.role === "user" ? "var(--accent2)" : "var(--text1)",
                                    lineHeight: 1.65,
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-word",
                                }}>
                                    {msg.content}
                                    {msg.sql && (
                                        <SqlBlock sql={msg.sql} onInsert={onInsertSql} />
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* typing indicator */}
                        {loading && (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text3)", letterSpacing: "0.05em", padding: "0 4px" }}>
                                    NEURALDB AI
                                </span>
                                <TypingDots />
                            </div>
                        )}

                        <div ref={bottomRef} />
                    </div>

                    {/* ── quick actions ── */}
                    {messages.length <= 1 && !loading && (
                        <div style={{
                            padding: "0 12px 10px",
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 5,
                            flexShrink: 0,
                        }}>
                            {QUICK_ACTIONS.map(a => (
                                <button
                                    key={a.label}
                                    onClick={() => send(a.prompt)}
                                    style={{
                                        fontFamily: "var(--font-sans)",
                                        fontSize: 10.5,
                                        padding: "3px 9px",
                                        borderRadius: 999,
                                        border: "1px solid var(--border2)",
                                        background: "var(--bg2)",
                                        color: "var(--text2)",
                                        cursor: "pointer",
                                        transition: "border-color 0.1s, color 0.1s",
                                    }}
                                >
                                    {a.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* ── input ── */}
                    <div style={{
                        borderTop: "1px solid var(--border1)",
                        padding: "10px 12px",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        background: "var(--bg2)",
                    }}>
                        <Sparkles size={12} style={{ color: "var(--accent)", flexShrink: 0 }} />
                        <input
                            ref={inputRef}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() }
                            }}
                            disabled={loading}
                            placeholder="Chiedi qualcosa…"
                            style={{
                                flex: 1,
                                fontFamily: "var(--font-sans)",
                                fontSize: 12,
                                color: "var(--text1)",
                                background: "transparent",
                                border: "none",
                                outline: "none",
                                opacity: loading ? 0.5 : 1,
                            }}
                        />
                        <Button
                            variant="default"
                            size="icon"
                            aria-label="Send"
                            onClick={() => send()}
                            loading={loading}
                            disabled={!input.trim()}
                        >
                            <Send size={18} />
                        </Button>
                    </div>

                </motion.div>
            )}
        </AnimatePresence>
    )
}
