import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai"
import dotenv from "dotenv"
dotenv.config()

export const embeddings = new GoogleGenerativeAIEmbeddings({
    model: "gemini-embedding-001"
})

export const getEmbeddings = (state = {}) => {
    if (state.billingMode === "byok") {
        const apiKey = state.providerKeys?.gemini
        if (!apiKey) {
            const err = new Error("BYOK is on but the gemini key is missing. Add it in Develop.")
            err.status = 400
            err.data = { ok: false, error: "missing_provider_key", provider: "gemini", message: err.message }
            throw err
        }
        return new GoogleGenerativeAIEmbeddings({
            model: "gemini-embedding-001",
            apiKey
        })
    }
    return embeddings
}
