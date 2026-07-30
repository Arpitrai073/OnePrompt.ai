import { getAuth } from "firebase-admin/auth"
import { app } from "../config/firebase.js"
import User from "../models/user.model.js"
import redis from "../../../shared/redis/redis.js"
import { creditsForAgent } from "../../../shared/credits.js"
import ApiKey from "../models/apiKey.model.js"
import ApiUsage from "../models/apiUsage.model.js"
import Organization from "../models/organization.model.js"

const writeSession = async (user) => {
    const sessionId = await redis.get(`user-session-${user?._id}`)
    if (!sessionId) {
        return
    }
    await redis.set(`session-${sessionId}`, JSON.stringify({
        userId: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        plan: user.plan,
        credits: user.credits,
        totalCredits: user.totalCredits,
        planExpiresAt: user.planExpiresAt,
        byokEnabled: user.byokEnabled,
        apiPlan: user.apiPlan,
        apiCredits: user.apiCredits ?? user.credits
    }), "EX", 7 * 24 * 60 * 60)
}

export const login = async (req, res) => {
    try {
        const { token } = req.body
        const decoded = await getAuth(app).verifyIdToken(token)
        let user = await User.findOne({
            firebaseUid: decoded.uid
        })

        if (!user) {
            user = await User.create({
                firebaseUid: decoded.uid,
                name: decoded.name,
                email: decoded.email,
                avatar: decoded.picture
            })
        } else if (user.apiCredits == null) {
            user.apiCredits = user.credits
            user.apiPlan = user.apiPlan || "free"
            await user.save()
        }

        const sessionId = crypto.randomUUID()
        await redis.set(`user-session-${user?._id}`,
            sessionId
            , "EX", 7 * 24 * 60 * 60)
        await redis.set(`session-${sessionId}`, JSON.stringify({
            userId: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            plan: user.plan,
            credits: user.credits,
            totalCredits: user.totalCredits,
            planExpiresAt: user.planExpiresAt,
            byokEnabled: user.byokEnabled,
            apiPlan: user.apiPlan,
            apiCredits: user.apiCredits ?? user.credits
        }), "EX", 7 * 24 * 60 * 60)




        // Set COOKIE_SECURE=true only after HTTPS is enabled (domain + cert).
        // Keep false for first HTTP deploy on EC2 public IP.
        const useSecureCookie = process.env.COOKIE_SECURE === "true"
        res.cookie("session", sessionId, {
            httpOnly: true,
            secure: useSecureCookie,
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        })

        return res.status(200).json(user)

    } catch (error) {
        return res.status(500).json({ message: `login error ${error}` })
    }
}


export const logOut = async (req, res) => {
    try {
        const sessionId = req.cookies?.session
        await redis.del(`session-${sessionId}`)

        res.clearCookie("session")
        return res.status(200).json({ message: "logout successfully" })
    } catch (error) {
        return res.status(500).json({ message: `logout error ${error}` })
    }
}


export const updateUserPayment = async (req, res) => {
    try {
        const { plan, credits, userId, wallet } = req.body
        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }
        const target = wallet || (String(plan || "").startsWith("api_") ? "api" : "playground")
        if (target === "api") {
            user.apiPlan = plan
            user.apiCredits = (user.apiCredits ?? 0) + credits
            user.apiPlanExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        } else {
            user.plan = plan
            user.credits += credits
            user.totalCredits += credits
            user.planExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
        await user.save()

        await writeSession(user)

        return res.status(200).json({ success: true })

    } catch (error) {
        return res.status(500).json({ message: `update user payment error ${error}` })
    }
}


export const deductCredits = async (req, res) => {
    try {
        const { userId, agent, billingMode, keyId } = req.body
        const user = await User.findById(userId)

        if (!user) {
            return res.status(404).json({ error: "user_not_found", message: "user not found" })
        }

        const mode = billingMode === "byok" ? "byok" : "platform"
        const requiredCredits = creditsForAgent(agent, mode)
        let billed = user
        const wallet = keyId ? "api" : "playground"

        if (keyId) {
            const key = await ApiKey.findById(keyId)
            if (key?.orgId) {
                const org = await Organization.findById(key.orgId)
                if (org?.ownerId) {
                    billed = await User.findById(org.ownerId) || user
                }
            }
            if (billed.apiCredits == null) {
                billed.apiCredits = billed.credits
            }
            if (key?.dailyCreditCap) {
                const start = new Date()
                start.setUTCHours(0, 0, 0, 0)
                const used = await ApiUsage.aggregate([
                    {
                        $match: {
                            keyId: String(keyId),
                            status: "success",
                            createdAt: { $gte: start }
                        }
                    },
                    { $group: { _id: null, total: { $sum: "$creditsUsed" } } }
                ])
                const spent = used[0]?.total || 0
                if (spent + requiredCredits > key.dailyCreditCap) {
                    return res.status(429).json({
                        error: "daily_cap_exceeded",
                        message: `This key reached its daily cap of ${key.dailyCreditCap} credits.`
                    })
                }
            }
        }

        const balance = wallet === "api" ? (billed.apiCredits ?? 0) : billed.credits
        if (balance < requiredCredits) {
            return res.status(402).json({
                error: "insufficient_credits",
                message: wallet === "api"
                    ? "Not enough API credits. Buy an API plan in Billing."
                    : "Not enough credits."
            })
        }
        if (wallet === "api") {
            billed.apiCredits -= requiredCredits
        } else {
            billed.credits -= requiredCredits
        }
        await billed.save()
        await writeSession(billed)

        return res.status(200).json({ success: true, credits: billed.credits, apiCredits: billed.apiCredits, creditsUsed: requiredCredits, wallet })
    } catch (error) {
 return res.status(500).json({ message: `deduct credits error ${error}` })
    }
}