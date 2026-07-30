import axios from "axios"
import { internalHeaders } from "../../shared/internalAuth.js"

export const getRunFiles = async (req, res) => {
    const requestId = req.params.requestId
    const userId = req.user?.userId
    try {
        const { data: usage } = await axios.get(
            `${process.env.AUTH_SERVICE}/usage/${requestId}`,
            { headers: internalHeaders({ "x-user-id": String(userId) }) }
        )
        const keys = Array.isArray(usage?.s3Keys) ? usage.s3Keys : []
        if (!keys.length) {
            return res.status(404).json({
                ok: false,
                error: "files_not_found",
                message: "No stored files for this requestId",
                requestId
            })
        }
        const { data } = await axios.post(
            `${process.env.AGENT_SERVICE}/sign-urls`,
            { keys },
            { headers: internalHeaders() }
        )
        return res.status(200).json({
            ok: true,
            requestId,
            files: data.files || [],
            expiresIn: "24h"
        })
    } catch (error) {
        const status = error?.response?.status || 500
        return res.status(status).json({
            ok: false,
            error: error?.response?.data?.error || "files_lookup_failed",
            message: error?.response?.data?.message || error.message,
            requestId
        })
    }
}
