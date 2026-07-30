import proxy from "express-http-proxy"
import { internalHeaders } from "../../shared/internalAuth.js"

export const proxyWithHeader = (serviceUrl) => {
    return proxy(serviceUrl, {
        proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
            if (srcReq.user) {
                proxyReqOpts.headers["x-user-id"] = srcReq.user.userId
            }
            if (srcReq.user?.keyId) {
                proxyReqOpts.headers["x-api-key-id"] = String(srcReq.user.keyId)
            }
            const extras = internalHeaders()
            Object.entries(extras).forEach(([key, value]) => {
                proxyReqOpts.headers[key] = value
            })
            return proxyReqOpts
        }
    })
}
