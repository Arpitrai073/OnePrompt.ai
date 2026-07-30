import axios from "axios"
import { internalHeaders } from "../../shared/internalAuth.js"

export const getJob = async (req, res) => {
    try {
        const { data } = await axios.get(
            `${process.env.AUTH_SERVICE}/jobs/${req.params.jobId}`,
            { headers: internalHeaders({ "x-user-id": String(req.user?.userId) }) }
        )
        return res.status(200).json({
            ok: true,
            jobId: data.jobId,
            requestId: data.requestId,
            status: data.status,
            agent: data.agent,
            result: data.result,
            error: data.error
        })
    } catch (error) {
        const status = error?.response?.status || 500
        return res.status(status).json({
            ok: false,
            error: error?.response?.data?.error || "job_lookup_failed",
            message: error?.response?.data?.message || error.message
        })
    }
}
