import crypto from "crypto"
import Organization from "../models/organization.model.js"
import OrgMember from "../models/orgMember.model.js"
import ApiKey from "../models/apiKey.model.js"
import User from "../models/user.model.js"

export const canManageKeys = (member) => member?.role === "owner" || member?.role === "admin"

export const ensureOrg = async (userId) => {
    const existing = await OrgMember.findOne({ userId: String(userId), status: "active" })
    if (existing) {
        const org = await Organization.findById(existing.orgId)
        if (org) return { org, member: existing }
    }
    const user = await User.findById(userId)
    const org = await Organization.create({
        name: `${user?.name || "Personal"} workspace`,
        ownerId: String(userId),
        inviteCode: crypto.randomBytes(6).toString("hex")
    })
    const member = await OrgMember.create({
        orgId: String(org._id),
        userId: String(userId),
        email: user?.email || "",
        role: "owner",
        status: "active"
    })
    await ApiKey.updateMany(
        { userId: String(userId), $or: [{ orgId: { $exists: false } }, { orgId: "" }, { orgId: null }] },
        { orgId: String(org._id) }
    )
    return { org, member }
}

export const getOrgContext = async (userId) => {
    const { org, member } = await ensureOrg(userId)
    return { org, member }
}
