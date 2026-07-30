export const requireInternalToken = (req, res, next) => {
    const expected = process.env.INTERNAL_SERVICE_SECRET
    if (!expected) {
        return next()
    }
    const token = req.headers["x-internal-token"]
    if (token !== expected) {
        return res.status(401).json({ error: "unauthorized_internal" })
    }
    next()
}

export const internalHeaders = (extra = {}) => {
    const headers = { ...extra }
    if (process.env.INTERNAL_SERVICE_SECRET) {
        headers["x-internal-token"] = process.env.INTERNAL_SERVICE_SECRET
    }
    return headers
}

export const isChargeError = (error) => {
    const status = error?.status || error?.response?.status
    return status === 402 || status === 429 || status === 503
}

export const rethrowOrFail = (error, fallbackMessage) => {
    if (error?.status && error?.data) {
        throw error
    }
    if (isChargeError(error)) {
        throw error
    }
    const status = error?.status || error?.response?.status
    const message = error?.data?.message || error?.message || fallbackMessage
    if (status === 401 || status === 403 || /invalid api key|incorrect api key|api[_ ]key|authentication/i.test(message || "")) {
        const err = new Error("BYOK provider key was rejected. Update keys in Develop.")
        err.status = 502
        err.data = { ok: false, error: "upstream_auth_failed", message: err.message }
        throw err
    }
    const err = new Error(message)
    err.status = status || 500
    err.data = error?.data || {
        ok: false,
        error: "agent_failed",
        message: err.message
    }
    throw err
}
