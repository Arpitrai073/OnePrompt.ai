import axios from "axios"
import { internalHeaders } from "../../shared/internalAuth.js"
import { lockIdempotent, readIdempotent, storeIdempotent } from "../utils/idempotency.js"

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

const authHeaders = (req) => internalHeaders({
    "x-user-id": String(req.user?.userId || ""),
    "x-api-key-id": req.user?.keyId ? String(req.user.keyId) : "",
    "x-org-id": req.user?.orgId ? String(req.user.orgId) : ""
})

const billingModeOf = (req) => (req.user?.byokEnabled ? "byok" : "platform")

const fail = (res, error, fallback = 500) => {
    const status = error?.response?.status || fallback
    return res.status(status).json({
        ok: false,
        error: error?.response?.data?.error || "document_failed",
        message: error?.response?.data?.message || error.message
    })
}

const isAllowedUpload = (file) => {
    const name = String(file?.originalname || "").toLowerCase()
    const mime = String(file?.mimetype || "")
    if (mime === "application/pdf" || name.endsWith(".pdf")) return true
    if (mime === DOCX || name.endsWith(".docx")) return true
    if (mime === "text/plain" || name.endsWith(".txt")) return true
    if (mime.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(name)) return true
    return false
}

const parseAclFromBody = (body = {}) => {
    if (!body) return null
    if (typeof body.acl === "string" && body.acl.trim()) {
        try {
            return JSON.parse(body.acl)
        } catch {
            return null
        }
    }
    if (body.acl && typeof body.acl === "object") return body.acl
    if (body.aclMode) {
        const roles = typeof body.aclRoles === "string"
            ? body.aclRoles.split(",").map((s) => s.trim()).filter(Boolean)
            : body.aclRoles
        const userIds = typeof body.aclUserIds === "string"
            ? body.aclUserIds.split(",").map((s) => s.trim()).filter(Boolean)
            : body.aclUserIds
        return { mode: body.aclMode, roles, userIds }
    }
    return null
}

const markStatus = async (id, body) => {
    await axios.post(
        `${process.env.AUTH_SERVICE}/internal/documents/${id}`,
        body,
        { headers: internalHeaders() }
    ).catch(() => {})
}

const updateJob = async (jobId, body) => {
    if (!jobId) return
    await axios.post(
        `${process.env.AUTH_SERVICE}/internal/jobs/${jobId}`,
        body,
        { headers: internalHeaders() }
    ).catch(() => {})
}

const runIngest = async ({ req, doc, file, jobId }) => {
    if (jobId) {
        await updateJob(jobId, { status: "running" })
    }
    const form = new FormData()
    form.append("docId", String(doc.id))
    form.append("filename", file.originalname)
    form.append("orgId", String(doc.orgId || req.user?.orgId || ""))
    form.append("kbId", String(doc.kbId || ""))
    form.append("kbSlug", String(doc.kbSlug || "default"))
    form.append("file", new Blob([file.buffer], { type: file.mimetype }), file.originalname)

    const agentRes = await fetch(`${process.env.AGENT_SERVICE}/kb/ingest`, {
        method: "POST",
        headers: internalHeaders({
            "x-user-id": String(req.user?.userId || ""),
            "x-api-key-id": req.user?.keyId ? String(req.user.keyId) : "",
            "x-org-id": String(doc.orgId || req.user?.orgId || ""),
            "x-billing-mode": billingModeOf(req)
        }),
        body: form
    })
    const ingested = await agentRes.json().catch(() => ({}))
    if (!agentRes.ok) {
        const message = ingested.message || ingested.error || "Ingest failed"
        await markStatus(doc.id, { status: "failed", error: message })
        await updateJob(jobId, {
            status: "failed",
            error: message,
            result: { ok: false, error: ingested.error || "ingest_failed", message, document: { ...doc, status: "failed" } }
        })
        return {
            ok: false,
            status: agentRes.status,
            body: {
                ok: false,
                error: ingested.error || "ingest_failed",
                message: ingested.message || "Could not index this document.",
                document: { ...doc, status: "failed" }
            }
        }
    }

    await markStatus(doc.id, {
        status: "ready",
        s3Key: ingested.s3Key,
        chunkCount: ingested.chunkCount,
        pageEstimate: ingested.pageEstimate,
        error: ""
    })
    const document = {
        ...doc,
        status: "ready",
        s3Key: ingested.s3Key,
        chunkCount: ingested.chunkCount,
        pageEstimate: ingested.pageEstimate
    }
    await updateJob(jobId, {
        status: "succeeded",
        result: { ok: true, document },
        error: ""
    })
    return { ok: true, status: 200, body: { ok: true, document } }
}

export const listPublicDocuments = async (req, res) => {
    try {
        const { data } = await axios.get(
            `${process.env.AUTH_SERVICE}/documents`,
            { headers: authHeaders(req), params: req.query }
        )
        return res.status(200).json({ ok: true, ...data })
    } catch (error) {
        return fail(res, error)
    }
}

export const getPublicDocument = async (req, res) => {
    try {
        const { data } = await axios.get(
            `${process.env.AUTH_SERVICE}/documents/${req.params.docId}`,
            { headers: authHeaders(req) }
        )
        return res.status(200).json({ ok: true, document: data })
    } catch (error) {
        return fail(res, error)
    }
}

