import mongoose from "mongoose"

const webhookEventSchema = new mongoose.Schema({
    url: {
        type: String,
        required: true
    },
    payload: mongoose.Schema.Types.Mixed,
    attempts: {
        type: Number,
        default: 0
    },
    maxAttempts: {
        type: Number,
        default: 5
    },
    nextRetryAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ["pending", "delivered", "failed"],
        default: "pending"
    },
    lastError: String,
    requestId: String,
    jobId: String
}, { timestamps: true })

const WebhookEvent = mongoose.model("WebhookEvent", webhookEventSchema)
export default WebhookEvent
