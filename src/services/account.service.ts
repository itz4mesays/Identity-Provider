import { PasswordResetToken, User } from "@prisma/client"
import prisma from "../utils/client"

export const getUserByTaxId = async (taxId: string): Promise<User | null> => {
    return await prisma.user.findUnique({
        where: { tax_id: taxId }
    })
}

export const updateUserData = async (obj: any, userId: number): Promise<User> => {
    return await prisma.user.update({
        where: { id: userId },
        data: obj
    })
}

export const getUserByVerificationCode = async (code: string): Promise<User | null> => {
    return await prisma.user.findFirst({
        where: { verification_code: code }
    })
}

export const initialRegistration = async (obj: any): Promise<User> => {
    return await prisma.user.create({
        data: obj
    })
}

export const storePasswordToken = async (obj: any): Promise<PasswordResetToken> => {
    return await prisma.passwordResetToken.create({
        data: obj
    })
}

export const getPasswordResetToken = async (token: string): Promise<PasswordResetToken | null> => {
    return await prisma.passwordResetToken.findFirst({
        where: { reset_token: String(token) }
    })
}
