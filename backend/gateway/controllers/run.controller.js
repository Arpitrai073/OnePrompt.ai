import axios from "axios"
import { internalHeaders } from "../../shared/internalAuth.js"
import { creditsForAgent } from "../../shared/credits.js"
import { lockIdempotent, readIdempotent, storeIdempotent } from "../utils/idempotency.js"
import { clientIp, ipAllowed } from "../utils/clientIp.js"

const collectFiles = (data = {}) => {
    const files = []
    if (Array.isArray(data.images)) {
        data.images.forEach((url, i) => {
            if (typeof url === "string") {
                files.push({ type: "image", url, name: `image-${i + 1}` })
            }
        })
    }
    if (Array.isArray(data.artifacts)) {
        data.artifacts.forEach((artifact) => {
            if (artifact?.url) {
                files.push({
                    type: artifact.type || "file",
                    url: artifact.url,
                    name: artifact.title || artifact.name || "artifact"
                })
            }
        })
    }
    const answer = data.answer || ""
    const mdLinks = [...answer.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g)]
    mdLinks.forEach((match) => {
        files.push({ type: "download", url: match[2], name: match[1] })
    })
    return files
}

const logUsage = async (payload) => {
    try {
        await axios.post(
            `${process.env.AUTH_SERVICE}/internal/log-usage`,
            payload,
            { headers: internalHeaders() }
        )
    } catch (error) {
        console.log("usage log failed", error?.message)
    }
}

const enqueueWebhook = async (url, payload, extra = {}) => {
    if (!url) return
    try {
        await axios.post(
            `${process.env.AUTH_SERVICE}/internal/webhooks`,
            { url, payload, ...extra },
            { headers: internalHeaders() }
        )
    } catch (error) {
        console.log("webhook enqueue failed", error?.message)
    }
}

const executeRun = async ({ userId, keyId, orgId, billingMode, prompt, requestedAgent, file, conversationId, requestId, idempotencyKey, kbId, kbSlug }) => {
    let convId = conversationId
    if (!convId) {
        const { data } = await axios.get(
            `${process.env.CHAT_SERVICE}/create-conversation`,
            { headers: internalHeaders({ "x-user-id": String(userId) }) }
        )
        convId = data?._id
    }

    const form = new FormData()
    form.append("prompt", prompt)
    form.append("conversationId", String(convId))
    form.append("agent", requestedAgent)
    if (kbId) form.append("kbId", String(kbId))
    if (kbSlug) form.append("kbSlug", String(kbSlug))
    if (file) {
        form.append("file", new Blob([file.buffer], { type: file.mimetype }), file.originalname)
    }

    const agentRes = await fetch(`${process.env.AGENT_SERVICE}/chat`, {
        method: "POST",
        headers: internalHeaders({
            "x-user-id": String(userId),
            "x-api-key-id": keyId ? String(keyId) : "",
            "x-org-id": orgId ? String(orgId) : "",
            "x-billing-mode": billingMode
        }),
        body: form
    })
    const data = await agentRes.json().catch(() => ({}))

    if (!agentRes.ok) {
        const errorBody = {
            ok: false,
            error: data?.error || "run_failed",
            message: data?.message || "Agent request failed",
            requestId,
            billingMode
        }
        await logUsage({
            requestId, userId, keyId, orgId, agent: requestedAgent, status: "error",
            creditsUsed: 0, error: errorBody.message, billingMode, idempotencyKey, wallet: "api"
        })
        await storeIdempotent(userId, idempotencyKey, errorBody)
        return { status: agentRes.status, body: errorBody }
    }

    const agentUsed = (data.agent || requestedAgent || "auto").toLowerCase()
    const mode = data.billingMode || billingMode
    const creditsUsed = creditsForAgent(agentUsed, mode)
    const body = {
        ok: true,
        agentUsed,
        answer: data.answer,
        files: collectFiles(data),
        images: data.images || [],
        artifacts: data.artifacts || [],
        creditsUsed,
        billingMode: mode,
        requestId,
        conversationId: convId,
        sources: data.sources || []
    }
    await logUsage({
        requestId, userId, keyId, orgId, agent: agentUsed, status: "success",
        creditsUsed, s3Keys: Array.isArray(data.s3Keys) ? data.s3Keys.filter(Boolean) : [],
        billingMode: mode, idempotencyKey, wallet: "api"
    })
    await storeIdempotent(userId, idempotencyKey, body)
    return { status: 200, body }
}

