import crypto from "crypto"
import ApiKey from "../models/apiKey.model.js"
import ApiUsage from "../models/apiUsage.model.js"
import User from "../models/user.model.js"
import { canManageKeys, getOrgContext } from "../utils/orgAccess.js"

const hashKey = (raw) => crypto.createHash("sha256").update(raw).digest("hex")

const sessionShape = (user) => ({
    userId: user._id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    plan: user.plan,
    credits: user.credits,
    totalCredits: user.totalCredits,
    planExpiresAt: user.planExpiresAt,
    byokEnabled: user.byokEnabled,
    apiPlan: user.apiPlan,
    apiCredits: user.apiCredits ?? user.credits
})

const publicKey = (k) => ({
    id: k._id,
    name: k.name,
    prefix: k.prefix,
    createdAt: k.createdAt,
    dailyCreditCap: k.dailyCreditCap,
    webhookUrl: k.webhookUrl || "",
    orgId: k.orgId,
    ipAllowlist: k.ipAllowlist || []
})

export const createApiKey = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"]
        const { org, member } = await getOrgContext(userId)
        if (!canManageKeys(member)) {
            return res.status(403).json({ error: "forbidden", message: "Only owners and admins can create keys." })
        }
        const name = req.body?.name || "Default key"
        const raw = `sk_live_${crypto.randomBytes(24).toString("hex")}`
        const keyHash = hashKey(raw)
        const prefix = raw.slice(0, 12)
        const doc = await ApiKey.create({
            name,
            keyHash,
            prefix,
            userId,
            orgId: String(org._id),
            dailyCreditCap: req.body?.dailyCreditCap ?? null,
            webhookUrl: req.body?.webhookUrl || "",
            ipAllowlist: Array.isArray(req.body?.ipAllowlist) ? req.body.ipAllowlist : []
        })
        return res.status(201).json({
            ...publicKey(doc),
            key: raw,
            message: "Copy this key now. You will not see it again."
        })
    } catch (error) {
        return res.status(500).json({ error: "create_key_failed", message: `${error}` })
    }
}

export const listApiKeys = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"]
        const { org } = await getOrgContext(userId)
        const keys = await ApiKey.find({
            active: true,
            $or: [{ orgId: String(org._id) }, { userId, orgId: { $in: [null, ""] } }]
        }).sort({ createdAt: -1 })
        return res.status(200).json(keys.map(publicKey))
    } catch (error) {
        return res.status(500).json({ error: "list_keys_failed", message: `${error}` })
    }
}

export const updateApiKey = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"]
        const { org, member } = await getOrgContext(userId)
        if (!canManageKeys(member)) {
            return res.status(403).json({ error: "forbidden" })
        }
        const key = await ApiKey.findOne({ _id: req.params.id, active: true, $or: [{ orgId: String(org._id) }, { userId }] })
        if (!key) {
            return res.status(404).json({ error: "key_not_found" })
        }
        if ("dailyCreditCap" in (req.body || {})) {
            key.dailyCreditCap = req.body.dailyCreditCap === "" || req.body.dailyCreditCap === null
                ? null
                : Number(req.body.dailyCreditCap)
        }
        if ("webhookUrl" in (req.body || {})) {
            key.webhookUrl = req.body.webhookUrl || ""
        }
        if (req.body?.name) {
            key.name = req.body.name
        }
        if ("ipAllowlist" in (req.body || {})) {
            const raw = req.body.ipAllowlist
            key.ipAllowlist = Array.isArray(raw)
                ? raw.map((ip) => String(ip).trim()).filter(Boolean)
                : String(raw || "").split(/[\s,]+/).map((ip) => ip.trim()).filter(Boolean)
        }
        await key.save()
        return res.status(200).json(publicKey(key))
    } catch (error) {
        return res.status(500).json({ error: "update_key_failed", message: `${error}` })
    }
}

