import { PDFParse } from "pdf-parse"
import mammoth from "mammoth"
import { ocrWithGemini } from "./ocrWithGemini.js"

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"])

export const isKbDocumentMime = (mimetype = "", filename = "") => {
    const lower = String(filename).toLowerCase()
    if (mimetype === "application/pdf" || lower.endsWith(".pdf")) return true
    if (mimetype === DOCX || lower.endsWith(".docx")) return true
    if (mimetype === "text/plain" || lower.endsWith(".txt")) return true
    if (IMAGE_TYPES.has(mimetype) || /\.(png|jpe?g|webp)$/i.test(lower)) return true
    return false
}

export const extensionFor = (mimetype = "", filename = "") => {
    const lower = String(filename).toLowerCase()
    if (mimetype === "application/pdf" || lower.endsWith(".pdf")) return "pdf"
    if (mimetype === DOCX || lower.endsWith(".docx")) return "docx"
    if (mimetype === "text/plain" || lower.endsWith(".txt")) return "txt"
    if (mimetype === "image/png" || lower.endsWith(".png")) return "png"
    if (mimetype === "image/webp" || lower.endsWith(".webp")) return "webp"
    if (mimetype === "image/jpeg" || mimetype === "image/jpg" || /\.jpe?g$/i.test(lower)) return "jpg"
    return "bin"
}

const needsOcr = (text, pageCount = 1) => {
    const cleaned = String(text || "").replace(/\s+/g, " ").trim()
    if (!cleaned) return true
    const pages = Math.max(1, Number(pageCount) || 1)
    if (cleaned.length < 80) return true
    if (cleaned.length / pages < 40) return true
    const letters = (cleaned.match(/[A-Za-z0-9]/g) || []).length
    if (letters / cleaned.length < 0.25) return true
    return false
}

export const extractTextFromBuffer = async (buffer, mimetype = "", filename = "", options = {}) => {
    const lower = String(filename).toLowerCase()
    const mime = mimetype || ""

    if (IMAGE_TYPES.has(mime) || /\.(png|jpe?g|webp)$/i.test(lower)) {
        const imageMime = mime.startsWith("image/") ? mime : "image/png"
        const text = await ocrWithGemini(buffer, imageMime, options)
        return { text, method: "ocr", ocrUsed: true }
    }

    if (mime === "application/pdf" || lower.endsWith(".pdf")) {
        let text = ""
        let pageCount = 1
        try {
            const pdf = new PDFParse({ data: buffer })
            const parsed = await pdf.getText()
            text = String(parsed?.text || "").trim()
            pageCount = Number(parsed?.total || parsed?.numpages || parsed?.pages?.length || 1) || 1
        } catch {
            text = ""
        }
        if (!needsOcr(text, pageCount)) {
            return { text, method: "pdf-parse", ocrUsed: false }
        }
        const ocrText = await ocrWithGemini(buffer, "application/pdf", options)
        if (ocrText) {
            return { text: ocrText, method: "ocr", ocrUsed: true }
        }
        return { text, method: text ? "pdf-parse" : "none", ocrUsed: false }
    }

    if (mime === DOCX || lower.endsWith(".docx")) {
        const result = await mammoth.extractRawText({ buffer })
        return { text: String(result?.value || "").trim(), method: "mammoth", ocrUsed: false }
    }

    if (mime === "text/plain" || lower.endsWith(".txt")) {
        return { text: buffer.toString("utf8").trim(), method: "utf8", ocrUsed: false }
    }

    const err = new Error("Unsupported file type. Upload PDF, DOCX, TXT, or an image (PNG/JPG/WEBP).")
    err.status = 400
    err.data = { ok: false, error: "invalid_request", message: err.message }
    throw err
}
