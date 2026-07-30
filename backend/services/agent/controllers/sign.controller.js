import { getFromS3 } from "../utils/getFromS3.js"

export const signUrls = async (req, res) => {
    try {
        const keys = Array.isArray(req.body?.keys) ? req.body.keys.filter(Boolean) : []
        const files = []
        for (const key of keys) {
            if (typeof key !== "string" || key.startsWith("http")) continue
            files.push({
                key,
                url: await getFromS3(key, 24 * 60 * 60)
            })
        }
        return res.status(200).json({ files })
    } catch (error) {
        return res.status(500).json({ error: "sign_failed", message: `${error}` })
    }
}
