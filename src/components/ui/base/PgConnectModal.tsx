import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Database, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react"
import { Button } from "./Button"

// ── Types ──────────────────────────────────────────────────────────────────────

export interface PgConfig {
    host:     string
    port:     number
    dbname:   string
    user:     string
    password: string
    ssl:      boolean
}

interface PgConnectModalProps {
    open:      boolean
    onClose:   () => void
    onConnect: (config: PgConfig) => Promise<void>
}

// ── Field component ────────────────────────────────────────────────────────────

interface FieldProps {
    label:        string
    id:           string
    type?:        string
    value:        string
    onChange:     (v: string) => void
    placeholder?: string
    hint?:        string
    disabled?:    boolean
    rightSlot?:   React.ReactNode
    monospace?:   boolean
}

function Field({
    label, id, type = "text", value, onChange,
    placeholder, hint, disabled, rightSlot, monospace,
}: FieldProps) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label
                htmlFor={id}
                style={{
                    fontFamily:    "var(--font-sans)",
                    fontSize:      11,
                    fontWeight:    500,
                    color:         "var(--text2)",
                    letterSpacing: "0.03em",
                    textTransform: "uppercase",
                }}
            >
                {label}
            </label>

            <div style={{ position: "relative", display: "flex" }}>
                <input
                    id={id}
                    type={type}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    disabled={disabled}
                    autoComplete="off"
                    spellCheck={false}
                    style={{
                        flex:            1,
                        height:          34,
                        padding:         rightSlot ? "0 36px 0 11px" : "0 11px",
                        background:      "var(--bg0)",
                        border:          "1px solid var(--border2)",
                        borderRadius:    6,
                        fontFamily:      monospace ? "var(--font-mono)" : "var(--font-sans)",
                        fontSize:        monospace ? 12 : 13,
                        color:           "var(--text1)",
                        outline:         "none",
                        transition:      "border-color 0.15s",
                        opacity:         disabled ? 0.45 : 1,
                    }}
                    onFocus={e  => (e.currentTarget.style.borderColor = "var(--accent)")}
                    onBlur={e   => (e.currentTarget.style.borderColor = "var(--border2)")}
                />
                {rightSlot && (
                    <div style={{
                        position:   "absolute",
                        right:      0,
                        top:        0,
                        bottom:     0,
                        display:    "flex",
                        alignItems: "center",
                        paddingRight: 8,
                    }}>
                        {rightSlot}
                    </div>
                )}
            </div>

            {hint && (
                <span style={{
                    fontFamily: "var(--font-sans)",
                    fontSize:   10.5,
                    color:      "var(--text3)",
                    lineHeight: 1.5,
                }}>
                    {hint}
                </span>
            )}
        </div>
    )
}

// ── Toggle ─────────────────────────────────────────────────────────────────────

function Toggle({
    checked, onChange, label,
}: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
    return (
        <label style={{
            display:    "flex",
            alignItems: "center",
            gap:        8,
            cursor:     "pointer",
            userSelect: "none",
        }}>
            <div
                onClick={() => onChange(!checked)}
                style={{
                    width:        32,
                    height:       18,
                    borderRadius: 999,
                    background:   checked ? "var(--accent)" : "var(--bg3)",
                    border:       `1px solid ${checked ? "var(--accent)" : "var(--border2)"}`,
                    position:     "relative",
                    transition:   "background 0.2s, border-color 0.2s",
                    flexShrink:   0,
                }}
            >
                <div style={{
                    position:   "absolute",
                    top:        2,
                    left:       checked ? 14 : 2,
                    width:      12,
                    height:     12,
                    borderRadius: "50%",
                    background: checked ? "#060b10" : "var(--text3)",
                    transition: "left 0.2s",
                }} />
            </div>
            <span style={{
                fontFamily: "var(--font-sans)",
                fontSize:   12,
                color:      "var(--text2)",
            }}>
                {label}
            </span>
        </label>
    )
}

// ── Modal ──────────────────────────────────────────────────────────────────────

const DEFAULTS: PgConfig = {
    host:     "localhost",
    port:     5432,
    dbname:   "",
    user:     "postgres",
    password: "",
    ssl:      false,
}

