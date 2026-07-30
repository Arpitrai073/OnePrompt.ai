import React, { useState } from "react"
import { Check, Copy } from "lucide-react"

function CodeBlock({ code, label }) {
    const [copied, setCopied] = useState(false)
    const handleCopy = async () => {
        await navigator.clipboard.writeText(code)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
    }
    return (
        <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0c10]">
            <div className="flex items-center justify-between px-4 h-9 border-b border-white/[0.06]">
                <span className="text-[11px] font-medium text-slate-500">{label || "Code"}</span>
                <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-white"
                    aria-label="Copy code"
                >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? "Copied" : "Copy"}
                </button>
            </div>
            <pre className="text-[12px] leading-relaxed text-slate-300 p-4 overflow-x-auto">{code}</pre>
        </div>
    )
}

export default CodeBlock
