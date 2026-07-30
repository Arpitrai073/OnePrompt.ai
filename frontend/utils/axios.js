import axios from "axios";

const api=axios.create({
    // Empty string = same origin (nginx on EC2). Set VITE_SERVER_URL for local/dev.
    baseURL: import.meta.env.VITE_SERVER_URL || "",
    withCredentials:true
})

export default api

