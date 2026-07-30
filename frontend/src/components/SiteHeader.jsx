import React from "react"
import { NavLink, useNavigate } from "react-router-dom"
import { useDispatch, useSelector } from "react-redux"
import { signInWithGoogle } from "../features/googleLogin"
import Logo from "./Logo"

function SiteHeader() {
    const { userData } = useSelector((state) => state.user)
    const dispatch = useDispatch()
    const navigate = useNavigate()

    const linkClass = ({ isActive }) =>
        `text-[13px] px-3 py-1.5 rounded-lg transition-colors ${isActive ? "text-white bg-white/[0.07]" : "text-slate-400 hover:text-slate-100"}`

    const handleSignIn = async () => {
        try {
            await signInWithGoogle(dispatch)
            navigate("/app")
        } catch (error) {
            console.log(error)
        }
    }

    return (
        <header className="sticky top-0 z-30 bg-[#0b0d12]/75 backdrop-blur-xl border-b border-white/[0.06]">
            <div className="max-w-6xl mx-auto px-5 h-16 flex items-center gap-6">
                <Logo size={28} />
                <nav className="hidden sm:flex items-center gap-1">
                    <NavLink to="/docs" className={linkClass}>Docs</NavLink>
                    {userData && (
                        <>
                            <NavLink to="/app" className={linkClass}>Playground</NavLink>
                            <NavLink to="/develop" className={linkClass}>Develop</NavLink>
                        </>
                    )}
                </nav>
                <div className="ml-auto flex items-center gap-2">
                    {!userData && (
                        <NavLink to="/docs" className="sm:hidden text-[13px] px-3 py-1.5 text-slate-400">Docs</NavLink>
                    )}
                    {userData ? (
                        <NavLink to="/app" className="text-[13px] px-3.5 h-9 inline-flex items-center rounded-lg bg-white text-black font-medium">
                            Open app
                        </NavLink>
                    ) : (
                        <button onClick={handleSignIn} className="text-[13px] px-3.5 h-9 inline-flex items-center rounded-lg bg-white text-black font-medium cursor-pointer">
                            Sign in
                        </button>
                    )}
                </div>
            </div>
        </header>
    )
}

export default SiteHeader
