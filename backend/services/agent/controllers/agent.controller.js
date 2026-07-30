import axios from "axios"
import { graph } from "../graph/graph.js"
import { addMessage } from "../config/memory.js"
import { internalHeaders } from "../../../shared/internalAuth.js"
import { requiredProvidersFor } from "../../../shared/cryptoByok.js"

export const agent = async (req, res, next) => {
    try {
        const { prompt, conversationId, agent } = req.body
        const file = req.file
        const userId = req.headers["x-user-id"]
        const keyId = req.headers["x-api-key-id"]
        const billingMode = req.headers["x-billing-mode"] === "byok" ? "byok" : "platform"
        let providerKeys = {}

        if (billingMode === "byok") {
            const { data } = await axios.post(
                `${process.env.AUTH_SERVICE}/internal/byok-credentials`,
                { userId },
                { headers: internalHeaders() }
            )
            providerKeys = data?.keys || {}
            const needed = requiredProvidersFor(agent, file)
            const missing = needed.filter((name) => !providerKeys[name])
            if (missing.length) {
                const err = new Error(`BYOK is on but missing keys: ${missing.join(", ")}`)
                err.status = 400
                err.data = { ok: false, error: "missing_provider_key", providers: missing, message: err.message }
                throw err
            }
        }

        await axios.post(`${process.env.CHAT_SERVICE}/save-message`, {
            conversationId, role: "user", content: prompt
        }, { headers: internalHeaders() })
        const result = await graph.invoke({
            prompt,
            conversationId,
            agent,
            userId,
            file,
            billingMode,
            providerKeys,
            keyId,
            s3Keys: []
        })
        await addMessage(conversationId, "user", prompt)
        await addMessage(conversationId, "assistant", result.aiResponse)
        await axios.post(`${process.env.CHAT_SERVICE}/save-message`, {
            conversationId, role: "assistant", content: result?.aiResponse, images: result?.images, artifacts: result?.artifacts
        }, { headers: internalHeaders() })
        return res.status(200).json({
            ok: true,
            answer: result?.aiResponse,
            images: result?.images,
            artifacts: result?.artifacts,
            agent: result?.agent,
            s3Keys: result?.s3Keys || [],
            billingMode
        })
    } catch (error) {
        next(error)
    }
}
