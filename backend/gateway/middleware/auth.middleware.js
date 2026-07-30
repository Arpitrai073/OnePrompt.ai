import axios from "axios"
import redis from "../../shared/redis/redis.js"
import { internalHeaders } from "../../shared/internalAuth.js"

const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization
        if (authHeader?.startsWith("Bearer ")) {
            const token = authHeader.slice(7)
            const { data } = await axios.post(
                `${process.env.AUTH_SERVICE}/internal/resolve-api-key`,
                { token },
                { headers: internalHeaders() }
            )
            req.user = data
            req.authMode = "api_key"
            return next()
        }

        const sessionId = req.cookies?.session
        if (!sessionId) {
            return res.status(401).json({ error: "unauthorized" })
        }
        const session = await redis.get(`session-${sessionId}`)
        if (!session) {
            return res.status(401).json({ error: "session expired" })
        }
        req.user = JSON.parse(session)
        req.authMode = "cookie"
        next()
    } catch (error) {
        const status = error?.response?.status
        if (status === 401) {
            return res.status(401).json({ error: "invalid_api_key" })
        }
        return res.status(500).json({ error: "protect_error", message: `${error}` })
    }
}

export default protect
