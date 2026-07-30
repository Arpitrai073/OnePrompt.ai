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
            if (srcReq.user?.orgId) {
                proxyReqOpts.headers["x-org-id"] = String(srcReq.user.orgId)
            }
            if (srcReq.user?.byokEnabled) {
                proxyReqOpts.headers["x-billing-mode"] = "byok"
            }
            const extras = internalHeaders()
            Object.entries(extras).forEach(([key, value]) => {
                proxyReqOpts.headers[key] = value
            })
            return proxyReqOpts
        }
    })
}
