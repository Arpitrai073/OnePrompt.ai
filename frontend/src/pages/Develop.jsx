import React, { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { Building2, Check, ChevronDown, Copy, KeyRound, Plus, RefreshCw, Sparkles, Trash2, Activity } from "lucide-react"
import { useDispatch, useSelector } from "react-redux"
import { createApiKey, getByok, getOrg, inviteMember, joinOrg, listApiKeys, listJobs, listUsage, removeMember, revokeApiKey, rotateApiKey, saveByok, updateApiKey, updateOrg } from "../features/apiKeys"
import api from "../../utils/axios"
import getCurrentUser from "../features/getCurrentUser"
import { setUserdata } from "../redux/userSlice"

const PANELS = [
    { id: "keys", label: "API keys", icon: KeyRound },
    { id: "models", label: "Your models", icon: Sparkles },
    { id: "activity", label: "Activity", icon: Activity },
    { id: "workspace", label: "Workspace", icon: Building2 }
]

const fieldClass = "h-10 w-full rounded-xl bg-[#0b0d12] border border-white/[0.08] px-3 text-[13px] text-slate-200 outline-none focus:border-indigo-400/40 placeholder:text-slate-600"
const cardClass = "rounded-2xl border border-white/[0.08] bg-[#11141c]"

function Develop() {
    const dispatch = useDispatch()
    const { userData } = useSelector((state) => state.user)
    const [searchParams, setSearchParams] = useSearchParams()
    const panel = PANELS.some((item) => item.id === searchParams.get("panel")) ? searchParams.get("panel") : "keys"
    const setPanel = (id) => setSearchParams(id === "keys" ? {} : { panel: id }, { replace: true })

    const [keys, setKeys] = useState([])
    const [usage, setUsage] = useState([])
    const [byok, setByok] = useState({ enabled: false, providers: {} })
    const [groqKey, setGroqKey] = useState("")
    const [geminiKey, setGeminiKey] = useState("")
    const [openrouterKey, setOpenrouterKey] = useState("")
    const [loading, setLoading] = useState(false)
    const [creating, setCreating] = useState(false)
    const [savingByok, setSavingByok] = useState(false)
    const [keyName, setKeyName] = useState("Production")
    const [newKey, setNewKey] = useState(null)
    const [copied, setCopied] = useState(false)
    const [copiedInvite, setCopiedInvite] = useState(false)
    const [savedAck, setSavedAck] = useState(false)
    const [error, setError] = useState("")
    const [revokeId, setRevokeId] = useState(null)
    const [edits, setEdits] = useState({})
    const [openSettings, setOpenSettings] = useState({})
    const [org, setOrg] = useState(null)
    const [jobs, setJobs] = useState([])
    const [inviteEmail, setInviteEmail] = useState("")
    const [joinCode, setJoinCode] = useState("")
    const [orgName, setOrgName] = useState("")
    const [allowedDomain, setAllowedDomain] = useState("")

    const refresh = async () => {
        setLoading(true)
        setError("")
        try {
            const [keyRows, usageRows, me, byokStatus, orgData, jobRows] = await Promise.all([
                listApiKeys(),
                listUsage(),
                getCurrentUser(),
                getByok(),
                getOrg(),
                listJobs()
            ])
            setKeys(keyRows || [])
            setUsage(usageRows || [])
            setByok(byokStatus || { enabled: false, providers: {} })
            setOrg(orgData)
            setOrgName(orgData?.name || "")
            setAllowedDomain(orgData?.allowedDomain || "")
            setJobs(jobRows || [])
            if (me) dispatch(setUserdata(me))
        } catch (err) {
            setError(err?.response?.data?.message || "Could not load API settings.")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        refresh()
    }, [])

    const handleCreate = async () => {
        setCreating(true)
        setError("")
        try {
            const created = await createApiKey(keyName.trim() || "Default key")
            setNewKey(created)
            setSavedAck(false)
            setCopied(false)
            await refresh()
        } catch (err) {
            setError(err?.response?.data?.message || "Could not create key.")
        } finally {
            setCreating(false)
        }
    }

    const handleCopy = async () => {
        if (!newKey?.key) return
        await navigator.clipboard.writeText(newKey.key)
        setCopied(true)
    }

    const handleRevoke = async (id) => {
        setRevokeId(id)
        setError("")
        try {
            await revokeApiKey(id)
            await refresh()
        } catch (err) {
            setError(err?.response?.data?.message || "Could not revoke key.")
        } finally {
            setRevokeId(null)
        }
    }

    const handleRotate = async (id) => {
        if (!window.confirm("Rotate this key? The old secret stops working immediately.")) return
        setRevokeId(id)
        try {
            const rotated = await rotateApiKey(id)
            setNewKey(rotated)
            setSavedAck(false)
            setCopied(false)
            await refresh()
        } catch (err) {
            setError(err?.response?.data?.message || "Could not rotate key.")
        } finally {
            setRevokeId(null)
        }
    }

    const handleSaveKeySettings = async (id) => {
        const edit = edits[id] || {}
        try {
            await updateApiKey(id, {
                dailyCreditCap: edit.dailyCreditCap === "" ? null : edit.dailyCreditCap,
                webhookUrl: edit.webhookUrl,
                ipAllowlist: edit.ipAllowlist
            })
            setEdits((prev) => ({ ...prev, [id]: undefined }))
            setOpenSettings((prev) => ({ ...prev, [id]: false }))
            await refresh()
        } catch (err) {
            setError(err?.response?.data?.message || "Could not update key.")
        }
    }

    const handleSaveByok = async (enabled = byok.enabled) => {
        setSavingByok(true)
        setError("")
        try {
            const nextKeys = {}
            if (groqKey.trim()) nextKeys.groq = groqKey.trim()
            if (geminiKey.trim()) nextKeys.gemini = geminiKey.trim()
            if (openrouterKey.trim()) nextKeys.openrouter = openrouterKey.trim()
            const next = await saveByok({ enabled, keys: nextKeys })
            setByok(next)
            setGroqKey("")
            setGeminiKey("")
            setOpenrouterKey("")
            const me = await getCurrentUser()
            if (me) dispatch(setUserdata(me))
        } catch (err) {
            setError(err?.response?.data?.message || "Could not save BYOK settings.")
        } finally {
            setSavingByok(false)
        }
    }

    return (
        <div className="flex-1 min-w-0 h-screen overflow-y-auto bg-[#0b0d12] text-white">
            <div className="max-w-5xl mx-auto px-5 md:px-8 py-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-[26px] font-semibold tracking-tight text-white">Develop</h1>
                        <p className="text-[13px] text-slate-500 mt-1">Keys and billing live here. How to call the API is in Docs.</p>
                    </div>
                    <Link to="/docs?tab=quickstart" className="h-10 px-4 rounded-xl border border-white/[0.1] text-[13px] text-slate-200 inline-flex items-center hover:bg-white/[0.04]">
                        Open API docs
                    </Link>
                </div>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className={`${cardClass} px-4 py-4`}>
                        <p className="text-[11px] text-slate-500">Playground credits</p>
                        <p className="text-[22px] font-semibold mt-1">{userData?.credits ?? 0}</p>
                    </div>
                    <div className={`${cardClass} px-4 py-4`}>
                        <p className="text-[11px] text-slate-500">API credits</p>
                        <p className="text-[22px] font-semibold mt-1">{userData?.apiCredits ?? userData?.credits ?? 0}</p>
                    </div>
                    <div className={`${cardClass} px-4 py-4`}>
                        <p className="text-[11px] text-slate-500">Billing</p>
                        <p className="text-[22px] font-semibold mt-1">{byok.enabled ? "Your keys" : "Platform"}</p>
                    </div>
                </div>

                <div className="mt-6 flex gap-1 overflow-x-auto border-b border-white/[0.06] pb-px">
                    {PANELS.map((item) => {
                        const Icon = item.icon
                        const active = panel === item.id
                        return (
                            <button
                                key={item.id}
                                onClick={() => setPanel(item.id)}
                                className={`h-11 px-3.5 inline-flex items-center gap-2 text-[13px] whitespace-nowrap border-b-2 ${active ? "border-indigo-400 text-white" : "border-transparent text-slate-500 hover:text-slate-200"}`}
                            >
                                <Icon size={14} />
                                {item.label}
                            </button>
                        )
                    })}
                </div>

                {error && (
                    <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-300">
                        {error}
                    </div>
                )}

                <div className="mt-6 pb-16">
                    {panel === "keys" && (
                        <section className={`${cardClass} p-5 md:p-6`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-[16px] font-semibold">API keys</h2>
                                    <p className="text-[13px] text-slate-500 mt-1">Prepaid only. A leaked key spends your credits. Revoke is instant.</p>
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        value={keyName}
                                        onChange={(e) => setKeyName(e.target.value)}
                                        placeholder="Key name"
                                        className={`${fieldClass} w-[160px]`}
                                    />
                                    <button
                                        disabled={creating}
                                        onClick={handleCreate}
                                        className="h-10 inline-flex items-center gap-2 rounded-xl bg-white text-black px-4 text-[13px] font-medium disabled:opacity-50"
                                    >
                                        <Plus size={14} />
                                        {creating ? "Creating..." : "Create key"}
                                    </button>
                                </div>
                            </div>

                            <div className="mt-5 space-y-3">
                                {loading && keys.length === 0 && <p className="text-[13px] text-slate-500 py-8 text-center">Loading keys…</p>}
                                {!loading && keys.length === 0 && (
                                    <div className="rounded-xl border border-dashed border-white/[0.1] py-12 px-6 text-center">
                                        <div className="w-10 h-10 mx-auto rounded-xl bg-indigo-500/15 text-indigo-300 flex items-center justify-center">
                                            <KeyRound size={18} />
                                        </div>
                                        <p className="mt-3 text-[14px] text-slate-200">No keys yet</p>
                                        <p className="mt-1 text-[13px] text-slate-500">Create one, then follow the <Link to="/docs?tab=quickstart" className="text-indigo-300">quickstart</Link>.</p>
                                    </div>
                                )}
                                {keys.map((key) => {
                                    const edit = edits[key.id] || {
                                        dailyCreditCap: key.dailyCreditCap ?? "",
                                        webhookUrl: key.webhookUrl || "",
                                        ipAllowlist: (key.ipAllowlist || []).join(", ")
                                    }
                                    const open = !!openSettings[key.id]
                                    return (
                                        <div key={key.id} className="rounded-xl border border-white/[0.07] bg-[#0b0d12] p-4">
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-300 flex items-center justify-center shrink-0">
                                                    <KeyRound size={15} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[14px] text-slate-100 font-medium">{key.name}</p>
                                                    <p className="text-[12px] text-slate-500 font-mono mt-0.5">{key.prefix}••••</p>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        onClick={() => setOpenSettings((prev) => ({ ...prev, [key.id]: !open }))}
                                                        className="h-8 px-3 rounded-lg text-[12px] text-slate-300 bg-white/[0.05] inline-flex items-center gap-1"
                                                    >
                                                        Settings
                                                        <ChevronDown size={12} className={open ? "rotate-180" : ""} />
                                                    </button>
                                                    <button
                                                        disabled={revokeId === key.id}
                                                        onClick={() => handleRotate(key.id)}
                                                        className="h-8 px-3 rounded-lg text-[12px] text-slate-300 bg-white/[0.05] inline-flex items-center gap-1"
                                                    >
                                                        <RefreshCw size={12} />
                                                        Rotate
                                                    </button>
                                                    <button
                                                        disabled={revokeId === key.id}
                                                        onClick={() => {
                                                            if (window.confirm("Revoke this key now? Requests using it will fail immediately.")) {
                                                                handleRevoke(key.id)
                                                            }
                                                        }}
                                                        className="h-8 px-3 rounded-lg text-[12px] text-red-300 bg-red-500/10 inline-flex items-center gap-1 disabled:opacity-50"
                                                    >
                                                        <Trash2 size={12} />
                                                        Revoke
                                                    </button>
                                                </div>
                                            </div>
                                            {open && (
                                                <div className="mt-4 pt-4 border-t border-white/[0.06] grid sm:grid-cols-2 gap-3">
                                                    <label className="block">
                                                        <span className="text-[12px] text-slate-500">Daily credit cap</span>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            placeholder="No cap"
                                                            value={edit.dailyCreditCap}
                                                            onChange={(e) => setEdits((prev) => ({ ...prev, [key.id]: { ...edit, dailyCreditCap: e.target.value } }))}
                                                            className={`${fieldClass} mt-1`}
                                                        />
                                                    </label>
                                                    <label className="block">
                                                        <span className="text-[12px] text-slate-500">Webhook URL</span>
                                                        <input
                                                            type="url"
                                                            placeholder="https://…"
                                                            value={edit.webhookUrl}
                                                            onChange={(e) => setEdits((prev) => ({ ...prev, [key.id]: { ...edit, webhookUrl: e.target.value } }))}
                                                            className={`${fieldClass} mt-1`}
                                                        />
                                                    </label>
                                                    <label className="block sm:col-span-2">
                                                        <span className="text-[12px] text-slate-500">IP allowlist</span>
                                                        <input
                                                            placeholder="Comma-separated IPs"
                                                            value={edit.ipAllowlist}
                                                            onChange={(e) => setEdits((prev) => ({ ...prev, [key.id]: { ...edit, ipAllowlist: e.target.value } }))}
                                                            className={`${fieldClass} mt-1`}
                                                        />
                                                    </label>
                                                    <button
                                                        onClick={() => handleSaveKeySettings(key.id)}
                                                        className="h-10 px-4 rounded-xl text-[13px] font-medium text-white bg-indigo-500/80 hover:bg-indigo-500 sm:col-span-2"
                                                    >
                                                        Save settings
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </section>
                    )}

                    {panel === "models" && (
                        <section className={`${cardClass} p-5 md:p-6`}>
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-[16px] font-semibold">Your models</h2>
                                    <p className="text-[13px] text-slate-500 mt-1 max-w-xl">Encrypted at rest. If this is on, a missing or rejected provider key fails the request — we do not fall back to OnePrompt keys.</p>
                                </div>
                                <button
                                    disabled={savingByok}
                                    onClick={() => handleSaveByok(!byok.enabled)}
                                    className={`h-10 px-4 rounded-xl text-[13px] font-medium ${byok.enabled ? "bg-amber-500/20 text-amber-100 border border-amber-400/20" : "bg-white/[0.06] text-slate-200"}`}
                                >
                                    {byok.enabled ? "Using my keys" : "Use OnePrompt models"}
                                </button>
                            </div>
                            <div className="mt-6 grid gap-4">
                                {[
                                    ["groq", "Groq", groqKey, setGroqKey],
                                    ["gemini", "Gemini", geminiKey, setGeminiKey],
                                    ["openrouter", "OpenRouter", openrouterKey, setOpenrouterKey]
                                ].map(([id, label, value, setter]) => (
                                    <label key={id} className="block">
                                        <span className="text-[12px] text-slate-400">
                                            {label}
                                            <span className="text-slate-600"> · {byok.providers?.[id]?.last4 ? `saved ••••${byok.providers[id].last4}` : "not saved"}</span>
                                        </span>
                                        <input
                                            type="password"
                                            autoComplete="new-password"
                                            value={value}
                                            onChange={(e) => setter(e.target.value)}
                                            placeholder={`Paste ${label} key to replace`}
                                            className={`${fieldClass} mt-1.5`}
                                        />
                                    </label>
                                ))}
                            </div>
                            <button
                                disabled={savingByok}
                                onClick={() => handleSaveByok(byok.enabled)}
                                className="mt-5 h-10 px-4 rounded-xl bg-white text-black text-[13px] font-medium disabled:opacity-40"
                            >
                                {savingByok ? "Saving..." : "Save provider keys"}
                            </button>
                        </section>
                    )}

                    {panel === "activity" && (
                        <div className="space-y-4">
                            <section className={`${cardClass} p-5 md:p-6`}>
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <h2 className="text-[16px] font-semibold">Recent usage</h2>
                                        <p className="text-[13px] text-slate-500 mt-1">API calls billed to this account.</p>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            const { data } = await api.get("/api/auth/audit", { params: { format: "csv" }, responseType: "blob" })
                                            const url = URL.createObjectURL(data)
                                            const a = document.createElement("a")
                                            a.href = url
                                            a.download = "oneprompt-audit.csv"
                                            a.click()
                                            URL.revokeObjectURL(url)
                                        }}
                                        className="h-9 px-3 rounded-lg text-[12px] text-slate-200 bg-white/[0.06]"
                                    >
                                        Export CSV
                                    </button>
                                </div>
                                {usage.length === 0 ? (
                                    <p className="text-[13px] text-slate-500 mt-8 text-center py-6">No usage yet. Run POST /v1/run from your backend.</p>
                                ) : (
                                    <div className="mt-4 overflow-x-auto">
                                        <table className="w-full text-left text-[12px]">
                                            <thead className="text-slate-500">
                                                <tr>
                                                    <th className="py-2 font-medium">requestId</th>
                                                    <th className="py-2 font-medium">agent</th>
                                                    <th className="py-2 font-medium">mode</th>
                                                    <th className="py-2 font-medium">status</th>
                                                    <th className="py-2 font-medium">credits</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {usage.map((row) => (
                                                    <tr key={row.requestId} className="border-t border-white/[0.06] text-slate-300">
                                                        <td className="py-2.5 font-mono text-[11px]">{row.requestId}</td>
                                                        <td className="py-2.5">{row.agent || "-"}</td>
                                                        <td className="py-2.5">{row.billingMode || "platform"}</td>
                                                        <td className="py-2.5">{row.status}</td>
                                                        <td className="py-2.5">{row.creditsUsed ?? 0}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </section>
                            <section className={`${cardClass} p-5 md:p-6`}>
                                <h2 className="text-[16px] font-semibold">Async jobs</h2>
                                {jobs.length === 0 ? (
                                    <p className="text-[13px] text-slate-500 mt-4">None yet. POST /v1/run with {`"async": true`}.</p>
                                ) : (
                                    <div className="mt-4 overflow-x-auto">
                                        <table className="w-full text-left text-[12px]">
                                            <thead className="text-slate-500">
                                                <tr>
                                                    <th className="py-2 font-medium">jobId</th>
                                                    <th className="py-2 font-medium">status</th>
                                                    <th className="py-2 font-medium">agent</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {jobs.map((job) => (
                                                    <tr key={job.jobId} className="border-t border-white/[0.06] text-slate-300">
                                                        <td className="py-2.5 font-mono text-[11px]">{job.jobId}</td>
                                                        <td className="py-2.5">{job.status}</td>
                                                        <td className="py-2.5">{job.agent || "-"}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </section>
                        </div>
                    )}

                    {panel === "workspace" && (
                        <section className={`${cardClass} p-5 md:p-6`}>
                            <h2 className="text-[16px] font-semibold">Workspace</h2>
                            <p className="text-[13px] text-slate-500 mt-1">One billing account, many keys. Members on your allowed email domain can join. API spend hits the owner’s API wallet.</p>
                            <div className="mt-5 grid sm:grid-cols-2 gap-3">
                                <label className="block">
                                    <span className="text-[12px] text-slate-500">Workspace name</span>
                                    <input value={orgName} onChange={(e) => setOrgName(e.target.value)} className={`${fieldClass} mt-1`} />
                                </label>
                                <label className="block">
                                    <span className="text-[12px] text-slate-500">Allowed email domain</span>
                                    <input value={allowedDomain} onChange={(e) => setAllowedDomain(e.target.value)} placeholder="company.com" className={`${fieldClass} mt-1`} />
                                </label>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <button onClick={async () => { try { const next = await updateOrg({ name: orgName, allowedDomain }); setOrg(next) } catch (err) { setError(err?.response?.data?.message || "Could not update workspace.") } }} className="h-9 px-3 rounded-lg text-[12px] bg-white text-black font-medium">Save workspace</button>
                                <button
                                    onClick={async () => {
                                        if (!org?.inviteCode) return
                                        await navigator.clipboard.writeText(org.inviteCode)
                                        setCopiedInvite(true)
                                        setTimeout(() => setCopiedInvite(false), 1500)
                                    }}
                                    className="h-9 px-3 rounded-lg text-[12px] text-slate-300 bg-white/[0.06] inline-flex items-center gap-1.5 font-mono"
                                >
                                    {copiedInvite ? <Check size={12} /> : <Copy size={12} />}
                                    {org?.inviteCode || "No invite code"}
                                </button>
                            </div>
                            <div className="mt-6 grid sm:grid-cols-2 gap-3">
                                <div>
                                    <p className="text-[12px] text-slate-500 mb-1.5">Invite a member</p>
                                    <div className="flex gap-2">
                                        <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="name@company.com" className={fieldClass} />
                                        <button onClick={async () => { try { await inviteMember(inviteEmail); setInviteEmail(""); await refresh() } catch (err) { setError(err?.response?.data?.message || "Invite failed.") } }} className="h-10 px-3 rounded-xl text-[12px] text-white bg-indigo-500/80">Invite</button>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[12px] text-slate-500 mb-1.5">Join with a code</p>
                                    <div className="flex gap-2">
                                        <input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="Invite code" className={fieldClass} />
                                        <button onClick={async () => { try { await joinOrg(joinCode); setJoinCode(""); await refresh() } catch (err) { setError(err?.response?.data?.message || "Join failed.") } }} className="h-10 px-3 rounded-xl text-[12px] bg-white/[0.06] text-slate-200">Join</button>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-6">
                                <p className="text-[12px] text-slate-500 mb-2">Members</p>
                                <div className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.07]">
                                    {(org?.members || []).length === 0 && <p className="px-4 py-6 text-[13px] text-slate-500 text-center">No members yet.</p>}
                                    {(org?.members || []).map((m) => (
                                        <div key={m.id} className="flex items-center justify-between px-4 py-3 text-[13px] text-slate-300">
                                            <div>
                                                <p>{m.email}</p>
                                                <p className="text-[11px] text-slate-500 mt-0.5">{m.role} · {m.status}</p>
                                            </div>
                                            {org?.role === "owner" && m.role !== "owner" && (
                                                <button onClick={async () => { await removeMember(m.id); await refresh() }} className="text-red-300 text-[12px]">Remove</button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    )}
                </div>
            </div>

            {newKey?.key && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur">
                    <div className="w-[420px] max-w-[92vw] rounded-2xl border border-white/[0.08] bg-[#13151c] p-6">
                        <h3 className="text-[16px] font-semibold text-slate-100">Copy this key now</h3>
                        <p className="text-[13px] text-slate-500 mt-1">You will not see the full key again. Store it on your server.</p>
                        <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/[0.08] bg-black/40 px-3 py-3">
                            <code className="flex-1 text-[12px] text-slate-200 break-all">{newKey.key}</code>
                            <button onClick={handleCopy} className="text-indigo-300 hover:text-white">
                                {copied ? <Check size={16} /> : <Copy size={16} />}
                            </button>
                        </div>
                        <label className="mt-4 flex items-center gap-2 text-[13px] text-slate-400">
                            <input type="checkbox" checked={savedAck} onChange={(e) => setSavedAck(e.target.checked)} />
                            I saved this key
                        </label>
                        <button
                            disabled={!savedAck}
                            onClick={() => setNewKey(null)}
                            className="mt-4 w-full h-10 rounded-xl bg-white text-black text-[13px] font-medium disabled:opacity-40"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Develop
