import { deleteCollection, listPdfRagCollections, qdrantClient } from "../config/vectorKb.js"

const ttlDays = () => {
    const n = Number(process.env.PDF_RAG_COLLECTION_TTL_DAYS || 7)
    return Number.isFinite(n) && n > 0 ? n : 7
}

const parseTimestampMs = (name) => {
    const match = String(name).match(/-(\d{10,13})$/)
    if (!match) return null
    const raw = Number(match[1])
    if (!Number.isFinite(raw)) return null
    return raw < 1e12 ? raw * 1000 : raw
}

const collectionPointCount = async (name) => {
    try {
        const info = await qdrantClient().getCollection(name)
        return Number(info?.points_count ?? info?.pointsCount ?? 0)
    } catch {
        return null
    }
}

export const cleanupPdfRagCollections = async () => {
    const cutoff = Date.now() - ttlDays() * 24 * 60 * 60 * 1000
    const names = await listPdfRagCollections()
    let deleted = 0
    for (const name of names) {
        if (String(name).startsWith("kb-")) continue
        const ts = parseTimestampMs(name)
        if (ts != null) {
            if (ts < cutoff) {
                if (await deleteCollection(name)) deleted += 1
            }
            continue
        }
        const points = await collectionPointCount(name)
        if (points === 0) {
            if (await deleteCollection(name)) deleted += 1
        }
    }
    if (deleted > 0) {
        console.log(`pdfRag cleanup: deleted ${deleted} collection(s) older than ${ttlDays()}d`)
    }
    return { scanned: names.length, deleted, ttlDays: ttlDays() }
}

export const startPdfRagCleanupWorker = () => {
    const sixHours = 6 * 60 * 60 * 1000
    setTimeout(() => {
        cleanupPdfRagCollections().catch((err) => console.log("pdfRag cleanup", err?.message))
    }, 20000)
    setInterval(() => {
        cleanupPdfRagCollections().catch((err) => console.log("pdfRag cleanup", err?.message))
    }, sixHours)
}
