
import api from '../../utils/axios'

async function sendMessage(payload) {
 try {
    const {data}=await api.post("/api/agent/chat",payload)
    return data
 } catch (error) {
    console.log(error)
    return {
        error: true,
        status: error?.response?.status,
        message: error?.response?.data?.message || error?.response?.data?.error || "Request failed"
    }
 }
}

export default sendMessage
