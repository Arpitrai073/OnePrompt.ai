import { QdrantClient } from "@qdrant/js-client-rest"
import { QdrantVectorStore } from "@langchain/qdrant"
import dotenv from "dotenv"
dotenv.config()

const safePart = (value, max = 48) => String(value || "anon").replace(/[^a-zA-Z0-9]/g, "").slice(0, max) || "anon"

/** Default slug keeps legacy collection name kb-{orgId}; named KBs use kb-{orgId}-{slug}. */
export const kbCollectionName = (orgId, kbSlug = "default") => {
    const org = safePart(orgId)
    const slug = String(kbSlug || "default").toLowerCase().replace(/[^a-z0-9-]/g, "") || "default"
    if (slug === "default") return `kb-${org}`
    return `kb-${org}-${safePart(slug, 32)}`
}

const qdrantOptions = () => ({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY
})

export const qdrantClient = () => new QdrantClient(qdrantOptions())

export const collectionExists = async (collectionName) => {
    try {
        await qdrantClient().getCollection(collectionName)
        return true
    } catch {
        return false
    }
}

export const upsertKbChunks = async (docs, orgId, embedder, kbSlug = "default") => {
    const collectionName = kbCollectionName(orgId, kbSlug)
    const opts = { ...qdrantOptions(), collectionName }
    if (await collectionExists(collectionName)) {
        const store = await QdrantVectorStore.fromExistingCollection(embedder, opts)
        await store.addDocuments(docs)
        return collectionName
    }
    await QdrantVectorStore.fromDocuments(docs, embedder, opts)
    return collectionName
}

const metadataFilter = (field, value) => ({
    should: [
        { key: field, match: { value: String(value) } },
        { key: `metadata.${field}`, match: { value: String(value) } }
    ]
})

export const searchKb = async (query, orgId, embedder, k = 8, kbSlug = "default") => {
    const collectionName = kbCollectionName(orgId, kbSlug)
    if (!(await collectionExists(collectionName))) {
        return null
    }
    const store = await QdrantVectorStore.fromExistingCollection(embedder, {
        ...qdrantOptions(),
        collectionName
    })
    try {
        return await store.similaritySearch(query, k, metadataFilter("orgId", orgId))
    } catch {
        return store.similaritySearch(query, k)
    }
}

export const deleteKbDoc = async (orgId, docId, kbSlug = "default") => {
    const collectionName = kbCollectionName(orgId, kbSlug)
    if (!(await collectionExists(collectionName))) {
        return { deleted: false, collectionName }
    }
    await qdrantClient().delete(collectionName, {
        wait: true,
        filter: metadataFilter("docId", docId)
    })
    return { deleted: true, collectionName }
}

export const listPdfRagCollections = async () => {
    const client = qdrantClient()
    const result = await client.getCollections()
    return (result.collections || []).map((c) => c.name).filter((name) => /^pdf-/.test(name))
}

export const deleteCollection = async (collectionName) => {
    if (!collectionName || String(collectionName).startsWith("kb-")) {
        return false
    }
    await qdrantClient().deleteCollection(collectionName)
    return true
}
