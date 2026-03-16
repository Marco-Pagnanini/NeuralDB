import { useState } from "react"
import { WelcomeScreen } from "./components/pages/WelcomeScreen"
import { Dashboard } from "./components/pages/Dashboard"
import "./App.css"

function App() {
    const [connected, setConnected] = useState(false)

    return (
        <div style={{ width: "100vw", height: "100vh" }}>
            {connected
                ? <Dashboard />
                : <WelcomeScreen onConnect={() => setConnected(true)} />
            }
        </div>
    )
}

export default App
