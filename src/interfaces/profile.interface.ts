import { Request, Response } from "express"

export default interface ProfileInterface {
    registerIndividual(req: Request, res: Response): Promise<Response>,
    completeSignup(req: Request, res: Response): Promise<Response>,
    registerBusiness(req: Request, res: Response): Promise<Response>,
    getAllIndividuals(req: Request, res: Response): Promise<Response>,
    getSingleIndividual(req: Request, res: Response): Promise<Response>,
}