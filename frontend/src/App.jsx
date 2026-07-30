import React, { useEffect } from "react"
import { Navigate, Route, Routes, useLocation } from "react-router-dom"
import { useDispatch, useSelector } from "react-redux"
import getCurrentUser from "./features/getCurrentUser"
import { setAuthReady, setUserdata } from "./redux/userSlice"
import Landing from "./pages/Landing"
import Docs from "./pages/Docs"
import AppShell from "./pages/AppShell"

function RequireAuth({ children }) {
    const { userData, authReady } = useSelector((state) => state.user)
    const location = useLocation()
    if (!authReady) {
        return (
            <div className="h-screen bg-[#0d0f14] flex items-center justify-center text-slate-500 text-sm">
                Loading OnePrompt…
            </div>
        )
    }
    if (!userData) {
        return <Navigate to="/" replace state={{ from: location.pathname }} />
    }
    return children
}

function App() {
    const dispatch = useDispatch()

    useEffect(() => {
        const boot = async () => {
            const data = await getCurrentUser()
            dispatch(setUserdata(data))
            dispatch(setAuthReady(true))
        }
        boot()
    }, [dispatch])

    return (
        <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/docs" element={<Docs />} />
            <Route path="/app" element={<RequireAuth><AppShell /></RequireAuth>} />
            <Route path="/develop" element={<RequireAuth><AppShell /></RequireAuth>} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}

export default App
