import { GoogleGenerativeAI } from "@google/generative-ai"

const OCR_PROMPT = `Extract all readable text from this document or image for a knowledge base.

Rules:
- Preserve reading order.
- Keep headings, lists, and table content as plain text.
- Do not invent text that is not visible.
- If there is no readable text, reply with exactly: EMPTY
- Output only the extracted text, no commentary.`

const resolveApiKey = ({ billingMode, providerKeys } = {}) => {
    if (billingMode === "byok") {
        const key = providerKeys?.gemini
        if (!key) {
            const err = new Error("BYOK is on but the gemini key is missing. Add it in Develop for OCR.")
            err.status = 400
            err.data = { ok: false, error: "missing_provider_key", provider: "gemini", message: err.message }
            throw err
        }
        return key
    }
    const key = process.env.GOOGLE_API_KEY
    if (!key) {
        const err = new Error("GOOGLE_API_KEY is required for OCR on scanned documents.")
        err.status = 500
        err.data = { ok: false, error: "ocr_unavailable", message: err.message }
        throw err
    }
    return key
}

export const ocrWithGemini = async (buffer, mimetype, options = {}) => {
    const apiKey = resolveApiKey(options)
    const mime = mimetype || "application/pdf"
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: process.env.KB_OCR_MODEL || "gemini-2.5-flash" })

    const result = await model.generateContent([
        { text: OCR_PROMPT },
        {
            inlineData: {
                mimeType: mime,
                data: Buffer.from(buffer).toString("base64")
            }
        }
    ])
    const text = String(result?.response?.text?.() || "").trim()
    if (!text || text === "EMPTY") return ""
    return text
}
