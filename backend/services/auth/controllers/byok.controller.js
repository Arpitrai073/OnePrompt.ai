import User from "../models/user.model.js"
import LlmProviderKey from "../models/llmProviderKey.model.js"
import redis from "../../../shared/redis/redis.js"
import { byokProviders, decryptSecret, encryptSecret, last4Of } from "../../../shared/cryptoByok.js"

const publicStatus = async (userId, user) => {
    const rows = await LlmProviderKey.find({ userId })
    const providers = {}
    byokProviders.forEach((name) => {
        const row = rows.find((r) => r.provider === name)
        providers[name] = row ? { last4: row.last4, updatedAt: row.updatedAt } : null
    })
    return {
        enabled: Boolean(user?.byokEnabled),
        providers
    }
}

const writeSession = async (user) => {
    const sessionId = await redis.get(`user-session-${user?._id}`)
    if (!sessionId) return
    await redis.set(`session-${sessionId}`, JSON.stringify({
        userId: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        plan: user.plan,
        credits: user.credits,
        totalCredits: user.totalCredits,
        planExpiresAt: user.planExpiresAt,
        byokEnabled: user.byokEnabled
    }), "EX", 7 * 24 * 60 * 60)
}

export const getByok = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"]
        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).json({ error: "user_not_found" })
        }
        return res.status(200).json(await publicStatus(userId, user))
    } catch (error) {
        return res.status(error.status || 500).json(error.data || { error: "byok_read_failed", message: `${error}` })
    }
}

export const saveByok = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"]
        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).json({ error: "user_not_found" })
        }

        if (typeof req.body?.enabled === "boolean") {
            user.byokEnabled = req.body.enabled
            await user.save()
            await writeSession(user)
        }

        const keys = req.body?.keys || {}
        for (const provider of byokProviders) {
            if (!(provider in keys)) continue
            const value = keys[provider]
            if (value === null || value === "") {
                await LlmProviderKey.deleteOne({ userId, provider })
                continue
            }
            if (typeof value !== "string") continue
            const trimmed = value.trim()
            if (!trimmed) continue
            const packed = encryptSecret(trimmed)
            await LlmProviderKey.findOneAndUpdate(
                { userId, provider },
                { ...packed, last4: last4Of(trimmed), userId, provider },
                { upsert: true, new: true }
            )
        }

        return res.status(200).json(await publicStatus(userId, user))
    } catch (error) {
        return res.status(error.status || 500).json(error.data || { error: "byok_save_failed", message: `${error}` })
    }
}

export const resolveByok = async (req, res) => {
    try {
        const userId = req.body?.userId
        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).json({ error: "user_not_found" })
        }
        if (!user.byokEnabled) {
            return res.status(200).json({ enabled: false, keys: {} })
        }
        const rows = await LlmProviderKey.find({ userId })
        const keys = {}
        for (const row of rows) {
            keys[row.provider] = decryptSecret(row)
        }
        return res.status(200).json({ enabled: true, keys })
    } catch (error) {
        return res.status(error.status || 500).json(error.data || { error: "byok_resolve_failed", message: `${error}` })
    }
}
