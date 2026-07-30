import React from "react"
import { Link, useNavigate } from "react-router-dom"
import { useDispatch, useSelector } from "react-redux"
import { ArrowRight, FileText, Heart, ImageIcon, KeyRound, MessageSquare, Shield } from "lucide-react"
import SiteHeader from "../components/SiteHeader"
import CodeBlock from "../components/CodeBlock"
import ProductPreview from "../components/ProductPreview"
import Logo from "../components/Logo"
import { signInWithGoogle } from "../features/googleLogin"
import { getPublicApiBase } from "../features/publicApiBase"

function Landing() {
    const { userData } = useSelector((state) => state.user)
    const dispatch = useDispatch()
    const navigate = useNavigate()

    const start = async () => {
        if (userData) {
            navigate("/app")
            return
        }
        try {
            await signInWithGoogle(dispatch)
            navigate("/app")
        } catch (error) {
            console.log(error)
        }
    }

    const apiBase = getPublicApiBase()
    const snippet = `const res = await fetch("${apiBase}/v1/run", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.ONEPROMPT_API_KEY}\`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ prompt: "Generate a 1-page NDA", agent: "pdf" })
});`

    return (
        <div className="relative min-h-screen bg-[#0b0d12] text-white overflow-x-hidden">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_-10%,rgba(99,102,241,0.28),transparent_50%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_95%_5%,rgba(124,58,237,0.16),transparent_42%)]" />
                <div className="absolute inset-0 opacity-40 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-size-[56px_56px] [mask-image:radial-gradient(ellipse_at_top,black_18%,transparent_68%)]" />
            </div>

            <SiteHeader />

            <main className="relative max-w-6xl mx-auto px-5 pb-24">
                <section className="pt-14 md:pt-20 grid md:grid-cols-[1.05fr_0.95fr] gap-10 md:gap-12 items-center">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1 text-[12px] text-indigo-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                            Agent API + playground
                        </div>
                        <h1 className="mt-5 text-[40px] md:text-[54px] font-semibold tracking-tight leading-[1.05]">
                            One prompt.
                            <span className="block text-transparent bg-clip-text bg-linear-to-r from-indigo-200 via-white to-violet-200">Every agent.</span>
                        </h1>
                        <p className="mt-5 text-[16px] md:text-[17px] text-slate-400 leading-relaxed max-w-xl">
                            OnePrompt is the router other products call — prepaid credits, a playground to prove it, and <span className="text-slate-200 font-mono text-[14px]">POST /v1/run</span> for PDFs, images, search, and document Q&amp;A.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-3">
                            <button onClick={start} className="h-11 px-5 rounded-xl bg-white text-black text-[14px] font-medium inline-flex items-center gap-2 cursor-pointer hover:bg-slate-100">
                                {userData ? "Open playground" : "Try the playground"}
                                <ArrowRight size={16} />
                            </button>
                            <Link to="/docs" className="h-11 px-5 rounded-xl border border-white/[0.12] bg-white/[0.03] text-[14px] text-slate-200 inline-flex items-center hover:bg-white/[0.06]">
                                Read the API docs
                            </Link>
                        </div>
                    </div>
                    <ProductPreview />
                </section>

                <section className="mt-20 grid md:grid-cols-3 gap-3">
                    {[
                        [FileText, "Generate documents", "agent=pdf — contracts, NDAs, summaries as downloadable files."],
                        [ImageIcon, "Generate images", "agent=vision — then a signed download. Refresh with /v1/files."],
                        [MessageSquare, "Ask a PDF", "agent=auto + file — RAG over the upload, not a generic chat."]
                    ].map(([Icon, title, copy]) => (
                        <div key={title} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 hover:border-white/[0.12] transition-colors">
                            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-400/15 flex items-center justify-center">
                                <Icon size={16} className="text-indigo-300" />
                            </div>
                            <h2 className="mt-3 text-[15px] font-semibold">{title}</h2>
                            <p className="mt-1.5 text-[13px] text-slate-500 leading-relaxed">{copy}</p>
                        </div>
                    ))}
                </section>

                <section className="mt-16 grid md:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-white/[0.08] bg-linear-to-b from-white/[0.05] to-transparent p-6">
                        <p className="text-[11px] uppercase tracking-widest text-slate-500">For people</p>
                        <h2 className="mt-2 text-[20px] font-semibold">Playground</h2>
                        <p className="mt-2 text-[14px] text-slate-400">Sign in, pick Auto or a chip, and see the same engine the API uses. Credits are prepaid. No surprise invoice.</p>
                        <button onClick={start} className="mt-5 text-[13px] text-indigo-300 cursor-pointer bg-transparent border-0 p-0">
                            Start a chat →
                        </button>
                    </div>
                    <div className="rounded-2xl border border-white/[0.08] bg-linear-to-b from-white/[0.05] to-transparent p-6">
                        <p className="text-[11px] uppercase tracking-widest text-slate-500">For products</p>
                        <h2 className="mt-2 text-[20px] font-semibold">API</h2>
                        <p className="mt-2 text-[14px] text-slate-400">Create a key in Develop. Call from your server only. Optional BYOK so model spend hits Groq or Gemini, not us.</p>
                        <Link to="/docs?tab=run" className="mt-5 inline-block text-[13px] text-indigo-300">See /v1/run →</Link>
                    </div>
                </section>

                <section className="mt-16 grid sm:grid-cols-3 gap-3">
                    {[
                        ["1", "Prove it in chat", "Sign in and run the same agents your product will call."],
                        ["2", "Create a key", "Develop → Create key. Copy sk_live_ once. Store it on your server."],
                        ["3", "POST /v1/run", "Send prompt + agent. Poll /v1/jobs if you asked for async."]
                    ].map(([step, title, copy]) => (
                        <div key={step} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
                            <p className="text-[11px] font-mono text-indigo-300">0{step}</p>
                            <h3 className="mt-2 text-[15px] font-medium">{title}</h3>
                            <p className="mt-1 text-[13px] text-slate-500 leading-relaxed">{copy}</p>
                        </div>
                    ))}
                </section>

                <section className="mt-16">
                    <div className="flex items-end justify-between gap-4 mb-3">
                        <div>
                            <h2 className="text-[20px] font-semibold">Call it like a customer would</h2>
                            <p className="text-[13px] text-slate-500 mt-1">Key stays on your backend. Never in a browser or mobile app.</p>
                        </div>
                        <Link to="/docs?tab=quickstart" className="text-[13px] text-slate-400 hover:text-white">Full docs</Link>
                    </div>
                    <CodeBlock code={snippet} />
                </section>

                <section className="mt-16 grid sm:grid-cols-3 gap-3">
                    {[
                        [KeyRound, "Prepaid only", "A leaked key spends your credits. Revoke is instant."],
                        [Shield, "Two billing modes", "Use our models, or bring Groq / Gemini / OpenRouter keys."],
                        [FileText, "Files you can recover", "Signed URLs expire. GET /v1/files/:requestId mints a new one."]
                    ].map(([Icon, title, copy]) => (
                        <div key={title} className="rounded-2xl border border-white/[0.06] p-5">
                            <Icon size={16} className="text-slate-400" />
                            <h3 className="mt-3 text-[14px] font-medium">{title}</h3>
                            <p className="mt-1 text-[13px] text-slate-500">{copy}</p>
                        </div>
                    ))}
                </section>
            </main>

            <footer className="relative border-t border-white/[0.06]">
                <div className="max-w-6xl mx-auto px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <Logo size={24} />
                    <div className="flex items-center gap-5 text-[13px] text-slate-500">
                        <Link to="/docs" className="hover:text-slate-200">Docs</Link>
                        <Link to="/docs?tab=pricing" className="hover:text-slate-200">Pricing</Link>
                    </div>
                    <p className="text-[13px] text-slate-500 inline-flex items-center gap-1.5">
                        Made with <Heart size={13} className="text-rose-400 fill-rose-400" /> by Arpit Rai
                    </p>
                </div>
            </footer>
        </div>
    )
}

export default Landing
