import { NextFunction, Request, Response } from "express"
const apiHeadersMiddleware = (req: Request, res: Response, next: NextFunction) => {

    res.setHeader('Content-Type', 'application/json')
    // res.setHeader('Accept', 'application/json')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'deny')
    res.setHeader('X-XSS-Protection', 0)
    res.setHeader('Clear-Site-Data', '*')
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')

    next();
}

export default apiHeadersMiddleware;