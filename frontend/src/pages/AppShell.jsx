import React from "react"
import { useLocation } from "react-router-dom"
import SideBar from "../components/SideBar"
import ChatArea from "../components/ChatArea"
import Artifact from "../components/Artifact"
import Develop from "./Develop"

function AppShell() {
    const { pathname } = useLocation()
    const onDevelop = pathname.startsWith("/develop")

    return (
        <div className="h-screen flex bg-[#0b0d12] text-white overflow-hidden">
            <SideBar />
            {onDevelop ? <Develop /> : (
                <>
                    <ChatArea />
                    <Artifact />
                </>
            )}
        </div>
    )
}

export default AppShell
