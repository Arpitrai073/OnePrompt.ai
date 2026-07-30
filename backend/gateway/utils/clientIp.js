export const clientIp = (req) => {
    const forwarded = req.headers["x-forwarded-for"]
    const raw = (forwarded ? forwarded.split(",")[0] : req.headers["x-real-ip"] || req.ip || req.socket?.remoteAddress || "")
    return String(raw).trim().replace(/^::ffff:/, "")
}

export const ipAllowed = (allowlist, ip) => {
    if (!Array.isArray(allowlist) || allowlist.length === 0) return true
    return allowlist.some((entry) => String(entry).trim() === ip)
}
