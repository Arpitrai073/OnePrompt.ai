import mongoose from "mongoose"

const apiKeySchema = new mongoose.Schema({
    name: {
        type: String,
        default: "Default key"
    },
    keyHash: {
        type: String,
        required: true,
        unique: true
    },
    prefix: {
        type: String,
        required: true
    },
    userId: {
        type: String,
        required: true
    },
    active: {
        type: Boolean,
        default: true
    },
    dailyCreditCap: {
        type: Number,
        default: null
    },
    webhookUrl: {
        type: String,
        default: ""
    },
    orgId: String,
    ipAllowlist: {
        type: [String],
        default: []
    }
}, { timestamps: true })

const ApiKey = mongoose.model("ApiKey", apiKeySchema)
export default ApiKey
