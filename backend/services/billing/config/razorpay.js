import Razorpay from "razorpay"
import dotenv from "dotenv"

dotenv.config()

export const getRazorpay = () => {
    const key_id = process.env.RAZORPAY_KEY_ID
    const key_secret = process.env.RAZORPAY_KEY_SECRET
    if (!key_id || !key_secret) {
        const err = new Error("Razorpay keys are missing on the billing service.")
        err.status = 500
        throw err
    }
    return new Razorpay({ key_id, key_secret })
}

export const razorpayErrorMessage = (error) => {
    return error?.error?.description
        || error?.description
        || error?.message
        || "Razorpay could not create an order."
}

export default getRazorpay()
