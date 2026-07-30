const VALID_ROLES = new Set(["owner", "admin", "member"])
const VALID_MODES = new Set(["org", "roles", "users"])

export const defaultAcl = () => ({
    mode: "org",
    roles: [],
    userIds: []
})

export const normalizeAcl = (input) => {
    if (!input || typeof input !== "object") return defaultAcl()
    const mode = VALID_MODES.has(String(input.mode)) ? String(input.mode) : "org"
    const roles = Array.isArray(input.roles)
        ? [...new Set(input.roles.map(String).filter((r) => VALID_ROLES.has(r)))]
        : []
    const userIds = Array.isArray(input.userIds)
        ? [...new Set(input.userIds.map(String).filter(Boolean))]
        : []
    if (mode === "roles" && roles.length === 0) {
        return { mode: "roles", roles: ["owner", "admin"], userIds: [] }
    }
    if (mode === "users" && userIds.length === 0) {
        const err = new Error("acl.userIds is required when mode is users")
        err.status = 400
        err.code = "invalid_acl"
        throw err
    }
    return { mode, roles: mode === "roles" ? roles : [], userIds: mode === "users" ? userIds : [] }
}

/** Owners always read everything in the org. */
export const canReadDocument = (doc, { userId, role } = {}) => {
    const uid = String(userId || "")
    const memberRole = String(role || "member")
    if (memberRole === "owner") return true

    const mode = doc.aclMode || "org"
    if (mode === "org" || !mode) return true

    if (String(doc.userId || "") === uid) return true

    if (mode === "roles") {
        const roles = Array.isArray(doc.aclRoles) ? doc.aclRoles : []
        return roles.includes(memberRole)
    }

    if (mode === "users") {
        const ids = Array.isArray(doc.aclUserIds) ? doc.aclUserIds.map(String) : []
        return ids.includes(uid)
    }

    return false
}

export const canManageDocumentAcl = (member) => member?.role === "owner" || member?.role === "admin"

export const publicAcl = (doc) => ({
    mode: doc.aclMode || "org",
    roles: Array.isArray(doc.aclRoles) ? doc.aclRoles : [],
    userIds: Array.isArray(doc.aclUserIds) ? doc.aclUserIds : []
})

export const applyAclFields = (doc, acl) => {
    const normalized = normalizeAcl(acl)
    doc.aclMode = normalized.mode
    doc.aclRoles = normalized.roles
    doc.aclUserIds = normalized.userIds
    return doc
}
