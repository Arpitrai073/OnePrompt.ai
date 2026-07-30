import mongoose from "mongoose"

const orgMemberSchema = new mongoose.Schema({
    orgId: {
        type: String,
        required: true
    },
    userId: String,
    email: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ["owner", "admin", "member"],
        default: "member"
    },
    status: {
        type: String,
        enum: ["active", "invited"],
        default: "invited"
    }
}, { timestamps: true })

orgMemberSchema.index({ orgId: 1, email: 1 }, { unique: true })

const OrgMember = mongoose.model("OrgMember", orgMemberSchema)
export default OrgMember
