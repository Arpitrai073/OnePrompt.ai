import React, { useEffect, useState } from "react"
import { BookOpen, Code2, Coins, LogOut, Menu, MessageSquare, PanelLeftIcon, PanelRight, Plus, User, X } from "lucide-react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useDispatch, useSelector } from "react-redux"
import { setConversations, setSelectedConversation } from "../redux/conversationSlice"
import { getConversations } from "../features/getConversations"
import logOut from "../features/logOut"
import { setUserdata } from "../redux/userSlice"
import BillingDrawer from "./BillingDrawer"
import Logo, { LogoMark } from "./Logo"
import { accountStatus } from "../features/planDisplay"

function SideBar() {
    const [collapsed, setCollapsed] = useState(false)
    const [imageError, setImageError] = useState(false)
    const [showBilling, setShowBilling] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const { pathname } = useLocation()
    const { conversations, selectedConversation } = useSelector((state) => state.conversation)
    const { userData } = useSelector((state) => state.user)
    const status = accountStatus(userData)
    const onDevelop = pathname.startsWith("/develop")

    useEffect(() => {
        const getConv = async () => {
            const data = await getConversations()
            dispatch(setConversations(data))
        }
        getConv()
    }, [userData?._id, dispatch])

    const openPlayground = (conversation = null) => {
        dispatch(setSelectedConversation(conversation))
        navigate("/app")
        setMobileOpen(false)
    }

    const handleNewChat = () => {
        openPlayground(null)
    }

    const handleLogout = async () => {
        await logOut()
        dispatch(setUserdata(null))
        navigate("/")
    }

    if (collapsed) {
        return (
            <div className="hidden lg:flex flex-col items-center w-[56px] h-screen bg-[#0b0d12] border-r border-white/[0.06] py-4 gap-1 shrink-0">
                <button
                    type="button"
                    onClick={() => setCollapsed(false)}
                    className="mb-2 bg-transparent border-none cursor-pointer p-0"
                    title="Expand sidebar"
                    aria-label="Expand sidebar"
                >
                    <LogoMark size={28} />
                </button>
                <button className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer mb-1"
                    onClick={() => setCollapsed(false)}
                    aria-label="Expand sidebar"
                >
                    <PanelRight />
                </button>

                <button
                    className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer"
                    onClick={handleNewChat}
                    title="New chat"
                >
                    <Plus size={17} />
                </button>
                <button
                    className={`flex items-center justify-center w-9 h-9 rounded-xl transition-colors duration-150 bg-transparent border-none cursor-pointer ${onDevelop ? "text-indigo-400 bg-indigo-500/10" : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.05]"}`}
                    onClick={() => navigate("/develop")}
                    title="Develop"
                >
                    <Code2 size={17} />
                </button>
                <button
                    className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer"
                    onClick={() => navigate("/docs")}
                    title="Docs"
                >
                    <BookOpen size={17} />
                </button>

                <div className="flex-1 overflow-y-auto px-2.5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pt-5">
                    {conversations.map((conv) => {
                        const isActive = !onDevelop && selectedConversation?._id === conv?._id
                        return (
                            <div
                                key={conv?._id}
                                onClick={() => openPlayground(conv)}
                                className={`flex items-center gap-2.5 cursor-pointer mb-0.5 px-3 py-2.5 rounded-[10px] border transition-colors duration-150
                ${isActive ? "bg-indigo-500/10 border-indigo-500/[0.18]"
                                        : "bg-transparent border-transparent"}`}>
                                <div className={`flex items-center justify-center shrink-0 w-[20px] h-[20px] rounded-lg transition-colors duration-150
                ${isActive ? "bg-indigo-500/15 text-indigo-400" : "bg-white/[0.05] text-slate-500"}`}>
                                    <MessageSquare size={13} />
                                </div>
                            </div>
                        )
                    })}
                </div>

                <div className="relative shrink-0">
                    {(userData?.avatar && !imageError) ? (
                        <img
                            className="w-9 h-9 rounded-[10px] object-cover border-2 border-indigo-500/25"
                            src={userData?.avatar}
                            alt={userData?.name || "User"}
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <div className="w-9 h-9 rounded-[10px] bg-white/[0.06] flex items-center justify-center">
                            <User size={15} className="text-slate-400" />
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <>
            <button className="lg:hidden fixed top-3.5 left-4 z-50 flex items-center justify-center w-8 h-8 rounded-lg bg-[#0d0f14] border border-white/[0.06] text-slate-400 hover:text-slate-200 transition-colors duration-150 cursor-pointer" onClick={() => setMobileOpen(true)}>
                <Menu size={14} />
            </button>

            {mobileOpen && <div onClick={() => setMobileOpen(false)} className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />}

            <div className={`fixed lg:static inset-y-0 left-0 z-50
        w-[270px] h-screen shrink-0
        bg-[#0b0d12] border-r border-white/[0.06]
        transition-transform duration-250
        ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
            >
                <div className="flex flex-col h-full">
                    <div className="flex items-center gap-2.5 px-4 py-4 border-b border-white/[0.06]">
                        <div className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer"
                            onClick={() => setCollapsed(true)}
                        >
                            <PanelLeftIcon />
                        </div>

                        <button onClick={() => setMobileOpen(false)}
                            className="lg:hidden flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer"
                        >
                            <X />
                        </button>
                        <div className="flex-1 min-w-0">
                            <Logo to="/app" size={26} />
                        </div>
                        <span className="text-[10px] font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full tracking-wide">{status.badge}</span>
                    </div>

                    <div className="px-4 pt-4 pb-1 flex flex-col gap-2">
                        <button className="w-full flex items-center justify-center gap-2 text-sm font-medium text-white bg-linear-to-br from-indigo-500 to-violet-700 rounded-xl py-[10px] border-none cursor-pointer hover:opacity-90 transition-opacity duration-150"
                            onClick={handleNewChat}
                        >
                            <Plus size={15} />
                            New Chat
                        </button>
                        <button
                            className={`w-full flex items-center justify-center gap-2 text-sm font-medium rounded-xl py-[10px] border cursor-pointer transition-colors duration-150 ${onDevelop ? "text-indigo-300 bg-indigo-500/10 border-indigo-500/20" : "text-slate-300 bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.07]"}`}
                            onClick={() => {
                                navigate("/develop")
                                setMobileOpen(false)
                            }}
                        >
                            <Code2 size={15} />
                            Develop
                        </button>
                        <button
                            className="w-full flex items-center justify-center gap-2 text-sm font-medium rounded-xl py-[10px] border cursor-pointer text-slate-300 bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.07] transition-colors duration-150"
                            onClick={() => navigate("/docs")}
                        >
                            <BookOpen size={15} />
                            Docs
                        </button>
                    </div>

                    {conversations.length === 0
                        ? (
                            <div className="px-5 pt-4 pb-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-slate-600">
                                No Recent Conversations
                            </div>
                        )
                        : (
                            <div className="px-5 pt-4 pb-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-slate-600">
                                Recents
                            </div>
                        )}

                    <div className="flex-1 overflow-y-auto px-2.5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {conversations?.map((conv) => {
                            const isActive = !onDevelop && selectedConversation?._id === conv?._id
                            return (
                                <div
                                    key={conv?._id}
                                    onClick={() => openPlayground(conv)}
                                    className={`flex items-center gap-2.5 cursor-pointer mb-0.5 px-3 py-2.5 rounded-[10px] border transition-colors duration-150
                ${isActive ? "bg-indigo-500/10 border-indigo-500/[0.18]"
                                            : "bg-transparent border-transparent"}`}>
                                    <div className={`flex items-center justify-center shrink-0 w-[28px] h-[28px] rounded-lg transition-colors duration-150
                ${isActive ? "bg-indigo-500/15 text-indigo-400" : "bg-white/[0.05] text-slate-500"}`}>
                                        <MessageSquare size={13} />
                                    </div>
                                    <span className={`text-[13px] font-medium truncate ${isActive ? "text-slate-100" : "text-slate-300"}`}>
                                        {conv?.title || "New Chat"}
                                    </span>
                                </div>
                            )
                        })}
                    </div>

                    <div className="mx-2.5 h-px bg-white/[0.06]" />
                    <div className="px-3.5 py-3.5">
                        {userData ? (
                            <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 hover:bg-white/[0.05] transition-colors duration-150">
                                <div className="relative shrink-0">
                                    {(userData?.avatar && !imageError) ? (
                                        <img
                                            className="w-9 h-9 rounded-[10px] object-cover border-2 border-indigo-500/25"
                                            src={userData?.avatar}
                                            alt={userData?.name || "User"}
                                            onError={() => setImageError(true)}
                                        />
                                    ) : (
                                        <div className="w-9 h-9 rounded-[10px] bg-white/[0.06] flex items-center justify-center">
                                            <User size={15} className="text-slate-400" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13.5px] font-semibold text-slate-100 truncate">{userData?.name || "user"}</p>
                                    <p className="text-[11px] text-slate-500 mt-px">{status.subtitle}</p>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setShowBilling(true)}
                                        className="flex items-center justify-center w-7 h-7 rounded-[7px] border-none bg-transparent text-yellow-600 cursor-pointer hover:bg-white/[0.08] hover:text-slate-400 transition-all duration-150">
                                        <Coins size={16} />
                                    </button>
                                    <button className="flex items-center justify-center w-7 h-7 rounded-[7px] border-none bg-transparent text-slate-600 cursor-pointer hover:bg-white/[0.08] hover:text-slate-400 transition-all duration-150"
                                        onClick={handleLogout}
                                    >
                                        <LogOut size={16} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <Link to="/" className="w-full flex items-center justify-center gap-2 text-sm font-medium text-slate-200 bg-white/[0.05] border border-white/[0.08] rounded-xl py-[11px] hover:bg-white/[0.08] transition-colors duration-150">
                                Login
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            <BillingDrawer
                open={showBilling}
                onClose={() => setShowBilling(false)}
            />
        </>
    )
}

export default SideBar
