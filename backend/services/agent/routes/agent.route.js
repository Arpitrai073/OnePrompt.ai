import express from "express"
import { agent } from "../controllers/agent.controller.js"
import { signUrls } from "../controllers/sign.controller.js"
import multer from "../config/multer.js"

const router=express.Router()

router.post("/chat",multer.single("file"),agent)
router.post("/sign-urls",signUrls)

export default router