export function PgConnectModal({ open, onClose, onConnect }: PgConnectModalProps) {
    const [cfg,         setCfg]         = useState<PgConfig>(DEFAULTS)
    const [showPwd,     setShowPwd]     = useState(false)
    const [connecting,  setConnecting]  = useState(false)
    const [error,       setError]       = useState<string | null>(null)

    function set<K extends keyof PgConfig>(key: K, val: PgConfig[K]) {
        setCfg(prev => ({ ...prev, [key]: val }))
        setError(null)
    }

    async function handleConnect() {
        if (!cfg.dbname.trim() || !cfg.user.trim()) {
            setError("Database name and user are required.")
            return
        }
        setConnecting(true)
        setError(null)
        try {
            await onConnect(cfg)
        } catch (e) {
            setError(String(e))
        } finally {
            setConnecting(false)
        }
    }

    function handleClose() {
        if (connecting) return
        setCfg(DEFAULTS)
        setError(null)
        setShowPwd(false)
        onClose()
    }

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* ── Backdrop ── */}
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        onClick={handleClose}
                        style={{
                            position:   "fixed",
                            inset:       0,
                            background: "rgba(0,0,0,0.65)",
                            backdropFilter: "blur(3px)",
                            zIndex:     100,
                        }}
                    />

                    {/* ── Panel ── */}
                    <motion.div
                        key="modal"
                        initial={{ opacity: 0, scale: 0.96, y: 10 }}
                        animate={{ opacity: 1, scale: 1,    y: 0  }}
                        exit={{ opacity: 0, scale: 0.96, y: 10  }}
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                        style={{
                            position:     "fixed",
                            inset:        0,
                            margin:       "auto",
                            width:        420,
                            height:       "fit-content",
                            background:   "var(--bg1)",
                            border:       "1px solid var(--border2)",
                            borderRadius: 12,
                            zIndex:       101,
                            overflow:     "hidden",
                            boxShadow:    "0 24px 80px rgba(0,0,0,0.6)",
                        }}
                    >

                        {/* ── Header ── */}
                        <div style={{
                            display:      "flex",
                            alignItems:   "center",
                            gap:          10,
                            padding:      "14px 16px",
                            borderBottom: "1px solid var(--border1)",
                            background:   "var(--bg2)",
                        }}>
                            <div style={{
                                width:        28,
                                height:       28,
                                borderRadius: 7,
                                background:   "rgba(93,184,245,0.1)",
                                border:       "1px solid rgba(93,184,245,0.2)",
                                display:      "flex",
                                alignItems:   "center",
                                justifyContent: "center",
                                flexShrink:   0,
                            }}>
                                <Database size={13} style={{ color: "var(--accent)" }} />
                            </div>

                            <div style={{ flex: 1 }}>
                                <div style={{
                                    fontFamily:    "var(--font-sans)",
                                    fontSize:      13,
                                    fontWeight:    600,
                                    color:         "var(--text1)",
                                    letterSpacing: "-0.01em",
                                }}>
                                    Connetti PostgreSQL
                                </div>
                                <div style={{
                                    fontFamily:    "var(--font-mono)",
                                    fontSize:      9,
                                    color:         "var(--text3)",
                                    letterSpacing: "0.05em",
                                }}>
                                    NUOVA CONNESSIONE
                                </div>
                            </div>

                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Chiudi"
                                onClick={handleClose}
                                disabled={connecting}
                            >
                                <X size={13} />
                            </Button>
                        </div>

                        {/* ── Body ── */}
                        <div style={{
                            padding: "20px 20px 0",
                            display: "flex",
                            flexDirection: "column",
                            gap: 14,
                        }}>

                            {/* Host + Port */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 90px", gap: 10 }}>
                                <Field
                                    label="Host"
                                    id="pg-host"
                                    value={cfg.host}
                                    onChange={v => set("host", v)}
                                    placeholder="localhost"
                                    monospace
                                    disabled={connecting}
                                />
                                <Field
                                    label="Port"
                                    id="pg-port"
                                    type="number"
                                    value={String(cfg.port)}
                                    onChange={v => set("port", Number(v) || 5432)}
                                    placeholder="5432"
                                    monospace
                                    disabled={connecting}
                                />
                            </div>

                            {/* Database */}
                            <Field
                                label="Database"
                                id="pg-dbname"
                                value={cfg.dbname}
                                onChange={v => set("dbname", v)}
                                placeholder="my_database"
                                monospace
                                disabled={connecting}
                            />

                            {/* User */}
                            <Field
                                label="User"
                                id="pg-user"
                                value={cfg.user}
                                onChange={v => set("user", v)}
                                placeholder="postgres"
                                monospace
                                disabled={connecting}
                            />

                            {/* Password */}
                            <Field
                                label="Password"
                                id="pg-password"
                                type={showPwd ? "text" : "password"}
                                value={cfg.password}
                                onChange={v => set("password", v)}
                                placeholder="••••••••"
                                monospace
                                disabled={connecting}
                                rightSlot={
                                    <button
                                        type="button"
                                        onClick={() => setShowPwd(s => !s)}
                                        style={{
                                            background: "transparent",
                                            border:     "none",
                                            cursor:     "pointer",
                                            color:      "var(--text3)",
                                            display:    "flex",
                                            alignItems: "center",
                                            padding:    0,
                                        }}
                                        aria-label={showPwd ? "Nascondi password" : "Mostra password"}
                                    >
                                        {showPwd ? <EyeOff size={13} /> : <Eye size={13} />}
                                    </button>
                                }
                            />

                            {/* SSL toggle */}
                            <div style={{
                                padding:      "10px 12px",
                                background:   "var(--bg0)",
                                borderRadius: 7,
                                border:       "1px solid var(--border1)",
                            }}>
                                <Toggle
                                    checked={cfg.ssl}
                                    onChange={v => set("ssl", v)}
                                    label="Abilita SSL / TLS"
                                />
                            </div>

                            {/* Connection string preview */}
                            <div style={{
                                padding:      "8px 11px",
                                background:   "var(--bg0)",
                                border:       "1px solid var(--border1)",
                                borderRadius: 7,
                            }}>
                                <div style={{
                                    fontFamily:    "var(--font-mono)",
                                    fontSize:      10.5,
                                    color:         "var(--text3)",
                                    letterSpacing: "0.01em",
                                    wordBreak:     "break-all",
                                }}>
                                    <span style={{ color: "var(--accent)", opacity: 0.7 }}>postgresql://</span>
                                    <span style={{ color: "var(--text2)" }}>{cfg.user || "user"}</span>
                                    {cfg.password && <span style={{ color: "var(--text3)" }}>:••••</span>}
                                    <span style={{ color: "var(--text3)" }}>@</span>
                                    <span style={{ color: "var(--text2)" }}>{cfg.host}</span>
                                    <span style={{ color: "var(--text3)" }}>:{cfg.port}/</span>
                                    <span style={{ color: cfg.dbname ? "var(--text1)" : "var(--text3)" }}>
                                        {cfg.dbname || "database"}
                                    </span>
                                    {cfg.ssl && <span style={{ color: "var(--accent)", opacity: 0.6 }}>?sslmode=require</span>}
                                </div>
                            </div>

                            {/* Error banner */}
                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                        animate={{ opacity: 1, height: "auto", marginTop: 0 }}
                                        exit={{ opacity: 0, height: 0 }}
                                        style={{
                                            display:      "flex",
                                            alignItems:   "flex-start",
                                            gap:          8,
                                            padding:      "9px 12px",
                                            background:   "rgba(244, 63, 94, 0.08)",
                                            border:       "1px solid rgba(244, 63, 94, 0.25)",
                                            borderRadius: 7,
                                        }}
                                    >
                                        <AlertCircle size={13} style={{ color: "#f43f5e", flexShrink: 0, marginTop: 1 }} />
                                        <span style={{
                                            fontFamily: "var(--font-sans)",
                                            fontSize:   12,
                                            color:      "#f87171",
                                            lineHeight: 1.55,
                                        }}>
                                            {error}
                                        </span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* ── Footer ── */}
                        <div style={{
                            display:      "flex",
                            alignItems:   "center",
                            justifyContent: "flex-end",
                            gap:          8,
                            padding:      "16px 20px 20px",
                        }}>
                            <Button
                                variant="ghost"
                                size="md"
                                onClick={handleClose}
                                disabled={connecting}
                            >
                                Annulla
                            </Button>
                            <Button
                                variant="default"
                                size="md"
                                onClick={handleConnect}
                                loading={connecting}
                                disabled={!cfg.dbname.trim() || !cfg.user.trim()}
                                leftIcon={connecting ? <Loader2 size={13} /> : <Database size={13} />}
                            >
                                {connecting ? "Connessione…" : "Connetti"}
                            </Button>
                        </div>

                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
