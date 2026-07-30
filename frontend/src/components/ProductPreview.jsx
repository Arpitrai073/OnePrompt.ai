import React from "react"
import { FileText } from "lucide-react"
import { LogoMark } from "./Logo"

function ProductPreview() {
    return (
        <div className="relative">
            <div className="absolute -inset-8 rounded-[32px] bg-[radial-gradient(circle_at_50%_40%,rgba(99,102,241,0.22),transparent_62%)] blur-2xl pointer-events-none" />
            <div className="relative rounded-2xl border border-white/[0.1] bg-[#11141c]/90 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.7)] overflow-hidden backdrop-blur">
                <div className="flex items-center gap-2 px-4 h-11 border-b border-white/[0.06]">
                    <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
                    <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
                    <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
                    <div className="ml-2 flex items-center gap-2 text-[12px] text-slate-400">
                        <LogoMark size={16} />
                        Playground
                    </div>
                    <span className="ml-auto text-[10px] font-mono text-slate-600">agent=pdf</span>
                </div>
                <div className="p-4 space-y-3">
                    <div className="flex justify-end">
                        <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-indigo-500/20 border border-indigo-400/20 px-3.5 py-2.5 text-[13px] text-slate-100">
                            Generate a 1-page NDA for a software contractor.
                        </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                        <LogoMark size={22} />
                        <div className="flex-1 rounded-2xl rounded-tl-md border border-white/[0.07] bg-white/[0.03] px-3.5 py-2.5">
                            <p className="text-[13px] text-slate-300 leading-relaxed">NDA drafted. File is ready to download.</p>
                            <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-black/40 border border-white/[0.08] px-2.5 py-1.5 text-[12px] text-slate-200">
                                <FileText size={13} className="text-indigo-300" />
                                nda-contractor.pdf
                            </div>
                        </div>
                    </div>
                    <div className="rounded-xl bg-black/50 border border-white/[0.06] p-3 font-mono text-[11px] leading-relaxed text-slate-400">
                        <p className="text-slate-500 mb-1">POST /v1/run · 200</p>
                        <p><span className="text-indigo-300">ok</span>: true</p>
                        <p><span className="text-indigo-300">agentUsed</span>: "pdf"</p>
                        <p><span className="text-indigo-300">creditsUsed</span>: 10</p>
                        <p><span className="text-indigo-300">requestId</span>: "req_8f2a"</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ProductPreview
