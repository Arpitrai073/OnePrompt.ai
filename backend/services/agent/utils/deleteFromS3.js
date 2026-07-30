import { DeleteObjectCommand } from "@aws-sdk/client-s3"
import { s3 } from "../config/s3.js"

export const deleteFromS3 = async (key) => {
    if (!key || String(key).startsWith("http")) return
    await s3.send(new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key
    }))
}
