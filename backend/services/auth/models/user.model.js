import mongoose from "mongoose";

const userSchema=new mongoose.Schema({
    firebaseUid:{
        type:String,
        unique:true
    },
    name:String,
    email:String,
    avatar:String,
    plan:{
        type:String,
        default:"free"
    },
    credits:{
        type:Number,
        default:100
    },
    totalCredits:{
        type:Number,
        default:100
    },
    planExpiresAt:Date,
    byokEnabled:{
        type:Boolean,
        default:false
    },
    apiPlan:{
        type:String,
        default:"free"
    },
    apiCredits:{
        type:Number,
        default:100
    },
    apiPlanExpiresAt:Date

},{
    timestamps:true
})

const User=mongoose.model("User",userSchema)
export default User