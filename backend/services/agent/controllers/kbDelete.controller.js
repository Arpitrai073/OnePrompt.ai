import { deleteKbDoc } from "../config/vectorKb.js"
import { deleteFromS3 } from "../utils/deleteFromS3.js"
import { resolveOrgId } from "../utils/resolveOrgId.js"

export const deleteKbDocument = async (req, res, next) => {
    try {
        const userId = req.headers["x-user-id"] || req.body?.userId
        const docId = String(req.body?.docId || req.params?.docId || "")
        const s3Key = String(req.body?.s3Key || "")
        const kbSlug = String(req.body?.kbSlug || "default")
        if (!docId) {
            return res.status(400).json({ ok: false, error: "invalid_request", message: "docId is required" })
        }
        const orgId = await resolveOrgId({
            orgId: req.headers["x-org-id"] || req.body?.orgId,
            userId
        })
        await deleteKbDoc(orgId, docId, kbSlug)
        if (s3Key) {
            await deleteFromS3(s3Key)
        }
        return res.status(200).json({ ok: true, docId, orgId, kbSlug })
    } catch (error) {
        next(error)
    }
}
