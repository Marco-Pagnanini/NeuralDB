import { useState } from "react"
import { WelcomeScreen } from "./components/pages/WelcomeScreen"
import "./App.css"

function App() {
    const [showConnect, setShowConnect] = useState(false)

    return (
        <div style={{ width: "100vw", height: "100vh" }}>
            <WelcomeScreen onConnect={() => setShowConnect(true)} />

        </div>
    )
}

export default App
