export const CREDIT_COST = {
    chat: 1,
    search: 5,
    coding: 10,
    pdf: 10,
    ppt: 10,
    vision: 10,
    pdfRag: 10,
    imageAnalyzer: 10,
    image: 10,
    kb: 10,
    kbIngest: 10,
    auto: 1
}

export const BYOK_CREDIT_COST = {
    chat: 1,
    search: 1,
    coding: 1,
    pdf: 2,
    ppt: 2,
    vision: 2,
    pdfRag: 2,
    imageAnalyzer: 1,
    image: 2,
    kb: 2,
    kbIngest: 2,
    auto: 1
}

export const creditsForAgent = (agent, billingMode = "platform") => {
    const table = billingMode === "byok" ? BYOK_CREDIT_COST : CREDIT_COST
    return table[agent] || 1
}
