import express from "express"
import dotenv from "dotenv"
import proxy from "express-http-proxy"
import multer from "multer"
dotenv.config()
import cors from "cors"
import cookieParser from "cookie-parser"
import { getCurrentUser } from "./controllers/user.controller.js"
import { runApi } from "./controllers/run.controller.js"
import { getRunFiles } from "./controllers/files.controller.js"
import { getJob } from "./controllers/jobs.controller.js"
import { getAudit } from "./controllers/audit.controller.js"
import { createPublicDocument, deletePublicDocument, getPublicDocument, listPublicDocuments } from "./controllers/documents.controller.js"
import { createPublicKnowledgeBase, deletePublicKnowledgeBase, listPublicKnowledgeBases } from "./controllers/knowledgeBases.controller.js"
import { startWebhookWorker } from "./utils/webhookWorker.js"
import protect from "./middleware/auth.middleware.js"
import { proxyWithHeader } from "./utils/proxyWithHeader.js"
import morgan from "morgan"

const port = process.env.PORT
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 }
})

const parseRunBody = (req, res, next) => {
    const contentType = req.headers["content-type"] || ""
    if (contentType.includes("multipart/form-data")) {
        return upload.single("file")(req, res, next)
    }
    return express.json()(req, res, next)
}

const protectUnlessAuthPublic = (req, res, next) => {
    if (req.path === "/login" || req.path === "/logout") {
        return next()
    }
    return protect(req, res, next)
}

const proxyAuth = (req, res, next) => {
    if (req.path === "/login" || req.path === "/logout") {
        return proxy(process.env.AUTH_SERVICE)(req, res, next)
    }
    return proxyWithHeader(process.env.AUTH_SERVICE)(req, res, next)
}

const app = express()
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}))
app.use(morgan("dev"))
app.use(cookieParser())
app.use("/api/auth", protectUnlessAuthPublic, proxyAuth)
app.use("/api/chat", protect, proxyWithHeader(process.env.CHAT_SERVICE))
app.use("/api/agent", protect, proxyWithHeader(process.env.AGENT_SERVICE))
app.use("/api/billing", protect, proxyWithHeader(process.env.BILLING_SERVICE))
app.get("/api/me", protect, getCurrentUser)
app.post("/v1/run", protect, parseRunBody, runApi)
app.get("/v1/files/:requestId", protect, getRunFiles)
app.get("/v1/jobs/:jobId", protect, getJob)
app.get("/v1/audit", protect, getAudit)
app.get("/v1/knowledge-bases", protect, listPublicKnowledgeBases)
app.post("/v1/knowledge-bases", protect, express.json(), createPublicKnowledgeBase)
app.delete("/v1/knowledge-bases/:id", protect, deletePublicKnowledgeBase)
app.get("/v1/documents", protect, listPublicDocuments)
app.get("/v1/documents/:docId", protect, getPublicDocument)
app.post("/v1/documents", protect, upload.single("file"), createPublicDocument)
app.delete("/v1/documents/:docId", protect, deletePublicDocument)
app.get("/", (req, res) => {
    res.json({ message: "hello from gateway v5" })
})

app.listen(port, () => {
    console.log(`gateway started at ${port}`)
    startWebhookWorker()
})
