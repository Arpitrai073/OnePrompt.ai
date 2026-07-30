import KbDocument from "../models/kbDocument.model.js"
import { canManageKeys, getOrgContext } from "../utils/orgAccess.js"
import { orgUsage, resolveKnowledgeBase } from "../utils/kbAccess.js"

const publicDoc = (doc) => ({
    id: doc._id,
    orgId: doc.orgId,
    kbId: doc.kbId || "",
    kbSlug: doc.kbSlug || "default",
    filename: doc.filename,
    bytes: doc.bytes,
    pageEstimate: doc.pageEstimate,
    s3Key: doc.s3Key,
    status: doc.status,
    chunkCount: doc.chunkCount,
    error: doc.error || "",
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
})

const canWriteDocs = (member, keyId) => Boolean(keyId) || canManageKeys(member)

export const createDocument = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"]
        const keyId = req.headers["x-api-key-id"]
        const filename = String(req.body?.filename || "").trim()
        const bytes = Number(req.body?.bytes || 0)
        if (!filename) {
            return res.status(400).json({ error: "invalid_request", message: "filename is required" })
        }
        const { org, member } = await getOrgContext(userId)
        if (!canWriteDocs(member, keyId)) {
            return res.status(403).json({ error: "forbidden", message: "Only owners and admins can upload documents." })
        }
        const kb = await resolveKnowledgeBase(org._id, {
            kbId: req.body?.kbId,
            kbSlug: req.body?.kbSlug
        })
        if (!kb) {
            return res.status(404).json({ error: "kb_not_found", message: "Knowledge base not found." })
        }

        const usage = await orgUsage(org._id)
        const maxDocuments = org.maxDocuments ?? 50
        const maxBytes = org.maxBytes ?? 209715200
        if (usage.usedDocuments >= maxDocuments) {
            return res.status(402).json({
                error: "quota_exceeded",
                message: `Document limit reached (${maxDocuments}). Upgrade API plan or delete documents.`
            })
        }
        if (usage.usedBytes + bytes > maxBytes) {
            return res.status(402).json({
                error: "quota_exceeded",
                message: `Storage limit reached (${Math.round(maxBytes / (1024 * 1024))} MB). Upgrade API plan or delete documents.`
            })
        }

        const doc = await KbDocument.create({
            orgId: String(org._id),
            kbId: String(kb._id),
            kbSlug: kb.slug,
            userId: String(userId),
            filename,
            bytes,
            status: "processing"
        })
        return res.status(201).json(publicDoc(doc))
    } catch (error) {
        return res.status(500).json({ error: "document_create_failed", message: `${error}` })
    }
}

export const listDocuments = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"]
        const { org } = await getOrgContext(userId)
        const query = { orgId: String(org._id) }
        if (req.query?.status) {
            query.status = String(req.query.status)
        }
        if (req.query?.kbId || req.query?.kbSlug) {
            const kb = await resolveKnowledgeBase(org._id, {
                kbId: req.query.kbId,
                kbSlug: req.query.kbSlug
            })
            if (!kb) {
                return res.status(404).json({ error: "kb_not_found" })
            }
            query.kbId = String(kb._id)
        }
        const docs = await KbDocument.find(query).sort({ createdAt: -1 })
        const usage = await orgUsage(org._id)
        return res.status(200).json({
            orgId: String(org._id),
            count: docs.length,
            documents: docs.map(publicDoc),
            quota: {
                usedDocuments: usage.usedDocuments,
                maxDocuments: org.maxDocuments ?? 50,
                usedBytes: usage.usedBytes,
                maxBytes: org.maxBytes ?? 209715200
            }
        })
    } catch (error) {
        return res.status(500).json({ error: "document_list_failed", message: `${error}` })
    }
}

export const getDocument = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"]
        const { org } = await getOrgContext(userId)
        const doc = await KbDocument.findOne({ _id: req.params.id, orgId: String(org._id) })
        if (!doc) {
            return res.status(404).json({ error: "document_not_found" })
        }
        return res.status(200).json(publicDoc(doc))
    } catch (error) {
        return res.status(500).json({ error: "document_read_failed", message: `${error}` })
    }
}

export const deleteDocument = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"]
        const keyId = req.headers["x-api-key-id"]
        const { org, member } = await getOrgContext(userId)
        if (!canWriteDocs(member, keyId)) {
            return res.status(403).json({ error: "forbidden", message: "Only owners and admins can delete documents." })
        }
        const doc = await KbDocument.findOne({ _id: req.params.id, orgId: String(org._id) })
        if (!doc) {
            return res.status(404).json({ error: "document_not_found" })
        }
        const payload = publicDoc(doc)
        await doc.deleteOne()
        return res.status(200).json({ ok: true, document: payload })
    } catch (error) {
        return res.status(500).json({ error: "document_delete_failed", message: `${error}` })
    }
}

export const updateDocumentStatus = async (req, res) => {
    try {
        const doc = await KbDocument.findById(req.params.id)
        if (!doc) {
            return res.status(404).json({ error: "document_not_found" })
        }
        if (req.body?.status) doc.status = req.body.status
        if ("chunkCount" in (req.body || {})) doc.chunkCount = Number(req.body.chunkCount || 0)
        if ("s3Key" in (req.body || {})) doc.s3Key = req.body.s3Key || ""
        if ("error" in (req.body || {})) doc.error = req.body.error || ""
        if ("pageEstimate" in (req.body || {})) doc.pageEstimate = Number(req.body.pageEstimate || 0)
        await doc.save()
        return res.status(200).json(publicDoc(doc))
    } catch (error) {
        return res.status(500).json({ error: "document_update_failed", message: `${error}` })
    }
}
