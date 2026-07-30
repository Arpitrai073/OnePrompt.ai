import axios from "axios"
import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import { getModel } from "../config/llmModels.js"
import { getEmbeddings } from "../config/embeddings.js"
import { searchKb } from "../config/vectorKb.js"
import { checkAgentLimit } from "../config/agentLimit.js"
import { deductCredits } from "../utils/deductCredits.js"
import { resolveOrgId } from "../utils/resolveOrgId.js"
import { internalHeaders, rethrowOrFail } from "../../../shared/internalAuth.js"

const uniqueSources = (docs = []) => {
    const seen = new Set()
    const sources = []
    docs.forEach((doc) => {
        const meta = doc.metadata || {}
        const docId = String(meta.docId || "")
        const filename = String(meta.filename || "document.pdf")
        const key = docId || filename
        if (seen.has(key)) return
        seen.add(key)
        sources.push({ docId, filename, kbSlug: meta.kbSlug || "default" })
    })
    return sources
}

export const kbAgent = async (state) => {
    try {
        await checkAgentLimit(state.userId, "kb", state.keyId)
        await deductCredits(state.userId, "kb", state.billingMode, state.keyId)

        const orgId = await resolveOrgId(state)
        if (!orgId) {
            const err = new Error("Workspace is required to search the knowledge base.")
            err.status = 400
            err.data = { ok: false, error: "org_required", message: err.message }
            throw err
        }

        const kbSlug = String(state.kbSlug || "default")
        const { data } = await axios.get(
            `${process.env.AUTH_SERVICE}/documents`,
            {
                headers: internalHeaders({ "x-user-id": String(state.userId) }),
                params: { status: "ready", kbSlug }
            }
        )
        const visibleDocs = data?.documents || []
        const readyCount = Number(data?.count || visibleDocs.length || 0)
        if (!readyCount) {
            const err = new Error(`No accessible documents in knowledge base '${kbSlug}'. Upload files or ask an admin for access.`)
            err.status = 409
            err.data = { ok: false, error: "knowledge_base_empty", message: err.message }
            throw err
        }

        const allowedDocIds = visibleDocs.map((doc) => String(doc.id)).filter(Boolean)
        const hits = await searchKb(state.prompt, orgId, getEmbeddings(state), 8, kbSlug, allowedDocIds)
        if (hits === null) {
            const err = new Error(`No accessible documents in knowledge base '${kbSlug}'. Upload files or ask an admin for access.`)
            err.status = 409
            err.data = { ok: false, error: "knowledge_base_empty", message: err.message }
            throw err
        }

        const allow = new Set(allowedDocIds)
        const safeHits = (hits || []).filter((doc) => allow.has(String(doc.metadata?.docId || "")))
        const context = safeHits.map((doc) => {
            const name = doc.metadata?.filename || "document.pdf"
            return `Source: ${name}\n${doc.pageContent}`
        }).join("\n\n")
        const sources = uniqueSources(safeHits)

        const llm = await getModel("kb", state)
        const response = await llm.invoke([
            new SystemMessage(`You are OnePrompt Knowledge Assistant.

Rules:
- Answer ONLY from the workspace documents in Context.
- Never invent facts that are not in Context.
- If the answer is not present, reply exactly:
"I couldn't find this information in the uploaded documents."
- Use Markdown.
- End with a short Sources list of filenames you used.`),
            new HumanMessage(`Context:\n${context || "(no matching chunks)"}\n\nQuestion: ${state.prompt}`)
        ])

        return {
            ...state,
            agent: "kb",
            orgId,
            kbSlug,
            aiResponse: response.content,
            sources
        }
    } catch (error) {
        rethrowOrFail(error, "failed to search knowledge base")
    }
}
