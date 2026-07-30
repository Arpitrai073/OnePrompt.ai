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
    },
    maxDocuments: {
        type: Number,
        default: 50
    },
    maxBytes: {
        type: Number,
        default: 209715200
    }
}, { timestamps: true })

const Organization = mongoose.model("Organization", organizationSchema)
export default Organization
