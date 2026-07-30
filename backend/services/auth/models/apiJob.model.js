import mongoose from "mongoose"

const apiJobSchema = new mongoose.Schema({
    jobId: {
        type: String,
        required: true,
        unique: true
    },
    requestId: String,
    userId: {
        type: String,
        required: true
    },
    keyId: String,
    orgId: String,
    agent: String,
    status: {
        type: String,
        enum: ["queued", "running", "succeeded", "failed"],
        default: "queued"
    },
    result: mongoose.Schema.Types.Mixed,
    error: String
}, { timestamps: true })

const ApiJob = mongoose.model("ApiJob", apiJobSchema)
export default ApiJob
