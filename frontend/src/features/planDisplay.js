const NAMES = {
    free: "Free",
    starter: "Starter",
    pro: "Pro",
    api_starter: "API Starter",
    api_pro: "API Pro"
}

export const formatPlan = (plan) => NAMES[plan] || (plan ? String(plan).replace(/_/g, " ") : "Free")

export const accountStatus = (user) => {
    const credits = user?.credits ?? 0
    const apiCredits = user?.apiCredits ?? user?.credits ?? 0
    const playgroundPaid = Boolean(user?.plan && user.plan !== "free")
    return {
        playgroundPlan: formatPlan(user?.plan),
        apiPlan: formatPlan(user?.apiPlan),
        credits,
        apiCredits,
        badge: playgroundPaid ? formatPlan(user.plan) : `${credits} left`,
        subtitle: `${credits} chat · ${apiCredits} API`
    }
}
