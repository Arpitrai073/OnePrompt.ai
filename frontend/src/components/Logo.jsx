import React, { useId } from "react"
import { Link } from "react-router-dom"

export function LogoMark({ size = 28, className = "" }) {
    const gid = useId().replace(/:/g, "")
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`shrink-0 ${className}`}
            aria-hidden="true"
        >
            <defs>
                <linearGradient id={`op-${gid}`} x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#A5B4FC" />
                    <stop offset="0.45" stopColor="#6366F1" />
                    <stop offset="1" stopColor="#7C3AED" />
                </linearGradient>
            </defs>
            <rect width="32" height="32" rx="9" fill={`url(#op-${gid})`} />
            <path
                d="M11.5 9.2L20.8 16L11.5 22.8"
                stroke="white"
                strokeWidth="2.7"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <circle cx="23.1" cy="16" r="1.7" fill="white" />
        </svg>
    )
}

function Logo({ size = 28, to = "/", wordmark = true, className = "" }) {
    const inner = (
        <span className={`inline-flex items-center gap-2.5 ${className}`}>
            <LogoMark size={size} />
            {wordmark && (
                <span className="text-[15px] font-semibold tracking-tight text-white leading-none">
                    OnePrompt
                </span>
            )}
        </span>
    )
    if (!to) return inner
    return (
        <Link to={to} className="inline-flex items-center" aria-label="OnePrompt home">
            {inner}
        </Link>
    )
}

export default Logo
