import { checkAgentLimit } from "../config/agentLimit.js"
import { searchTool } from "../config/tavily.js"
import { deductCredits } from "../utils/deductCredits.js"
import { rethrowOrFail } from "../../../shared/internalAuth.js"
export const searchAgent = async (state) => {
    try {
        await checkAgentLimit(state.userId, "search", state.keyId)
        await deductCredits(state.userId, "search", state.billingMode, state.keyId)
        const results = await searchTool.invoke({
            query: state.prompt
        })
        console.log(results)
        return {
            ...state,
            searchResults: results,
            images: results.images
        }
    } catch (error) {
        console.log(error)
        rethrowOrFail(error, "failed to search")
    }
}