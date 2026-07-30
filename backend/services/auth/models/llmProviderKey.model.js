import mongoose from "mongoose"

const llmProviderKeySchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    provider: {
        type: String,
        enum: ["groq", "gemini", "openrouter"],
        required: true
    },
    ciphertext: {
        type: String,
        required: true
    },
    iv: {
        type: String,
        required: true
    },
    tag: {
        type: String,
        required: true
    },
    last4: {
        type: String,
        required: true
    }
}, { timestamps: true })

llmProviderKeySchema.index({ userId: 1, provider: 1 }, { unique: true })

const LlmProviderKey = mongoose.model("LlmProviderKey", llmProviderKeySchema)
export default LlmProviderKey