export const runApi = async (req, res) => {
    const requestId = `req_${crypto.randomUUID()}`
    const userId = req.user?.userId
    const keyId = req.user?.keyId
    const orgId = req.user?.orgId
    const billingMode = req.user?.byokEnabled ? "byok" : "platform"
    const prompt = req.body?.prompt || req.body?.input || ""
    const requestedAgent = (req.body?.agent || "auto").toLowerCase()
    const idempotencyKey = req.headers["idempotency-key"]
    const asyncMode = req.body?.async === true || req.body?.async === "true" || req.query.async === "true"

    if (!userId) {
        return res.status(401).json({ ok: false, error: "unauthorized", requestId })
    }
    if (!ipAllowed(req.user?.ipAllowlist, clientIp(req))) {
        return res.status(403).json({ ok: false, error: "ip_not_allowed", message: "This API key cannot be used from your IP.", requestId })
    }
    if (!prompt && !req.file) {
        return res.status(400).json({ ok: false, error: "invalid_request", message: "prompt or file is required", requestId })
    }

    if (idempotencyKey) {
        const existing = await readIdempotent(userId, idempotencyKey)
        if (existing?.pending) {
            return res.status(409).json({ ok: false, error: "idempotency_conflict", message: "This Idempotency-Key is already in flight." })
        }
        if (existing) {
            return res.status(existing.ok === false ? 200 : 200).json(existing)
        }
        const locked = await lockIdempotent(userId, idempotencyKey)
        if (!locked) {
            const again = await readIdempotent(userId, idempotencyKey)
            if (again && !again.pending) return res.status(200).json(again)
            return res.status(409).json({ ok: false, error: "idempotency_conflict", message: "This Idempotency-Key is already in flight." })
        }
    }

    const input = {
        userId, keyId, orgId, billingMode, prompt, requestedAgent,
        file: req.file ? { buffer: req.file.buffer, mimetype: req.file.mimetype, originalname: req.file.originalname } : null,
        conversationId: req.body?.conversationId,
        requestId,
        idempotencyKey,
        kbId: req.body?.kbId || "",
        kbSlug: req.body?.kbSlug || "default"
    }

    if (asyncMode) {
        const jobId = `job_${crypto.randomUUID()}`
        await axios.post(
            `${process.env.AUTH_SERVICE}/internal/jobs`,
            { jobId, requestId, userId, keyId, orgId, agent: requestedAgent, status: "queued" },
            { headers: internalHeaders() }
        ).catch(() => {})
        setImmediate(async () => {
            try {
                await axios.post(
                    `${process.env.AUTH_SERVICE}/internal/jobs/${jobId}`,
                    { status: "running" },
                    { headers: internalHeaders() }
                )
                const result = await executeRun(input)
                await axios.post(
                    `${process.env.AUTH_SERVICE}/internal/jobs/${jobId}`,
                    {
                        status: result.body.ok ? "succeeded" : "failed",
                        result: result.body,
                        error: result.body.ok ? "" : result.body.message
                    },
                    { headers: internalHeaders() }
                )
                await enqueueWebhook(req.user?.webhookUrl, { ...result.body, jobId }, { requestId, jobId })
            } catch (error) {
                await axios.post(
                    `${process.env.AUTH_SERVICE}/internal/jobs/${jobId}`,
                    { status: "failed", error: error.message },
                    { headers: internalHeaders() }
                ).catch(() => {})
            }
        })
        return res.status(202).json({
            ok: true,
            async: true,
            status: "queued",
            jobId,
            requestId,
            message: "Poll GET /v1/jobs/:jobId or wait for the webhook."
        })
    }

    try {
        const result = await executeRun(input)
        if (result.body.ok) {
            await enqueueWebhook(req.user?.webhookUrl, result.body, { requestId })
        }
        return res.status(result.status).json(result.body)
    } catch (error) {
        const status = error?.response?.status || 500
        const payload = error?.response?.data || {}
        const errorBody = {
            ok: false,
            error: payload.error || "run_failed",
            message: payload.message || error.message,
            requestId,
            billingMode
        }
        await logUsage({
            requestId, userId, keyId, orgId, agent: requestedAgent, status: "error",
            creditsUsed: 0, error: errorBody.message, billingMode, idempotencyKey, wallet: "api"
        })
        await storeIdempotent(userId, idempotencyKey, errorBody)
        return res.status(status).json(errorBody)
    }
}
