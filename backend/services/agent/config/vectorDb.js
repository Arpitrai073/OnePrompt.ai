import { QdrantVectorStore } from "@langchain/qdrant"
import { embeddings as defaultEmbeddings } from "./embeddings.js"
import dotenv from "dotenv"
dotenv.config()

export const vectorStore = async (docs, collectionName, embedder = defaultEmbeddings) => {
    return await QdrantVectorStore.fromDocuments(docs, embedder, {
        url: process.env.QDRANT_URL,
        apiKey: process.env.QDRANT_API_KEY,
        collectionName
    })
}
