import mongoose from "mongoose"

const apiUsageSchema = new mongoose.Schema({
    requestId: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: String,
        required: true
    },
    keyId: String,
    agent: String,
    status: {
        type: String,
        enum: ["success", "error"],
        default: "success"
    },
    creditsUsed: {
        type: Number,
        default: 0
    },
    error: String,
    s3Keys: [String],
    billingMode: {
        type: String,
        enum: ["platform", "byok"],
        default: "platform"
    },
    idempotencyKey: String,
    orgId: String,
    wallet: {
        type: String,
        enum: ["playground", "api"],
        default: "playground"
    }
}, { timestamps: true })

const ApiUsage = mongoose.model("ApiUsage", apiUsageSchema)
export default ApiUsage
