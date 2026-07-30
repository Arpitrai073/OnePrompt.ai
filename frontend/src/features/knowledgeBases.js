import api from "../../utils/axios"

export const listKnowledgeBases = async () => {
    const { data } = await api.get("/v1/knowledge-bases")
    return data
}

export const createKnowledgeBase = async ({ name, slug }) => {
    const { data } = await api.post("/v1/knowledge-bases", { name, slug })
    return data
}

export const deleteKnowledgeBase = async (id, force = false) => {
    const { data } = await api.delete(`/v1/knowledge-bases/${id}`, {
        params: force ? { force: "true" } : undefined
    })
    return data
}
