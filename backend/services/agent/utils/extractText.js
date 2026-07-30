import { PDFParse } from "pdf-parse"
import mammoth from "mammoth"

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

export const isKbDocumentMime = (mimetype = "", filename = "") => {
    const lower = String(filename).toLowerCase()
    if (mimetype === "application/pdf" || lower.endsWith(".pdf")) return true
    if (mimetype === DOCX || lower.endsWith(".docx")) return true
    if (mimetype === "text/plain" || lower.endsWith(".txt")) return true
    return false
}

export const extensionFor = (mimetype = "", filename = "") => {
    const lower = String(filename).toLowerCase()
    if (mimetype === "application/pdf" || lower.endsWith(".pdf")) return "pdf"
    if (mimetype === DOCX || lower.endsWith(".docx")) return "docx"
    if (mimetype === "text/plain" || lower.endsWith(".txt")) return "txt"
    return "bin"
}

export const extractTextFromBuffer = async (buffer, mimetype = "", filename = "") => {
    const lower = String(filename).toLowerCase()
    if (mimetype === "application/pdf" || lower.endsWith(".pdf")) {
        const pdf = new PDFParse({ data: buffer })
        const parsed = await pdf.getText()
        return String(parsed?.text || "").trim()
    }
    if (mimetype === DOCX || lower.endsWith(".docx")) {
        const result = await mammoth.extractRawText({ buffer })
        return String(result?.value || "").trim()
    }
    if (mimetype === "text/plain" || lower.endsWith(".txt")) {
        return buffer.toString("utf8").trim()
    }
    const err = new Error("Unsupported file type. Upload PDF, DOCX, or TXT.")
    err.status = 400
    err.data = { ok: false, error: "invalid_request", message: err.message }
    throw err
}
