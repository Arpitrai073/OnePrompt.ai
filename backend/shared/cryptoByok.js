import crypto from "crypto"

const PROVIDERS = ["groq", "gemini", "openrouter"]

export const byokProviders = PROVIDERS

const masterKey = () => {
    const secret = process.env.BYOK_ENCRYPTION_KEY
    if (!secret) {
        const err = new Error("BYOK encryption key is not configured")
        err.status = 503
        err.data = { ok: false, error: "byok_unavailable", message: err.message }
        throw err
    }
    return crypto.createHash("sha256").update(secret).digest()
}

export const encryptSecret = (plain) => {
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv("aes-256-gcm", masterKey(), iv)
    const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
    return {
        ciphertext: enc.toString("base64"),
        iv: iv.toString("base64"),
        tag: cipher.getAuthTag().toString("base64")
    }
}

export const decryptSecret = ({ ciphertext, iv, tag }) => {
    const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        masterKey(),
        Buffer.from(iv, "base64")
    )
    decipher.setAuthTag(Buffer.from(tag, "base64"))
    return Buffer.concat([
        decipher.update(Buffer.from(ciphertext, "base64")),
        decipher.final()
    ]).toString("utf8")
}

export const last4Of = (plain) => {
    const trimmed = String(plain || "").trim()
    return trimmed.slice(-4)
}

export const providerForAgent = (agent) => {
    if (agent === "coding") return "openrouter"
    if (agent === "imageAnalyzer") return "gemini"
    return "groq"
}

export const requiredProvidersFor = (agent, file) => {
    const needed = new Set(["groq"])
    if (agent === "coding") needed.add("openrouter")
    if (agent === "imageAnalyzer" || agent === "pdfRag") needed.add("gemini")
    if (agent === "auto" && file?.mimetype === "application/pdf") needed.add("gemini")
    if (agent === "auto" && file?.mimetype?.startsWith("image/")) needed.add("gemini")
    return [...needed]
}
