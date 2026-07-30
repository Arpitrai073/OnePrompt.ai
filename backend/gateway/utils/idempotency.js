import redis from "../../shared/redis/redis.js"

const ttlSeconds = 24 * 60 * 60

export const idempotencyKeyFor = (userId, key) => `idem:${userId}:${key}`

export const readIdempotent = async (userId, key) => {
    if (!key) return null
    const raw = await redis.get(idempotencyKeyFor(userId, key))
    if (!raw) return null
    return JSON.parse(raw)
}

export const lockIdempotent = async (userId, key) => {
    if (!key) return true
    const stored = await redis.set(
        idempotencyKeyFor(userId, key),
        JSON.stringify({ pending: true }),
        "EX",
        ttlSeconds,
        "NX"
    )
    return Boolean(stored)
}

export const storeIdempotent = async (userId, key, body) => {
    if (!key) return
    await redis.set(idempotencyKeyFor(userId, key), JSON.stringify(body), "EX", ttlSeconds)
}