export const createPublicDocument = async (req, res) => {
    const requestId = `doc_${crypto.randomUUID()}`
    const userId = req.user?.userId
    const idempotencyKey = req.headers["idempotency-key"]
    const syncMode = req.query?.sync === "true" || req.body?.sync === true || req.body?.sync === "true"
    if (!userId) {
        return res.status(401).json({ ok: false, error: "unauthorized", requestId })
    }
    if (!req.file) {
        return res.status(400).json({ ok: false, error: "invalid_request", message: "file is required", requestId })
    }
    if (!isAllowedUpload(req.file)) {
        return res.status(400).json({
            ok: false,
            error: "invalid_request",
            message: "Only PDF, DOCX, TXT, or image (PNG/JPG/WEBP) uploads are supported.",
            requestId
        })
    }

    if (idempotencyKey) {
        const existing = await readIdempotent(userId, idempotencyKey)
        if (existing?.pending) {
            return res.status(409).json({ ok: false, error: "idempotency_conflict", message: "This Idempotency-Key is already in flight." })
        }
        if (existing) {
            return res.status(existing.async ? 202 : 200).json(existing)
        }
        const locked = await lockIdempotent(userId, idempotencyKey)
        if (!locked) {
            const again = await readIdempotent(userId, idempotencyKey)
            if (again && !again.pending) return res.status(again.async ? 202 : 200).json(again)
            return res.status(409).json({ ok: false, error: "idempotency_conflict", message: "This Idempotency-Key is already in flight." })
        }
    }

    let doc
    try {
        const payload = {
            filename: req.file.originalname,
            bytes: req.file.size,
            kbId: req.body?.kbId,
            kbSlug: req.body?.kbSlug
        }
        const acl = parseAclFromBody(req.body)
        if (acl) payload.acl = acl
        const created = await axios.post(
            `${process.env.AUTH_SERVICE}/documents`,
            payload,
            { headers: authHeaders(req) }
        )
        doc = created.data
    } catch (error) {
        return fail(res, error)
    }

    const fileCopy = {
        buffer: req.file.buffer,
        mimetype: req.file.mimetype,
        originalname: req.file.originalname
    }

    if (syncMode) {
        try {
            const result = await runIngest({ req, doc, file: fileCopy })
            if (!result.ok) {
                const errorBody = { ...result.body, requestId }
                await storeIdempotent(userId, idempotencyKey, errorBody)
                return res.status(result.status).json(errorBody)
            }
            const body = { ok: true, async: false, requestId, document: result.body.document }
            await storeIdempotent(userId, idempotencyKey, body)
            return res.status(201).json(body)
        } catch (error) {
            await markStatus(doc.id, { status: "failed", error: error.message })
            return fail(res, error)
        }
    }

    const jobId = `job_${crypto.randomUUID()}`
    await axios.post(
        `${process.env.AUTH_SERVICE}/internal/jobs`,
        {
            jobId,
            requestId,
            userId,
            keyId: req.user?.keyId,
            orgId: doc.orgId || req.user?.orgId,
            agent: "kbIngest",
            status: "queued"
        },
        { headers: internalHeaders() }
    ).catch(() => {})

    const accepted = {
        ok: true,
        async: true,
        status: "processing",
        document: { ...doc, status: "processing" },
        jobId,
        requestId,
        message: "Poll GET /v1/jobs/:jobId or GET /v1/documents/:docId until ready/failed."
    }
    await storeIdempotent(userId, idempotencyKey, accepted)

    setImmediate(async () => {
        try {
            await runIngest({ req, doc, file: fileCopy, jobId })
        } catch (error) {
            await markStatus(doc.id, { status: "failed", error: error.message })
            await updateJob(jobId, { status: "failed", error: error.message })
        }
    })

    return res.status(202).json(accepted)
}

export const updatePublicDocumentAcl = async (req, res) => {
    try {
        const acl = parseAclFromBody(req.body) || req.body
        const { data } = await axios.post(
            `${process.env.AUTH_SERVICE}/documents/${req.params.docId}/acl`,
            acl,
            { headers: authHeaders(req) }
        )
        return res.status(200).json({ ok: true, document: data })
    } catch (error) {
        return fail(res, error)
    }
}

export const deletePublicDocument = async (req, res) => {
    try {
        const { data: current } = await axios.get(
            `${process.env.AUTH_SERVICE}/documents/${req.params.docId}`,
            { headers: authHeaders(req) }
        )
        await fetch(`${process.env.AGENT_SERVICE}/kb/delete`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...internalHeaders({
                    "x-user-id": String(req.user?.userId || ""),
                    "x-org-id": String(current.orgId || req.user?.orgId || "")
                })
            },
            body: JSON.stringify({
                docId: req.params.docId,
                orgId: current.orgId,
                s3Key: current.s3Key,
                kbSlug: current.kbSlug || "default"
            })
        })
        const { data } = await axios.delete(
            `${process.env.AUTH_SERVICE}/documents/${req.params.docId}`,
            { headers: authHeaders(req) }
        )
        return res.status(200).json({ ok: true, ...data })
    } catch (error) {
        return fail(res, error)
    }
}
