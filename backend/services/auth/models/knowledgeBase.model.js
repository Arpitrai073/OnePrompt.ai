import mongoose from "mongoose"

const knowledgeBaseSchema = new mongoose.Schema({
    orgId: {
        type: String,
        required: true
    },
    slug: {
        type: String,
        required: true
    },
    name: {
        type: String,
        default: "Default"
    },
    createdBy: {
        type: String,
        default: ""
    }
}, { timestamps: true })

knowledgeBaseSchema.index({ orgId: 1, slug: 1 }, { unique: true })

const KnowledgeBase = mongoose.model("KnowledgeBase", knowledgeBaseSchema)
export default KnowledgeBase
