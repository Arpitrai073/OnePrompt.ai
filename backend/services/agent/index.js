import express from "express"
import dotenv from "dotenv"
import connectDb from "./config/db.js"
import router from "./routes/agent.route.js"
import { requireInternalToken } from "../../shared/internalAuth.js"
import { startPdfRagCleanupWorker } from "./utils/pdfRagCleanup.js"
dotenv.config()

const port =process.env.PORT

const app=express()

app.use(express.json())
app.use(requireInternalToken)
app.use("/",router)

app.use((err,req,res,next)=>{
  console.log(err)

  if(err.status){
    return res.status(err.status).json(err.data || { ok: false, error: "agent_error", message: err.message })
  }

  return res.status(500).json({ ok: false, error: "agent_error", message: `agent error ${err}` })
})


app.get("/",(req,res)=>{
    res.json({message:"hello from agent"})
})

app.listen(port,()=>{
    console.log(`agent started at ${port}`)
    connectDb()
    startPdfRagCleanupWorker()
})
