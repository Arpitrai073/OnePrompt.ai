import KnowledgeBase from "../models/knowledgeBase.model.js"
import KbDocument from "../models/kbDocument.model.js"
import { canManageKeys, getOrgContext } from "../utils/orgAccess.js"
import { orgUsage, publicKb, slugify } from "../utils/kbAccess.js"

export const listKnowledgeBases = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"]
        const { org } = await getOrgContext(userId)
        const rows = await KnowledgeBase.find({ orgId: String(org._id) }).sort({ createdAt: 1 })
        const usage = await orgUsage(org._id)
        return res.status(200).json({
            orgId: String(org._id),
            knowledgeBases: rows.map(publicKb),
            quota: {
                usedDocuments: usage.usedDocuments,
                maxDocuments: org.maxDocuments ?? 50,
                usedBytes: usage.usedBytes,
                maxBytes: org.maxBytes ?? 209715200
            }
        })
    } catch (error) {
        return res.status(500).json({ error: "kb_list_failed", message: `${error}` })
    }
}

export const createKnowledgeBase = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"]
        const keyId = req.headers["x-api-key-id"]
        const { org, member } = await getOrgContext(userId)
        if (!(keyId || canManageKeys(member))) {
            return res.status(403).json({ error: "forbidden", message: "Only owners and admins can create knowledge bases." })
        }
        const name = String(req.body?.name || "").trim() || "Knowledge base"
        let slug = slugify(req.body?.slug || name)
        if (slug === "default") {
            return res.status(400).json({ error: "invalid_request", message: "Slug 'default' is reserved." })
        }
        const existing = await KnowledgeBase.findOne({ orgId: String(org._id), slug })
        if (existing) {
            return res.status(409).json({ error: "kb_exists", message: `Knowledge base '${slug}' already exists.` })
        }
        const kb = await KnowledgeBase.create({
            orgId: String(org._id),
            slug,
            name,
            createdBy: String(userId)
        })
        return res.status(201).json(publicKb(kb))
    } catch (error) {
        return res.status(500).json({ error: "kb_create_failed", message: `${error}` })
    }
}

export const deleteKnowledgeBase = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"]
        const keyId = req.headers["x-api-key-id"]
        const { org, member } = await getOrgContext(userId)
        if (!(keyId || canManageKeys(member))) {
            return res.status(403).json({ error: "forbidden", message: "Only owners and admins can delete knowledge bases." })
        }
        const kb = await KnowledgeBase.findOne({ _id: req.params.id, orgId: String(org._id) })
        if (!kb) {
            return res.status(404).json({ error: "kb_not_found" })
        }
        if (kb.slug === "default") {
            return res.status(400).json({ error: "cannot_delete_default", message: "The default knowledge base cannot be deleted." })
        }
        const remaining = await KbDocument.countDocuments({ orgId: String(org._id), kbId: String(kb._id) })
        if (remaining > 0 && req.query?.force !== "true" && req.body?.force !== true) {
            return res.status(400).json({
                error: "kb_not_empty",
                message: `Delete ${remaining} document(s) first, or pass force=true.`
            })
        }
        if (remaining > 0) {
            await KbDocument.deleteMany({ orgId: String(org._id), kbId: String(kb._id) })
        }
        const payload = publicKb(kb)
        await kb.deleteOne()
        return res.status(200).json({ ok: true, knowledgeBase: payload, deletedDocuments: remaining })
    } catch (error) {
        return res.status(500).json({ error: "kb_delete_failed", message: `${error}` })
    }
}
