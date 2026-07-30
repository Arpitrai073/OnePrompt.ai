import express from "express"
import { agent } from "../controllers/agent.controller.js"
import { signUrls } from "../controllers/sign.controller.js"
import { ingestKbDocument } from "../controllers/kbIngest.controller.js"
import { deleteKbDocument } from "../controllers/kbDelete.controller.js"
import multer from "../config/multer.js"

const router=express.Router()

router.post("/chat",multer.single("file"),agent)
router.post("/sign-urls",signUrls)
router.post("/kb/ingest",multer.single("file"),ingestKbDocument)
router.post("/kb/delete",deleteKbDocument)

export default router