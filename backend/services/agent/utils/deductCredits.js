import axios from "axios"
import { internalHeaders } from "../../../shared/internalAuth.js"

export const deductCredits = async (userId, agent, billingMode = "platform", keyId) => {
    try {
        const { data } = await axios.post(
            `${process.env.AUTH_SERVICE}/deduct-credits`,
            { userId, agent, billingMode, keyId },
            { headers: internalHeaders() }
        )
        return data
    } catch (error) {
        const status = error?.response?.status || 503
        const code = error?.response?.data?.error
        const message =
            error?.response?.data?.error ||
            error?.response?.data?.message ||
            "Unable to deduct credits"
        const err = new Error(message)
        err.status = status === 400 && code !== "daily_cap_exceeded" ? 402 : status
        err.data = {
            ok: false,
            error: code || (status === 400 || status === 402 ? "insufficient_credits" : "billing_unavailable"),
            message
        }
        throw err
    }
}
