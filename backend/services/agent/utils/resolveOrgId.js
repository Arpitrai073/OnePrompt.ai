import axios from "axios"
import { internalHeaders } from "../../../shared/internalAuth.js"

export const resolveOrgId = async (state = {}) => {
    if (state.orgId) return String(state.orgId)
    const userId = state.userId
    if (!userId) return ""
    const { data } = await axios.get(
        `${process.env.AUTH_SERVICE}/org`,
        { headers: internalHeaders({ "x-user-id": String(userId) }) }
    )
    return String(data?.id || "")
}
