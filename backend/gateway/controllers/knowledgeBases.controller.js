import axios from "axios"
import { internalHeaders } from "../../shared/internalAuth.js"

const authHeaders = (req) => internalHeaders({
    "x-user-id": String(req.user?.userId || ""),
    "x-api-key-id": req.user?.keyId ? String(req.user.keyId) : "",
    "x-org-id": req.user?.orgId ? String(req.user.orgId) : ""
})

const fail = (res, error, fallback = 500) => {
    const status = error?.response?.status || fallback
    return res.status(status).json({
        ok: false,
        error: error?.response?.data?.error || "kb_failed",
        message: error?.response?.data?.message || error.message
    })
}

export const listPublicKnowledgeBases = async (req, res) => {
    try {
        const { data } = await axios.get(
            `${process.env.AUTH_SERVICE}/knowledge-bases`,
            { headers: authHeaders(req) }
        )
        return res.status(200).json({ ok: true, ...data })
    } catch (error) {
        return fail(res, error)
    }
}

export const createPublicKnowledgeBase = async (req, res) => {
    try {
        const { data } = await axios.post(
            `${process.env.AUTH_SERVICE}/knowledge-bases`,
            req.body || {},
            { headers: authHeaders(req) }
        )
        return res.status(201).json({ ok: true, knowledgeBase: data })
    } catch (error) {
        return fail(res, error)
    }
}

export const deletePublicKnowledgeBase = async (req, res) => {
    try {
        const { data } = await axios.delete(
            `${process.env.AUTH_SERVICE}/knowledge-bases/${req.params.id}`,
            {
                headers: authHeaders(req),
                params: req.query,
                data: req.body
            }
        )
        return res.status(200).json({ ok: true, ...data })
    } catch (error) {
        return fail(res, error)
    }
}
