import api from "../../utils/axios"

export const listApiKeys = async () => {
    const { data } = await api.get("/api/auth/keys")
    return data
}

export const createApiKey = async (name) => {
    const { data } = await api.post("/api/auth/keys", { name })
    return data
}

export const updateApiKey = async (id, payload) => {
    const { data } = await api.post(`/api/auth/keys/${id}`, payload)
    return data
}

export const revokeApiKey = async (id) => {
    const { data } = await api.post(`/api/auth/keys/${id}/revoke`)
    return data
}

export const rotateApiKey = async (id) => {
    const { data } = await api.post(`/api/auth/keys/${id}/rotate`)
    return data
}

export const listUsage = async () => {
    const { data } = await api.get("/api/auth/usage")
    return data
}

export const getByok = async () => {
    const { data } = await api.get("/api/auth/byok")
    return data
}

export const saveByok = async (payload) => {
    const { data } = await api.post("/api/auth/byok", payload)
    return data
}

export const getOrg = async () => {
    const { data } = await api.get("/api/auth/org")
    return data
}

export const updateOrg = async (payload) => {
    const { data } = await api.post("/api/auth/org", payload)
    return data
}

export const inviteMember = async (email, role = "member") => {
    const { data } = await api.post("/api/auth/org/invite", { email, role })
    return data
}

export const joinOrg = async (inviteCode) => {
    const { data } = await api.post("/api/auth/org/join", { inviteCode })
    return data
}

export const removeMember = async (id) => {
    const { data } = await api.post(`/api/auth/org/members/${id}/remove`)
    return data
}

export const listJobs = async () => {
    const { data } = await api.get("/api/auth/jobs")
    return data
}
