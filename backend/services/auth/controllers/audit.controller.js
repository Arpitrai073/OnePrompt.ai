import ApiUsage from "../models/apiUsage.model.js"
import { getOrgContext } from "../utils/orgAccess.js"

export const exportAudit = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"]
        const { org } = await getOrgContext(userId)
        const from = req.query.from ? new Date(req.query.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        const to = req.query.to ? new Date(req.query.to) : new Date()
        const rows = await ApiUsage.find({
            createdAt: { $gte: from, $lte: to },
            $or: [{ userId: String(userId) }, { orgId: String(org._id) }]
        }).sort({ createdAt: -1 }).limit(1000)

        if (req.query.format === "csv") {
            const header = "createdAt,requestId,agent,status,creditsUsed,billingMode,keyId,error"
            const lines = rows.map((r) => [
                r.createdAt?.toISOString(),
                r.requestId,
                r.agent,
                r.status,
                r.creditsUsed,
                r.billingMode,
                r.keyId,
                `"${(r.error || "").replace(/"/g, "'")}"`
            ].join(","))
            res.setHeader("Content-Type", "text/csv")
            res.setHeader("Content-Disposition", "attachment; filename=oneprompt-audit.csv")
            return res.status(200).send([header, ...lines].join("\n"))
        }

        return res.status(200).json({
            from,
            to,
            count: rows.length,
            rows
        })
    } catch (error) {
        return res.status(500).json({ error: "audit_failed", message: `${error}` })
    }
}
