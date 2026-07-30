import React, { useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { useSelector } from "react-redux"
import { ArrowLeft, ArrowRight, BookOpen, Check, Copy, CreditCard, FileText, KeyRound, Layers, Library, Server, TriangleAlert, Zap } from "lucide-react"
import SiteHeader from "../components/SiteHeader"
import CodeBlock from "../components/CodeBlock"
import { getLiveApiBase, getPublicApiBase, isLocalHost } from "../features/publicApiBase"

const TABS = [
    { id: "quickstart", label: "Quickstart", hint: "First request in 3 steps", icon: Zap },
    { id: "auth", label: "Auth", hint: "Bearer keys", icon: KeyRound },
    { id: "run", label: "POST /v1/run", hint: "The only write path", icon: Server },
    { id: "agents", label: "Agents", hint: "What to send", icon: Layers },
    { id: "knowledge", label: "Knowledge", hint: "Upload once, ask later", icon: Library },
    { id: "async", label: "Async jobs", hint: "202 + poll", icon: BookOpen },
    { id: "files", label: "Files", hint: "Refresh downloads", icon: FileText },
    { id: "errors", label: "Errors", hint: "What failed", icon: TriangleAlert },
    { id: "pricing", label: "Pricing", hint: "Credits", icon: CreditCard }
]

function CopyChip({ value }) {
    const [copied, setCopied] = useState(false)
    return (
        <button
            type="button"
            onClick={async () => {
                await navigator.clipboard.writeText(value)
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-white/[0.04] border border-white/[0.08] px-2.5 py-1.5 text-[12px] font-mono text-slate-200 hover:border-white/[0.16]"
        >
            {value}
            {copied ? <Check size={12} className="text-emerald-300" /> : <Copy size={12} className="text-slate-500" />}
        </button>
    )
}

function Docs() {
    const { userData } = useSelector((state) => state.user)
    const [searchParams, setSearchParams] = useSearchParams()
    const requested = searchParams.get("tab")
    const tabIndex = Math.max(0, TABS.findIndex((item) => item.id === requested))
    const tab = TABS[requested && TABS.some((item) => item.id === requested) ? tabIndex : 0].id
    const setTab = (id) => setSearchParams(id === "quickstart" ? {} : { tab: id }, { replace: true })
    const current = TABS.find((item) => item.id === tab)
    const prev = TABS[TABS.findIndex((item) => item.id === tab) - 1]
    const next = TABS[TABS.findIndex((item) => item.id === tab) + 1]
    const baseUrl = useMemo(() => getPublicApiBase(), [])
    const localPreview = isLocalHost()
    const liveUrl = getLiveApiBase()

    return (
        <div className="min-h-screen bg-[#0b0d12] text-white">
            <SiteHeader />
            <div className="max-w-6xl mx-auto px-5 py-8 md:py-10 grid md:grid-cols-[240px_1fr] gap-8 lg:gap-12">
                <aside className="md:sticky md:top-24 h-fit">
                    <p className="text-[11px] font-medium uppercase tracking-widest text-slate-500 mb-3 px-3">API reference</p>
                    <nav className="flex md:flex-col gap-1 overflow-x-auto pb-2 [scrollbar-width:none]">
                        {TABS.map((item) => {
                            const Icon = item.icon
                            const active = tab === item.id
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setTab(item.id)}
                                    className={`text-left px-3 py-2.5 rounded-xl whitespace-nowrap md:whitespace-normal ${active ? "bg-white/[0.06] text-white" : "text-slate-400 hover:text-slate-100 hover:bg-white/[0.03]"}`}
                                >
                                    <span className="flex items-center gap-2.5">
                                        <Icon size={15} className={active ? "text-indigo-300" : "text-slate-500"} />
                                        <span className="text-[13px] font-medium">{item.label}</span>
                                    </span>
                                    <span className="hidden md:block text-[11px] text-slate-500 mt-0.5 pl-[25px]">{item.hint}</span>
                                </button>
                            )
                        })}
                    </nav>
                    <Link
                        to={userData ? "/develop" : "/"}
                        className="hidden md:flex mt-5 mx-3 h-10 items-center justify-center rounded-xl bg-white text-black text-[13px] font-medium"
                    >
                        {userData ? "Create a key" : "Sign in to get a key"}
                    </Link>
                </aside>

                <article className="min-w-0 max-w-3xl pb-16">
                    <div className="rounded-2xl border border-white/[0.08] bg-[#11141c] px-4 py-3.5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-[11px] uppercase tracking-widest text-slate-500">
                                    {localPreview ? "Base URL on this machine" : "Base URL"}
                                </p>
                                <p className="text-[13px] font-mono text-slate-200 mt-1 break-all">{baseUrl}</p>
                            </div>
                            <CopyChip value={baseUrl} />
                        </div>
                        <p className="mt-3 text-[12px] text-slate-500 leading-relaxed">
                            {localPreview
                                ? `Snippets below hit your local gateway so curl works here. On the live site they become ${liveUrl} — customers never copy localhost.`
                                : "This is this site’s origin. Customer apps call the same host they opened docs on. No key is shown here."}
                        </p>
                    </div>

                    <div className="mt-8">
                        <p className="text-[12px] text-indigo-300 font-medium">{current?.hint}</p>
                        {tab === "quickstart" && (
                            <section>
                                <h1 className="mt-2 text-[32px] font-semibold tracking-tight">Get a response in three steps</h1>
                                <p className="mt-3 text-[15px] text-slate-400 leading-relaxed">Call OnePrompt from your server. The website chat uses a cookie. The API uses a Bearer key. Do not put the key in a browser.</p>
                                <div className="mt-8 space-y-4">
                                    {[
                                        ["1", "Create a key", <>Sign in, open <Link to="/develop" className="text-indigo-300">Develop</Link>, then Create key. Copy <code className="font-mono text-[13px] text-slate-200">sk_live_</code> once.</>],
                                        ["2", "Store it on the server", <>Set <code className="font-mono text-[13px] text-slate-200">ONEPROMPT_API_KEY</code> in your backend env. Never commit it.</>],
                                        ["3", "Send one request", "JSON is enough for chat. Use multipart when you attach a PDF or image."]
                                    ].map(([n, title, body]) => (
                                        <div key={n} className="flex gap-4 rounded-2xl border border-white/[0.07] bg-[#11141c] p-4">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-200 text-[13px] font-semibold flex items-center justify-center shrink-0">{n}</div>
                                            <div>
                                                <h2 className="text-[15px] font-medium">{title}</h2>
                                                <p className="mt-1 text-[13px] text-slate-400 leading-relaxed">{body}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-6">
                                    <CodeBlock
                                        label="curl"
                                        code={`curl -X POST ${baseUrl}/v1/run \\
  -H "Authorization: Bearer $ONEPROMPT_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt":"Say hello in one sentence","agent":"chat"}'`}
                                    />
                                </div>
                            </section>
                        )}

                        {tab === "auth" && (
                            <section>
                                <h1 className="mt-2 text-[32px] font-semibold tracking-tight">Authentication</h1>
                                <p className="mt-3 text-[15px] text-slate-400 leading-relaxed">Every API request sends the key. Playground chat never uses this header.</p>
                                <div className="mt-6">
                                    <CodeBlock label="Header" code={`Authorization: Bearer sk_live_...`} />
                                </div>
                                <div className="mt-6 grid gap-3">
                                    {[
                                        ["Revoke and rotate", "Old secrets fail on the next request. Do this if a key leaked."],
                                        ["IP allowlist", "Optional. Callers outside the list get 403."],
                                        ["CORS", "Locked to this site. Customer apps call from a server, so CORS does not apply."]
                                    ].map(([title, copy]) => (
                                        <div key={title} className="rounded-xl border border-white/[0.07] bg-[#11141c] px-4 py-3">
                                            <h2 className="text-[14px] font-medium">{title}</h2>
                                            <p className="mt-1 text-[13px] text-slate-400">{copy}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {tab === "run" && (
                            <section>
                                <h1 className="mt-2 text-[32px] font-semibold tracking-tight">POST /v1/run</h1>
                                <p className="mt-3 text-[15px] text-slate-400 leading-relaxed">JSON or multipart. Same engine as the playground. Add <span className="font-mono text-slate-300">Idempotency-Key</span> if retries should not double-charge.</p>
                                <div className="mt-6">
                                    <CodeBlock
                                        label="Body"
                                        code={`{
  "prompt": "Generate a 1-page sale deed",
  "agent": "pdf"
}`}
                                    />
                                </div>
                                <p className="mt-5 text-[13px] text-slate-500">Success fields: <code className="text-slate-300">ok</code>, <code className="text-slate-300">agentUsed</code>, <code className="text-slate-300">answer</code>, <code className="text-slate-300">files</code>, <code className="text-slate-300">creditsUsed</code>, <code className="text-slate-300">billingMode</code>, <code className="text-slate-300">requestId</code>.</p>
                                <div className="mt-4">
                                    <CodeBlock
                                        label="Node"
                                        code={`const res = await fetch("${baseUrl}/v1/run", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.ONEPROMPT_API_KEY}\`,
    "Content-Type": "application/json",
    "Idempotency-Key": "sale-deed-001"
  },
  body: JSON.stringify({ prompt: "Generate a 1-page sale deed", agent: "pdf" })
});`}
                                    />
                                </div>
                            </section>
                        )}

                        {tab === "agents" && (
                            <section>
                                <h1 className="mt-2 text-[32px] font-semibold tracking-tight">Agents</h1>
                                <p className="mt-3 text-[15px] text-slate-400 leading-relaxed">Send <code className="font-mono text-slate-200">agent</code> yourself, or <code className="font-mono text-slate-200">auto</code> and let the router pick from the prompt and file type.</p>
                                <div className="mt-6 grid sm:grid-cols-2 gap-3">
                                    {[
                                        ["chat", "General answers"],
                                        ["pdf", "Generate a PDF"],
                                        ["vision", "Generate an image"],
                                        ["search", "Web search then answer"],
                                        ["coding", "Code or a small project"],
                                        ["ppt", "Generate slides"],
                                        ["auto + PDF file", "One-shot document Q&A (attach the file)"],
                                        ["kb", "Workspace knowledge base (no file)"],
                                        ["auto + image file", "Image analysis"]
                                    ].map(([agent, use]) => (
                                        <div key={agent} className="rounded-xl border border-white/[0.07] bg-[#11141c] px-4 py-3.5">
                                            <code className="text-[12px] text-indigo-200">{agent}</code>
                                            <p className="mt-1 text-[13px] text-slate-400">{use}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {tab === "knowledge" && (
                            <section>
                                <h1 className="mt-2 text-[32px] font-semibold tracking-tight">Workspace knowledge</h1>
                                <p className="mt-3 text-[15px] text-slate-400 leading-relaxed">Named knowledge bases per workspace. Upload PDF, DOCX, TXT, or images once (async by default). Scanned PDFs with little extractable text fall back to Gemini OCR. Ask later with JSON only.</p>
                                <div className="mt-8 space-y-4">
                                    {[
                                        ["1", "Create KB", "POST /v1/knowledge-bases with name and optional slug. Default KB is created automatically."],
                                        ["2", "Upload", "POST /v1/documents multipart file + kbSlug. Returns 202 with jobId. Poll job or document until ready. Use ?sync=true for small local uploads."],
                                        ["3", "Ask", "POST /v1/run with agent kb, prompt, and kbSlug. Do not send a file."],
                                        ["4", "Quotas", "Org limits apply (free 50 docs / 200 MB; api_starter 200 / 1 GB; api_pro 1000 / 5 GB). Quota is returned on list endpoints."],
                                        ["5", "ACL", "Each document has acl.mode: org (everyone), roles (e.g. owner+admin), or users (explicit ids). Owners always see all. Search only uses docs you can read. POST /v1/documents/:id/acl to change."]
                                    ].map(([n, title, body]) => (
                                        <div key={n} className="flex gap-4 rounded-2xl border border-white/[0.07] bg-[#11141c] p-4">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-200 text-[13px] font-semibold flex items-center justify-center shrink-0">{n}</div>
                                            <div>
                                                <h2 className="text-[15px] font-medium">{title}</h2>
                                                <p className="mt-1 text-[13px] text-slate-400 leading-relaxed">{body}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-6">
                                    <CodeBlock
                                        label="Create KB"
                                        code={`curl -X POST ${baseUrl}/v1/knowledge-bases \\
  -H "Authorization: Bearer $ONEPROMPT_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Handbook","slug":"handbook"}'`}
                                    />
                                </div>
                                <div className="mt-4">
                                    <CodeBlock
                                        label="Upload"
                                        code={`curl -X POST ${baseUrl}/v1/documents \\
  -H "Authorization: Bearer $ONEPROMPT_API_KEY" \\
  -F "file=@handbook.pdf" \\
  -F "kbSlug=handbook"`}
                                    />
                                </div>
                                <div className="mt-4">
                                    <CodeBlock
                                        label="Ask"
                                        code={`curl -X POST ${baseUrl}/v1/run \\
  -H "Authorization: Bearer $ONEPROMPT_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt":"What is the refund window?","agent":"kb","kbSlug":"handbook"}'`}
                                    />
                                </div>
                                <div className="mt-4">
                                    <CodeBlock
                                        label="Set ACL (owners & admins only)"
                                        code={`curl -X POST ${baseUrl}/v1/documents/DOC_ID/acl \\
  -H "Authorization: Bearer $ONEPROMPT_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"mode":"roles","roles":["owner","admin"]}'`}
                                    />
                                </div>
                                <p className="mt-4 text-[13px] text-slate-500">List with GET /v1/documents?kbSlug=handbook (filtered to docs you can read). Remove with DELETE /v1/documents/:docId. Empty / no-access returns 409 knowledge_base_empty. Auto chat never searches this corpus.</p>
                            </section>
                        )}

                        {tab === "async" && (
                            <section>
                                <h1 className="mt-2 text-[32px] font-semibold tracking-tight">Async jobs</h1>
                                <p className="mt-3 text-[15px] text-slate-400 leading-relaxed">For long PDF or RAG work, send <code className="font-mono text-slate-200">async: true</code>. You get HTTP 202 and a <code className="font-mono text-slate-200">jobId</code>. Poll until succeeded.</p>
                                <div className="mt-6">
                                    <CodeBlock
                                        label="curl"
                                        code={`curl -X POST ${baseUrl}/v1/run \\
  -H "Authorization: Bearer $ONEPROMPT_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt":"Generate a contract PDF","agent":"pdf","async":true}'

curl ${baseUrl}/v1/jobs/job_... \\
  -H "Authorization: Bearer $ONEPROMPT_API_KEY"`}
                                    />
                                </div>
                                <p className="mt-4 text-[13px] text-slate-500">Set a webhook URL on the key if you want us to POST the result and retry when your server is down.</p>
                            </section>
                        )}

                        {tab === "files" && (
                            <section>
                                <h1 className="mt-2 text-[32px] font-semibold tracking-tight">Files</h1>
                                <p className="mt-3 text-[15px] text-slate-400 leading-relaxed">Download links are short-lived S3 URLs. Copy the file to your bucket, or mint a new link with the request id.</p>
                                <div className="mt-6">
                                    <CodeBlock
                                        label="HTTP"
                                        code={`GET ${baseUrl}/v1/files/{requestId}
Authorization: Bearer $ONEPROMPT_API_KEY`}
                                    />
                                </div>
                            </section>
                        )}

                        {tab === "errors" && (
                            <section>
                                <h1 className="mt-2 text-[32px] font-semibold tracking-tight">Errors</h1>
                                <p className="mt-3 text-[15px] text-slate-400">Fix the status, then retry. 402 means buy credits or turn on BYOK.</p>
                                <div className="mt-6 space-y-2">
                                    {[
                                        ["401", "Missing, invalid, or revoked key"],
                                        ["402", "Not enough API credits"],
                                        ["403", "IP not on the key allowlist"],
                                        ["429", "Rate limit or daily cap"],
                                        ["409", "Knowledge base is empty — upload a PDF first"],
                                        ["400", "Bad request, or missing BYOK provider key"],
                                        ["502", "BYOK provider rejected the key"]
                                    ].map(([code, meaning]) => (
                                        <div key={code} className="flex items-center gap-4 rounded-xl border border-white/[0.07] bg-[#11141c] px-4 py-3">
                                            <span className="w-12 h-8 rounded-lg bg-white/[0.04] text-indigo-200 text-[13px] font-mono flex items-center justify-center">{code}</span>
                                            <span className="text-[13px] text-slate-400">{meaning}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {tab === "pricing" && (
                            <section>
                                <h1 className="mt-2 text-[32px] font-semibold tracking-tight">Pricing</h1>
                                <p className="mt-3 text-[15px] text-slate-400 leading-relaxed">Playground and API are separate wallets. Chat on the website does not spend API credits.</p>
                                <div className="mt-6 grid sm:grid-cols-2 gap-4">
                                    <div className="rounded-2xl border border-white/[0.08] bg-[#11141c] p-5">
                                        <h2 className="text-[15px] font-medium">Platform</h2>
                                        <p className="text-[12px] text-slate-500 mt-1">We run the models</p>
                                        <ul className="mt-4 space-y-3 text-[13px] text-slate-300">
                                            <li className="flex justify-between"><span>chat</span><span className="text-slate-100 font-medium">1</span></li>
                                            <li className="flex justify-between"><span>search</span><span className="text-slate-100 font-medium">5</span></li>
                                            <li className="flex justify-between"><span>pdf / ppt / vision / coding / kb</span><span className="text-slate-100 font-medium">10</span></li>
                                        </ul>
                                    </div>
                                    <div className="rounded-2xl border border-white/[0.08] bg-[#11141c] p-5">
                                        <h2 className="text-[15px] font-medium">BYOK fee</h2>
                                        <p className="text-[12px] text-slate-500 mt-1">Token $ is on your Groq / Gemini bill</p>
                                        <ul className="mt-4 space-y-3 text-[13px] text-slate-300">
                                            <li className="flex justify-between"><span>most agents</span><span className="text-slate-100 font-medium">1</span></li>
                                            <li className="flex justify-between"><span>pdf / vision / RAG</span><span className="text-slate-100 font-medium">2</span></li>
                                        </ul>
                                    </div>
                                </div>
                            </section>
                        )}
                    </div>

                    <div className="mt-12 flex items-center justify-between gap-3">
                        {prev ? (
                            <button onClick={() => setTab(prev.id)} className="inline-flex items-center gap-2 text-[13px] text-slate-400 hover:text-white">
                                <ArrowLeft size={14} />
                                {prev.label}
                            </button>
                        ) : <span />}
                        {next ? (
                            <button onClick={() => setTab(next.id)} className="inline-flex items-center gap-2 text-[13px] text-slate-200 hover:text-white">
                                {next.label}
                                <ArrowRight size={14} />
                            </button>
                        ) : <span />}
                    </div>
                </article>
            </div>
        </div>
    )
}

export default Docs
