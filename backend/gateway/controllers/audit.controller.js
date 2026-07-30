import axios from "axios"
import { internalHeaders } from "../../shared/internalAuth.js"

export const getAudit = async (req, res) => {
    try {
        const qs = new URLSearchParams(req.query).toString()
        const { data, headers } = await axios.get(
            `${process.env.AUTH_SERVICE}/audit${qs ? `?${qs}` : ""}`,
            {
                headers: internalHeaders({ "x-user-id": String(req.user?.userId) }),
                responseType: req.query.format === "csv" ? "text" : "json"
            }
        )
        if (req.query.format === "csv") {
            res.setHeader("Content-Type", "text/csv")
            res.setHeader("Content-Disposition", headers["content-disposition"] || "attachment; filename=oneprompt-audit.csv")
            return res.status(200).send(data)
        }
        return res.status(200).json(data)
    } catch (error) {
        const status = error?.response?.status || 500
        return res.status(status).json({
            ok: false,
            error: error?.response?.data?.error || "audit_failed",
            message: error?.response?.data?.message || error.message
        })
    }
}
