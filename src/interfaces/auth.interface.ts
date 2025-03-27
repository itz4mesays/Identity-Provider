import { Request, Response } from "express"

export default interface AuthInterface {
    resendToken(req: Request, res: Response): Promise<Response>,
    forgotPassword(req: Request, res: Response): Promise<Response>,
    completeForgotPassword(req: Request, res: Response): Promise<Response>,
}