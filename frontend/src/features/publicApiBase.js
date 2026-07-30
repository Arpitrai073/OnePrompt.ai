const LIVE_ORIGIN = "https://onepromptai.duckdns.org"

export function isLocalHost(hostname) {
    const host = hostname || (typeof window !== "undefined" ? window.location.hostname : "")
    return host === "localhost" || host === "127.0.0.1"
}

export function getPublicApiBase() {
    if (typeof window === "undefined") return LIVE_ORIGIN
    if (isLocalHost()) {
        return import.meta.env.VITE_SERVER_URL || window.location.origin
    }
    return window.location.origin
}

export function getLiveApiBase() {
    return LIVE_ORIGIN
}
