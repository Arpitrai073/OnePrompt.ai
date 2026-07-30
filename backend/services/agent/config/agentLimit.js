import redis from "../../../shared/redis/redis.js"

const Limits = {
    chat: 20,
    coding: 5,
    pdf: 5,
    ppt: 5,
    image: 5,
    search: 5,
    kb: 5,
    kbIngest: 5
}

const bump = async (key, agent, max, label) => {
    const count = await redis.incr(key)
    if (count == 1) {
        await redis.expire(key, 60)
    }
    const ttl = await redis.ttl(key)
    if (count > max) {
        const minutes = Math.floor(ttl / 60)
        const seconds = (ttl % 60)
        const time = minutes > 0 ? ` ${minutes}m : ${seconds}s` : `${seconds}s`
        const error = new Error(`Rate limit exceeded for ${agent}.`)
        error.status = 429
        error.data = {
            ok: false,
            error: "rate_limited",
            agent,
            limit: max,
            remainingTime: ttl,
            retryAfter: time,
            message: `You have reached the ${label} ${agent} limit (${max} requests/minute). Try again in ${time}.`
        }
        throw error
    }
    return { remaining: max - count, limit: max }
}

export const checkAgentLimit = async (userId, agent, keyId) => {
    const max = Limits[agent] || Limits["chat"]
    const user = await bump(`rate:${userId}:${agent}`, agent, max, "user")
    if (keyId) {
        await bump(`rate:key:${keyId}:${agent}`, agent, max, "API key")
    }
    return user
}