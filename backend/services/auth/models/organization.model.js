import mongoose from "mongoose"

const organizationSchema = new mongoose.Schema({
    name: {
        type: String,
        default: "Workspace"
    },
    ownerId: {
        type: String,
        required: true
    },
    inviteCode: {
        type: String,
        required: true,
        unique: true
    },
    allowedDomain: {
        type: String,
        default: ""
    }
}, { timestamps: true })

const Organization = mongoose.model("Organization", organizationSchema)
export default Organization
