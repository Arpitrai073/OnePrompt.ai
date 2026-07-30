import KnowledgeBase from "../models/knowledgeBase.model.js"
import KbDocument from "../models/kbDocument.model.js"
import User from "../models/user.model.js"

export const slugify = (value) => String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "default"

export const quotasForApiPlan = (apiPlan) => {
    if (apiPlan === "api_pro") {
        return { maxDocuments: 1000, maxBytes: 5 * 1024 * 1024 * 1024 }
    }
    if (apiPlan === "api_starter") {
        return { maxDocuments: 200, maxBytes: 1024 * 1024 * 1024 }
    }
    return { maxDocuments: 50, maxBytes: 209715200 }
}

export const applyOrgQuotas = async (org) => {
    if (!org) return org
    const owner = await User.findById(org.ownerId)
    const next = quotasForApiPlan(owner?.apiPlan || "free")
    let dirty = false
    if (org.maxDocuments !== next.maxDocuments) {
        org.maxDocuments = next.maxDocuments
        dirty = true
    }
    if (org.maxBytes !== next.maxBytes) {
        org.maxBytes = next.maxBytes
        dirty = true
    }
    if (dirty) await org.save()
    return org
}

export const ensureDefaultKnowledgeBase = async (orgId, userId = "") => {
    let kb = await KnowledgeBase.findOne({ orgId: String(orgId), slug: "default" })
    if (!kb) {
        kb = await KnowledgeBase.create({
            orgId: String(orgId),
            slug: "default",
            name: "Default",
            createdBy: String(userId || "")
        })
    }
    await KbDocument.updateMany(
        {
            orgId: String(orgId),
            $or: [{ kbId: { $exists: false } }, { kbId: "" }, { kbId: null }]
        },
        { kbId: String(kb._id), kbSlug: "default" }
    )
    return kb
}

export const resolveKnowledgeBase = async (orgId, { kbId, kbSlug } = {}) => {
    await ensureDefaultKnowledgeBase(orgId)
    if (kbId) {
        const byId = await KnowledgeBase.findOne({ _id: kbId, orgId: String(orgId) })
        if (byId) return byId
    }
    const slug = slugify(kbSlug || "default")
    const bySlug = await KnowledgeBase.findOne({ orgId: String(orgId), slug })
    if (bySlug) return bySlug
    if (slug === "default") {
        return ensureDefaultKnowledgeBase(orgId)
    }
    return null
}

export const publicKb = (kb) => ({
    id: kb._id,
    orgId: kb.orgId,
    slug: kb.slug,
    name: kb.name,
    createdBy: kb.createdBy,
    createdAt: kb.createdAt,
    updatedAt: kb.updatedAt
})

export const orgUsage = async (orgId) => {
    const rows = await KbDocument.aggregate([
        {
            $match: {
                orgId: String(orgId),
                status: { $in: ["processing", "ready"] }
            }
        },
        {
            $group: {
                _id: null,
                usedDocuments: { $sum: 1 },
                usedBytes: { $sum: "$bytes" }
            }
        }
    ])
    return {
        usedDocuments: rows[0]?.usedDocuments || 0,
        usedBytes: rows[0]?.usedBytes || 0
    }
}
