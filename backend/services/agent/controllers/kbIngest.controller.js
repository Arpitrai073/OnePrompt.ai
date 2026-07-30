import fs from "fs"
import axios from "axios"
import { Document } from "@langchain/core/documents"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { getEmbeddings } from "../config/embeddings.js"
import { upsertKbChunks } from "../config/vectorKb.js"
import { checkAgentLimit } from "../config/agentLimit.js"
import { deductCredits } from "../utils/deductCredits.js"
import { uploadToS3 } from "../utils/uploadToS3.js"
import { resolveOrgId } from "../utils/resolveOrgId.js"
import { extractTextFromBuffer, extensionFor, isKbDocumentMime } from "../utils/extractText.js"
import { internalHeaders } from "../../../shared/internalAuth.js"
import { requiredProvidersFor } from "../../../shared/cryptoByok.js"

const loadByok = async (userId, file) => {
    const { data } = await axios.post(
        `${process.env.AUTH_SERVICE}/internal/byok-credentials`,
        { userId },
        { headers: internalHeaders() }
    )
    const keys = data?.keys || {}
    const missing = requiredProvidersFor("kbIngest", file).filter((name) => !keys[name])
    if (missing.length) {
        const err = new Error(`BYOK is on but missing keys: ${missing.join(", ")}`)
        err.status = 400
        err.data = { ok: false, error: "missing_provider_key", providers: missing, message: err.message }
        throw err
    }
    return keys
}

export const ingestKbDocument = async (req, res, next) => {
    const file = req.file
    try {
        const userId = req.headers["x-user-id"] || req.body?.userId
        const keyId = req.headers["x-api-key-id"] || req.body?.keyId
        const billingMode = req.headers["x-billing-mode"] === "byok" ? "byok" : "platform"
        const docId = String(req.body?.docId || "")
        const filename = String(req.body?.filename || file?.originalname || "document.pdf")
        const kbId = String(req.body?.kbId || "")
        const kbSlug = String(req.body?.kbSlug || "default")
        if (!userId || !docId) {
            return res.status(400).json({ ok: false, error: "invalid_request", message: "docId and user are required" })
        }
        if (!file || !isKbDocumentMime(file.mimetype, filename)) {
            return res.status(400).json({ ok: false, error: "invalid_request", message: "Upload a PDF, DOCX, or TXT file." })
        }

        const orgId = await resolveOrgId({
            orgId: req.headers["x-org-id"] || req.body?.orgId,
            userId
        })
        if (!orgId) {
            return res.status(400).json({ ok: false, error: "org_required", message: "Workspace is required." })
        }

        let providerKeys = {}
        if (billingMode === "byok") {
            providerKeys = await loadByok(userId, file)
        }

        await checkAgentLimit(userId, "kbIngest", keyId)
        await deductCredits(userId, "kbIngest", billingMode, keyId)

        const buffer = fs.readFileSync(file.path)
        const text = await extractTextFromBuffer(buffer, file.mimetype, filename)
        if (!text) {
            const err = new Error("Could not extract text from this file.")
            err.status = 400
            err.data = { ok: false, error: "empty_document", message: err.message }
            throw err
        }

        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200
        })
        const rawDocs = await splitter.createDocuments([text])
        const docs = rawDocs.map((doc, index) => new Document({
            pageContent: doc.pageContent,
            metadata: {
                orgId: String(orgId),
                kbId: String(kbId),
                kbSlug,
                docId: String(docId),
                filename,
                chunkIndex: index
            }
        }))

        const ext = extensionFor(file.mimetype, filename)
        const s3Key = `kb/${orgId}/${kbSlug}/${docId}.${ext}`
        await uploadToS3(s3Key, buffer, file.mimetype || "application/octet-stream")
        await upsertKbChunks(docs, orgId, getEmbeddings({ billingMode, providerKeys }), kbSlug)

        const pageEstimate = Math.max(1, Math.ceil(text.length / 3000))
        return res.status(200).json({
            ok: true,
            docId,
            orgId,
            kbId,
            kbSlug,
            filename,
            s3Key,
            chunkCount: docs.length,
            pageEstimate,
            billingMode
        })
    } catch (error) {
        next(error)
    } finally {
        if (file?.path) {
            fs.unlink(file.path, () => {})
        }
    }
}