export const revokeApiKey = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"]
        const { org, member } = await getOrgContext(userId)
        if (!canManageKeys(member)) {
            return res.status(403).json({ error: "forbidden" })
        }
        const key = await ApiKey.findOne({ _id: req.params.id, $or: [{ orgId: String(org._id) }, { userId }] })
        if (!key) {
            return res.status(404).json({ error: "key_not_found" })
        }
        key.active = false
        await key.save()
        return res.status(200).json({ ok: true })
    } catch (error) {
        return res.status(500).json({ error: "revoke_failed", message: `${error}` })
    }
}

export const rotateApiKey = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"]
        const { org, member } = await getOrgContext(userId)
        if (!canManageKeys(member)) {
            return res.status(403).json({ error: "forbidden" })
        }
        const key = await ApiKey.findOne({ _id: req.params.id, active: true, $or: [{ orgId: String(org._id) }, { userId }] })
        if (!key) {
            return res.status(404).json({ error: "key_not_found" })
        }
        key.active = false
        await key.save()
        const raw = `sk_live_${crypto.randomBytes(24).toString("hex")}`
        const doc = await ApiKey.create({
            name: key.name,
            keyHash: hashKey(raw),
            prefix: raw.slice(0, 12),
            userId,
            orgId: key.orgId || String(org._id),
            dailyCreditCap: key.dailyCreditCap,
            webhookUrl: key.webhookUrl,
            ipAllowlist: key.ipAllowlist
        })
        return res.status(201).json({
            ...publicKey(doc),
            key: raw,
            message: "Copy this key now. The previous key is revoked."
        })
    } catch (error) {
        return res.status(500).json({ error: "rotate_failed", message: `${error}` })
    }
}

export const resolveApiKey = async (req, res) => {
    try {
        const raw = req.body?.token
        if (!raw) {
            return res.status(401).json({ error: "invalid_api_key" })
        }
        const key = await ApiKey.findOne({ keyHash: hashKey(raw), active: true })
        if (!key) {
            return res.status(401).json({ error: "invalid_api_key" })
        }
        const user = await User.findById(key.userId)
        if (!user) {
            return res.status(401).json({ error: "invalid_api_key" })
        }
        return res.status(200).json({
            ...sessionShape(user),
            keyId: key._id,
            orgId: key.orgId,
            dailyCreditCap: key.dailyCreditCap,
            webhookUrl: key.webhookUrl || "",
            ipAllowlist: key.ipAllowlist || []
        })
    } catch (error) {
        return res.status(500).json({ error: "resolve_failed", message: `${error}` })
    }
}

export const logUsage = async (req, res) => {
    try {
        const { requestId, userId, keyId, agent, status, creditsUsed, error, s3Keys, billingMode, idempotencyKey, orgId, wallet } = req.body
        if (!requestId || !userId) {
            return res.status(400).json({ error: "invalid_usage" })
        }
        await ApiUsage.findOneAndUpdate(
            { requestId },
            { requestId, userId, keyId, agent, status, creditsUsed, error, s3Keys, billingMode, idempotencyKey, orgId, wallet },
            { upsert: true, new: true }
        )
        return res.status(200).json({ ok: true })
    } catch (error) {
        return res.status(500).json({ error: "usage_log_failed", message: `${error}` })
    }
}

export const listUsage = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"]
        const { org } = await getOrgContext(userId)
        const rows = await ApiUsage.find({
            $or: [{ userId: String(userId) }, { orgId: String(org._id) }]
        }).sort({ createdAt: -1 }).limit(20)
        return res.status(200).json(rows)
    } catch (error) {
        return res.status(500).json({ error: "list_usage_failed", message: `${error}` })
    }
}

export const getUsageByRequestId = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"]
        const { org } = await getOrgContext(userId)
        const row = await ApiUsage.findOne({
            requestId: req.params.requestId,
            $or: [{ userId: String(userId) }, { orgId: String(org._id) }]
        })
        if (!row) {
            return res.status(404).json({ error: "request_not_found" })
        }
        return res.status(200).json(row)
    } catch (error) {
        return res.status(500).json({ error: "usage_lookup_failed", message: `${error}` })
    }
}
