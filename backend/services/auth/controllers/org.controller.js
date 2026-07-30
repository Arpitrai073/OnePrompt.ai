import Organization from "../models/organization.model.js"
import OrgMember from "../models/orgMember.model.js"
import User from "../models/user.model.js"
import { canManageKeys, getOrgContext } from "../utils/orgAccess.js"

const publicOrg = (org, member, members) => ({
    id: org._id,
    name: org.name,
    inviteCode: org.inviteCode,
    allowedDomain: org.allowedDomain || "",
    ownerId: org.ownerId,
    role: member.role,
    members: members.map((m) => ({
        id: m._id,
        email: m.email,
        role: m.role,
        status: m.status,
        userId: m.userId
    }))
})

export const getOrg = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"]
        const { org, member } = await getOrgContext(userId)
        const members = await OrgMember.find({ orgId: String(org._id) }).sort({ createdAt: 1 })
        return res.status(200).json(publicOrg(org, member, members))
    } catch (error) {
        return res.status(500).json({ error: "org_read_failed", message: `${error}` })
    }
}

export const updateOrg = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"]
        const { org, member } = await getOrgContext(userId)
        if (!canManageKeys(member)) {
            return res.status(403).json({ error: "forbidden", message: "Only owners and admins can update the workspace." })
        }
        if (req.body?.name) org.name = req.body.name
        if ("allowedDomain" in (req.body || {})) {
            org.allowedDomain = String(req.body.allowedDomain || "").replace(/^@/, "").toLowerCase()
        }
        await org.save()
        const members = await OrgMember.find({ orgId: String(org._id) })
        return res.status(200).json(publicOrg(org, member, members))
    } catch (error) {
        return res.status(500).json({ error: "org_update_failed", message: `${error}` })
    }
}

export const inviteMember = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"]
        const email = String(req.body?.email || "").trim().toLowerCase()
        const role = req.body?.role === "admin" ? "admin" : "member"
        if (!email) {
            return res.status(400).json({ error: "invalid_request", message: "email is required" })
        }
        const { org, member } = await getOrgContext(userId)
        if (!canManageKeys(member)) {
            return res.status(403).json({ error: "forbidden", message: "Only owners and admins can invite." })
        }
        const existingUser = await User.findOne({ email })
        const doc = await OrgMember.findOneAndUpdate(
            { orgId: String(org._id), email },
            {
                orgId: String(org._id),
                email,
                role,
                userId: existingUser ? String(existingUser._id) : undefined,
                status: existingUser ? "active" : "invited"
            },
            { upsert: true, new: true }
        )
        return res.status(200).json({
            ok: true,
            member: { id: doc._id, email: doc.email, role: doc.role, status: doc.status },
            inviteCode: org.inviteCode
        })
    } catch (error) {
        return res.status(500).json({ error: "invite_failed", message: `${error}` })
    }
}

export const joinOrg = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"]
        const user = await User.findById(userId)
        const code = String(req.body?.inviteCode || "").trim()
        const domain = String(user?.email || "").split("@")[1]?.toLowerCase()

        let org = null
        if (code) {
            org = await Organization.findOne({ inviteCode: code })
        } else if (domain) {
            org = await Organization.findOne({ allowedDomain: domain })
        }
        if (!org) {
            return res.status(404).json({ error: "org_not_found", message: "No workspace matches that invite code or email domain." })
        }

        const email = String(user?.email || "").toLowerCase()
        const invited = await OrgMember.findOne({ orgId: String(org._id), email })
        if (!invited && org.allowedDomain && org.allowedDomain !== domain) {
            return res.status(403).json({ error: "forbidden", message: "This workspace is not open to your email domain." })
        }

        await OrgMember.findOneAndUpdate(
            { orgId: String(org._id), email },
            { orgId: String(org._id), email, userId: String(userId), status: "active", role: invited?.role || "member" },
            { upsert: true, new: true }
        )
        const member = await OrgMember.findOne({ orgId: String(org._id), userId: String(userId) })
        const members = await OrgMember.find({ orgId: String(org._id) })
        return res.status(200).json(publicOrg(org, member, members))
    } catch (error) {
        return res.status(500).json({ error: "join_failed", message: `${error}` })
    }
}

export const removeMember = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"]
        const { org, member } = await getOrgContext(userId)
        if (member.role !== "owner") {
            return res.status(403).json({ error: "forbidden", message: "Only the owner can remove members." })
        }
        const target = await OrgMember.findOne({ _id: req.params.id, orgId: String(org._id) })
        if (!target) {
            return res.status(404).json({ error: "member_not_found" })
        }
        if (target.role === "owner") {
            return res.status(400).json({ error: "cannot_remove_owner" })
        }
        await target.deleteOne()
        return res.status(200).json({ ok: true })
    } catch (error) {
        return res.status(500).json({ error: "remove_failed", message: `${error}` })
    }
}
