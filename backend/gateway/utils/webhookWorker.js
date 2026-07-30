import axios from "axios"
import { internalHeaders } from "../../shared/internalAuth.js"

const deliver = async (event) => {
    try {
        const res = await fetch(event.url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(event.payload),
            signal: AbortSignal.timeout(5000)
        })
        await axios.post(
            `${process.env.AUTH_SERVICE}/internal/webhooks/${event._id}/ack`,
            { delivered: res.ok, error: res.ok ? "" : `http_${res.status}` },
            { headers: internalHeaders() }
        )
    } catch (error) {
        await axios.post(
            `${process.env.AUTH_SERVICE}/internal/webhooks/${event._id}/ack`,
            { delivered: false, error: error.message },
            { headers: internalHeaders() }
        ).catch(() => {})
    }
}

export const flushWebhooks = async () => {
    try {
        const { data } = await axios.get(
            `${process.env.AUTH_SERVICE}/internal/webhooks/due`,
            { headers: internalHeaders() }
        )
        for (const event of data || []) {
            await deliver(event)
        }
    } catch (error) {
        if (error?.response?.status !== 401) {
            console.log("webhook flush", error?.message)
        }
    }
}

export const startWebhookWorker = () => {
    setInterval(flushWebhooks, 15000)
    setTimeout(flushWebhooks, 3000)
}
