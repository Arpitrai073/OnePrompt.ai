import api from "../../utils/axios"

export const listDocuments = async (params = {}) => {
    const { data } = await api.get("/v1/documents", { params })
    return data
}

export const getDocument = async (id) => {
    const { data } = await api.get(`/v1/documents/${id}`)
    return data
}

export const uploadDocument = async (file, { kbId, kbSlug, sync = true, acl } = {}) => {
    const form = new FormData()
    form.append("file", file)
    if (kbId) form.append("kbId", kbId)
    if (kbSlug) form.append("kbSlug", kbSlug)
    if (acl) form.append("acl", JSON.stringify(acl))
    const { data } = await api.post("/v1/documents", form, {
        params: sync ? { sync: "true" } : undefined
    })
    return data
}

export const updateDocumentAcl = async (id, acl) => {
    const { data } = await api.post(`/v1/documents/${id}/acl`, acl)
    return data
}

export const waitForDocument = async (docId, { timeoutMs = 120000, intervalMs = 1500 } = {}) => {
    const started = Date.now()
    while (Date.now() - started < timeoutMs) {
        const { data } = await api.get(`/v1/documents/${docId}`)
        const doc = data?.document || data
        if (doc?.status === "ready" || doc?.status === "failed") return doc
        await new Promise((r) => setTimeout(r, intervalMs))
    }
    throw new Error("Timed out waiting for document ingest.")
}

export const deleteDocument = async (id) => {
    const { data } = await api.delete(`/v1/documents/${id}`)
    return data
}
