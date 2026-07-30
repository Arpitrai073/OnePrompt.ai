import express from "express"
import dotenv from "dotenv"
import connectDb from "./config/db.js"
import router from "./routes/billing.route.js"
import { requireInternalToken } from "../../shared/internalAuth.js"

dotenv.config()

const port =process.env.PORT

const app=express()
app.use(express.json())
app.use(requireInternalToken)
app.use("/",router)
app.get("/",(req,res)=>{
    res.json({message:"hello from billing"})
})

app.listen(port,()=>{
    console.log(`billing started at ${port}`)
    connectDb()
})
