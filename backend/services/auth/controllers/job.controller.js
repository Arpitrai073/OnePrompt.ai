import ApiJob from "../models/apiJob.model.js"
import WebhookEvent from "../models/webhookEvent.model.js"
import { getOrgContext } from "../utils/orgAccess.js"

export const createJob = async (req, res) => {
    try {
        const doc = await ApiJob.create(req.body)
        return res.status(201).json(doc)
    } catch (error) {
        return res.status(500).json({ error: "job_create_failed", message: `${error}` })
    }
}

export const updateJob = async (req, res) => {
    try {
        const doc = await ApiJob.findOneAndUpdate(
            { jobId: req.params.jobId },
            req.body,
            { new: true }
        )
        if (!doc) {
            return res.status(404).json({ error: "job_not_found" })
        }
        return res.status(200).json(doc)
    } catch (error) {
        return res.status(500).json({ error: "job_update_failed", message: `${error}` })
    }
}

export const getJob = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"]
        const { org } = await getOrgContext(userId)
        const doc = await ApiJob.findOne({
            jobId: req.params.jobId,
            $or: [{ userId: String(userId) }, { orgId: String(org._id) }]
        })
        if (!doc) {
            return res.status(404).json({ error: "job_not_found" })
        }
        return res.status(200).json(doc)
    } catch (error) {
        return res.status(500).json({ error: "job_read_failed", message: `${error}` })
    }
}

export const listJobs = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"]
        const { org } = await getOrgContext(userId)
        const rows = await ApiJob.find({
            $or: [{ userId: String(userId) }, { orgId: String(org._id) }]
        }).sort({ createdAt: -1 }).limit(20)
        return res.status(200).json(rows)
    } catch (error) {
        return res.status(500).json({ error: "job_list_failed", message: `${error}` })
    }
}

export const enqueueWebhook = async (req, res) => {
    try {
        if (!req.body?.url) {
            return res.status(200).json({ ok: true, skipped: true })
        }
        const doc = await WebhookEvent.create({
            url: req.body.url,
            payload: req.body.payload,
            requestId: req.body.requestId,
            jobId: req.body.jobId,
            nextRetryAt: new Date()
        })
        return res.status(201).json(doc)
    } catch (error) {
        return res.status(500).json({ error: "webhook_enqueue_failed", message: `${error}` })
    }
}

export const dueWebhooks = async (req, res) => {
    try {
        const rows = await WebhookEvent.find({
            status: "pending",
            nextRetryAt: { $lte: new Date() }
        }).limit(20)
        return res.status(200).json(rows)
    } catch (error) {
        return res.status(500).json({ error: "webhook_due_failed", message: `${error}` })
    }
}

const backoffMs = [30_000, 120_000, 600_000, 3_600_000, 10_800_000]

export const ackWebhook = async (req, res) => {
    try {
        const doc = await WebhookEvent.findById(req.params.id)
        if (!doc) {
            return res.status(404).json({ error: "webhook_not_found" })
        }
        if (req.body?.delivered) {
            doc.status = "delivered"
            doc.lastError = ""
        } else {
            doc.attempts += 1
            doc.lastError = req.body?.error || "delivery_failed"
            if (doc.attempts >= doc.maxAttempts) {
                doc.status = "failed"
            } else {
                doc.nextRetryAt = new Date(Date.now() + (backoffMs[doc.attempts - 1] || 3_600_000))
            }
        }
        await doc.save()
        return res.status(200).json(doc)
    } catch (error) {
        return res.status(500).json({ error: "webhook_ack_failed", message: `${error}` })
    }
}
