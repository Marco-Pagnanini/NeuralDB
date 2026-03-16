import { motion } from "framer-motion"
import { Database, FolderOpen } from "lucide-react"
import { open } from "@tauri-apps/plugin-dialog"
import { invoke } from "@tauri-apps/api/core"
import { Tiles } from "../ui/base/tiles"
import { Button } from "../ui/base/Button"
import logo from "../../assets/logo.png"

interface WelcomeScreenProps {
    onConnect: (path: string) => void
}

export function WelcomeScreen({ onConnect }: WelcomeScreenProps) {

    async function pickFile() {
        const selected = await open({
            title: "Apri database SQLite",
            filters: [{ name: "SQLite", extensions: ["sqlite", "db", "sqlite3"] }],
            multiple: false,
            directory: false,
        })
        if (!selected) return          // user cancelled
        const path = typeof selected === "string" ? selected : selected
        await invoke("open_db", { path })
        onConnect(path as string)
    }

    return (
        <div
            className="relative w-full h-full overflow-hidden flex items-center justify-center"
            style={{ background: "var(--bg0)" }}
        >
            {/* grid */}
            <div className="absolute inset-0">
                <Tiles rows={80} cols={40} tileSize="md" />
            </div>

            {/* vignette */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: `radial-gradient(ellipse 70% 60% at 50% 50%,
                        transparent 20%,
                        rgba(11,11,14,0.6) 60%,
                        var(--bg0) 100%)`,
                }}
            />

            {/* contenuto */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative z-10 flex flex-col items-center gap-7 text-center"
                style={{ width: 360 }}
            >
                {/* logo + nome */}
                <motion.div
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className="flex flex-col items-center gap-3"
                >
                    <div style={{ position: "relative", width: 80, height: 80 }}>
                        <div style={{
                            position: "absolute", inset: 0,
                            borderRadius: "50%",
                            background: "var(--accent)",
                            opacity: 0.15,
                            filter: "blur(18px)",
                            transform: "scale(1.3)",
                        }} />
                        <div style={{
                            position: "relative",
                            width: 80, height: 80,
                            borderRadius: "50%",
                            overflow: "hidden",
                        }}>
                            <img
                                src={logo}
                                alt="NeuralDB"
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    objectPosition: "center 10%",
                                }}
                            />
                        </div>
                    </div>

                    <p style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 22,
                        fontWeight: 600,
                        letterSpacing: "-0.03em",
                        color: "var(--text1)",
                    }}>
                        Neural<span style={{ color: "var(--accent)" }}>DB</span>
                    </p>
                </motion.div>

                {/* headline */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                    className="flex flex-col gap-2"
                >
                    <h1 style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 18,
                        fontWeight: 500,
                        color: "var(--text1)",
                        letterSpacing: "-0.02em",
                        lineHeight: 1.35,
                    }}>
                        Il tuo database client,{" "}
                        <span style={{ color: "var(--accent)" }}>potenziato dall'AI</span>
                    </h1>
                    <p style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 13,
                        color: "var(--text3)",
                        lineHeight: 1.65,
                    }}>
                        Connetti un database SQLite e inizia a esplorare,
                        interrogare e analizzare i tuoi dati.
                    </p>
                </motion.div>

                {/* CTA buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.3 }}
                    className="flex flex-col gap-2 w-full"
                >
                    <Button
                        size="lg"
                        variant="default"
                        leftIcon={<Database size={15} />}
                        onClick={pickFile}
                        className="w-full justify-center"
                    >
                        Connetti database
                    </Button>

                    <Button
                        size="lg"
                        variant="outline"
                        leftIcon={<FolderOpen size={15} />}
                        onClick={pickFile}
                        className="w-full justify-center"
                    >
                        Apri file .sqlite
                    </Button>
                </motion.div>

            </motion.div>
        </div>
    )
}
