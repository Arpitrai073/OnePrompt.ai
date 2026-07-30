import dotenv from "dotenv"
dotenv.config()
import { ChatGroq } from "@langchain/groq"
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import { ChatOpenRouter } from "@langchain/openrouter"
import { providerForAgent } from "../../../shared/cryptoByok.js"

const missingKey = (provider) => {
    const err = new Error(`BYOK is on but the ${provider} key is missing. Add it in Develop.`)
    err.status = 400
    err.data = { ok: false, error: "missing_provider_key", provider, message: err.message }
    throw err
}

const groqModel = (apiKey) => new ChatGroq({
    model: "openai/gpt-oss-120b",
    apiKey
})

const geminiModel = (apiKey) => new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    apiKey
})

const openrouterModel = (apiKey) => new ChatOpenRouter({
    model: "deepseek/deepseek-chat",
    temperature: 0,
    maxTokens: 2500,
    apiKey
})

export const getModel = async (agent, state = {}) => {
    const billingMode = state.billingMode === "byok" ? "byok" : "platform"
    const provider = providerForAgent(agent)
    let apiKey
    if (billingMode === "byok") {
        apiKey = state.providerKeys?.[provider]
        if (!apiKey) missingKey(provider)
    } else if (provider === "gemini") {
        apiKey = process.env.GOOGLE_API_KEY
    } else if (provider === "openrouter") {
        apiKey = process.env.OPENROUTER_API_KEY
    } else {
        apiKey = process.env.GROQ_API_KEY
    }

    if (provider === "openrouter") return openrouterModel(apiKey)
    if (provider === "gemini") return geminiModel(apiKey)
    return groqModel(apiKey)
}
