import { useState } from "react"
import { WelcomeScreen } from "./components/pages/WelcomeScreen"
import { Dashboard } from "./components/pages/Dashboard"
import "./App.css"

function App() {
    const [dbPath, setDbPath] = useState<string | null>(null)

    return (
        <div style={{ width: "100vw", height: "100vh" }}>
            {dbPath
                ? <Dashboard dbPath={dbPath} />
                : <WelcomeScreen onConnect={(path) => setDbPath(path)} />
            }
        </div>
    )
}

export default App
