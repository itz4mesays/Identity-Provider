import { Request, Response } from "express";
import AuthInterface from "../interfaces/auth.interface";
import { handleError, successResponse } from "../utils/responseHandler";
import prisma from "../utils/client";
import { passwordRequestSchema, resetPasswordValidation, validateUserPayload } from "../validations/form_validations";
import { getPasswordResetToken, getUserByTaxId, storePasswordToken, updateUserData } from "../services/account.service";
import { EmailService } from "../services/email.service";
import { generateVerificationCode, hashPassword } from "../utils/helpers";
import { retryTransaction } from "../utils/retry.transaction";

export default class AuthController implements AuthInterface {

    forgotPassword = async (req: Request, res: Response): Promise<Response> => {
        try {
            //validate form request
            const { error, value } = passwordRequestSchema.validate(req.body, { abortEarly: false })

            if (error)
                return handleError(res, 422, error.details[0].message);

            //check if tax id exist
            const user = await getUserByTaxId(value.tax_id)

            if (!user)
                return handleError(res, 400, "Sorry, we are unable to match your tax id")

            if (!user.email_address || user.email_address === null)
                return handleError(res, 400, "Sorry, we could not find any associated email address")

            const code = generateVerificationCode(7)

            // Send password request email
            await EmailService.sendPasswordRequest({
                email: user.email_address,
                code: code
            });

            //Save into Password  Reset Token
            await storePasswordToken({
                tax_id: user.tax_id,
                reset_token: code
            })

            return successResponse(
                res,
                200,
                {},
                `Success, a mail containing next step has been sent to your registered email, ${user.email_address}`)
        } catch (error) {
            return handleError(res, 500, error)
        }
    }

    resendToken = async (req: Request, res: Response): Promise<Response> => {
        try {
            //validate form request
            const { error, value } = passwordRequestSchema.validate(req.body, { abortEarly: false })

            if (error)
                return handleError(res, 422, error.details[0].message);

            //check if tax id exist
            const user = await getUserByTaxId(value.tax_id)

            if (!user)
                return handleError(res, 400, "Sorry, we are unable to match your tax id")

            if (!user.email_address || user.email_address === null)
                return handleError(res, 400, "Sorry, we could not find any associated email address")

            const code = generateVerificationCode(7)

            //Delete if any existing code
            await prisma.passwordResetToken.delete({
                where: { tax_id: user.tax_id }
            })

            // Send password request email
            await EmailService.sendPasswordRequest({
                email: user.email_address,
                code: code
            });

            //Save into Password  Reset Token
            await storePasswordToken({
                tax_id: user.tax_id,
                reset_token: code
            })

            return handleError(res, 400, `New Password Reset Token has been sent to ${user.email_address}`)
        } catch (error) {
            return handleError(res, 500, error)
        }
    }

    completeForgotPassword = async (req: Request, res: Response): Promise<Response> => {
        try {
            const { error, value } = resetPasswordValidation.validate(req.body, { abortEarly: false });
            if (error)
                return handleError(res, 422, error.details[0].message);

            //Get User with Password Reset Token to Verify data
            const userByToken = await getPasswordResetToken(value.password_reset_token)
            if (!userByToken)
                return handleError(res, 404, "Invalid password reset token.")

            // Hash the password with the salt
            const hashedPassword: string = await hashPassword(value.new_password, 10)

            const user = await getUserByTaxId(userByToken.tax_id)

            if (!user)
                return handleError(res, 404, "Sorry, we could not any user of such record")

            // Send password request email
            await EmailService.passwordSuccessfullyChanged({
                email: user?.email_address
            });

            //update password
            const result = await retryTransaction(async (tx) => {
                //Update New Password
                const updatePassword = await updateUserData({
                    password: hashedPassword,
                    email_address: value.email_address
                }, user.id); // user comes from outer scope


                //Delete from Password Reset Token
                await prisma.passwordResetToken.delete({
                    where: { tax_id: userByToken.tax_id }
                })

                return updatePassword

            })

            return successResponse(res, 200, {}, "Password reset successful. You can now log in with your new password.")
        } catch (error) {
            return handleError(res, 500, error)
        }
    }

    createAuthDetails = async (req: Request, res: Response): Promise<Response> => {
        try {
            console.log(`Data received from sp`, req.body)
            const { error, value } = validateUserPayload.validate(req.body, { abortEarly: false })
            if (error) {
                console.log(`Validation error`, error)
                return handleError(res, 422, error.details[0].message)
            }

            //check if tax_id has already been registered
            const verifyID = await prisma.user.findFirst({
                where: { tax_id: value.tax_id }
            })
            if (verifyID)
                return handleError(res, 409, `Sorry, this ${value.tax_id} has already been registered`)

            const user = await prisma.user.create({
                data: {
                    tax_id: value.tax_id,
                    password: value.password,
                    date_of_birth: new Date(value.date_of_birth),
                    role: value.role,
                    identification_type: value.tax_pay_type,
                    identification_value: value.identification_value,
                    email_address: value.email_address
                }
            })
            return successResponse(res, 200, user, "Auth Details created successfully")
        } catch (error) {
            console.log(`Internal error`, error)
            return handleError(res, 500, error)
        }
    }

}