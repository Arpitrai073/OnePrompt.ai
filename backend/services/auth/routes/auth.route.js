import express from "express"
import { deductCredits, login, logOut, updateUserPayment } from "../controllers/auth.controller.js"
import { createApiKey, getUsageByRequestId, listApiKeys, listUsage, logUsage, resolveApiKey, revokeApiKey, rotateApiKey, updateApiKey } from "../controllers/apiKey.controller.js"
import { getByok, resolveByok, saveByok } from "../controllers/byok.controller.js"
import { getOrg, inviteMember, joinOrg, removeMember, updateOrg } from "../controllers/org.controller.js"
import { ackWebhook, createJob, dueWebhooks, enqueueWebhook, getJob, listJobs, updateJob } from "../controllers/job.controller.js"
import { exportAudit } from "../controllers/audit.controller.js"
import { createDocument, deleteDocument, getDocument, listDocuments, updateDocumentStatus } from "../controllers/document.controller.js"
import { createKnowledgeBase, deleteKnowledgeBase, listKnowledgeBases } from "../controllers/knowledgeBase.controller.js"
import { requireInternalToken } from "../../../shared/internalAuth.js"

const router = express.Router()

router.post("/login", login)
router.get("/logout", logOut)
router.post("/update-plan", requireInternalToken, updateUserPayment)
router.post("/deduct-credits", requireInternalToken, deductCredits)
router.post("/keys", requireInternalToken, createApiKey)
router.get("/keys", requireInternalToken, listApiKeys)
router.post("/keys/:id", requireInternalToken, updateApiKey)
router.post("/keys/:id/revoke", requireInternalToken, revokeApiKey)
router.post("/keys/:id/rotate", requireInternalToken, rotateApiKey)
router.get("/usage", requireInternalToken, listUsage)
router.get("/usage/:requestId", requireInternalToken, getUsageByRequestId)
router.get("/audit", requireInternalToken, exportAudit)
router.get("/byok", requireInternalToken, getByok)
router.post("/byok", requireInternalToken, saveByok)
router.get("/org", requireInternalToken, getOrg)
router.post("/org", requireInternalToken, updateOrg)
router.post("/org/invite", requireInternalToken, inviteMember)
router.post("/org/join", requireInternalToken, joinOrg)
router.post("/org/members/:id/remove", requireInternalToken, removeMember)
router.get("/jobs", requireInternalToken, listJobs)
router.get("/jobs/:jobId", requireInternalToken, getJob)
router.get("/knowledge-bases", requireInternalToken, listKnowledgeBases)
router.post("/knowledge-bases", requireInternalToken, createKnowledgeBase)
router.delete("/knowledge-bases/:id", requireInternalToken, deleteKnowledgeBase)
router.post("/knowledge-bases/:id/delete", requireInternalToken, deleteKnowledgeBase)
router.post("/documents", requireInternalToken, createDocument)
router.get("/documents", requireInternalToken, listDocuments)
router.get("/documents/:id", requireInternalToken, getDocument)
router.delete("/documents/:id", requireInternalToken, deleteDocument)
router.post("/documents/:id/delete", requireInternalToken, deleteDocument)
router.post("/internal/documents/:id", requireInternalToken, updateDocumentStatus)
router.post("/internal/resolve-api-key", requireInternalToken, resolveApiKey)
router.post("/internal/log-usage", requireInternalToken, logUsage)
router.post("/internal/byok-credentials", requireInternalToken, resolveByok)
router.post("/internal/jobs", requireInternalToken, createJob)
router.post("/internal/jobs/:jobId", requireInternalToken, updateJob)
router.post("/internal/webhooks", requireInternalToken, enqueueWebhook)
router.get("/internal/webhooks/due", requireInternalToken, dueWebhooks)
router.post("/internal/webhooks/:id/ack", requireInternalToken, ackWebhook)

export default router
