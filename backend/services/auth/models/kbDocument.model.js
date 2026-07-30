import mongoose from "mongoose"

const kbDocumentSchema = new mongoose.Schema({
    orgId: {
        type: String,
        required: true
    },
    kbId: {
        type: String,
        default: ""
    },
    kbSlug: {
        type: String,
        default: "default"
    },
    userId: {
        type: String,
        required: true
    },
    filename: {
        type: String,
        required: true
    },
    bytes: {
        type: Number,
        default: 0
    },
    pageEstimate: {
        type: Number,
        default: 0
    },
    s3Key: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        enum: ["processing", "ready", "failed"],
        default: "processing"
    },
    chunkCount: {
        type: Number,
        default: 0
    },
    error: {
        type: String,
        default: ""
    },
    /** org = all members; roles = aclRoles only; users = aclUserIds only. Owners always read. */
    aclMode: {
        type: String,
        enum: ["org", "roles", "users"],
        default: "org"
    },
    aclRoles: {
        type: [String],
        default: []
    },
    aclUserIds: {
        type: [String],
        default: []
    }
}, { timestamps: true })

kbDocumentSchema.index({ orgId: 1, kbId: 1, createdAt: -1 })
kbDocumentSchema.index({ orgId: 1, kbSlug: 1, createdAt: -1 })
kbDocumentSchema.index({ orgId: 1, aclMode: 1 })

const KbDocument = mongoose.model("KbDocument", kbDocumentSchema)
export default KbDocument
