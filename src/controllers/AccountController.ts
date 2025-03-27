import { Request, Response } from "express";
import ProfileInterface from "../interfaces/profile.interface";
import { handleError, successResponse } from "../utils/responseHandler";
import { retryTransaction } from "../utils/retry.transaction";
import { signupSchema, validateUserPayload } from "../validations/form_validations";
import { initialRegistration, getUserByTaxId, updateUserData, getUserByVerificationCode, createIndividual, singleInvididual } from "../services/account.service";
import { buildPaginationParams, generateRandomDigitNumber, generateStrongPassword, hashPassword } from "../utils/helpers";
import { GenderTypes, MaritalStatus, Prisma, UserRoles } from "@prisma/client";
import { encrypt } from "../utils/crypto";
import { buildCompleteSignupData, buildInitialRegData } from "../utils/form.helper";
import { EmailService } from "../services/email.service";
import { PaginatedResult } from "../utils/types";
import prisma from "../utils/client";

export default class AccountController implements ProfileInterface {
    registerIndividual = async (req: Request, res: Response): Promise<Response> => {
        try {
            //validate form request
            const { error, value } = validateUserPayload.validate(req.body, { abortEarly: false })

            if (error) return handleError(res, 422, error.details[0].message);

            // Check if the taxId already exists
            const checkUser = await getUserByTaxId(value.tax_id)

            //Generate Verification Code - 15 digits
            const verification: string = generateRandomDigitNumber(15)

            //check if taxId has not been registered
            if (checkUser && checkUser.verification_code === null) {
                return handleError(res, 409, `This ${value.tax_id} has already been registered`)
            } else if (checkUser && checkUser.verification_code !== null) {
                //update verification code
                const updateVerifyCode = await updateUserData({
                    verification_code: verification
                }, checkUser.id)

                //Get Update user details
                const { password, ...rest } = updateVerifyCode
                return successResponse(res, 200, rest, "Please proceed to complete your signup process")
            }

            if (checkUser?.identification_value === value.identification_value)
                return handleError(res, 409, `${checkUser.identification_type} is already in use`)

            // //temporarily save password
            const hashedPassword = await hashPassword(value.identification_value, 10)

            const prepData = buildInitialRegData(
                value,
                hashedPassword,
                verification,
                UserRoles.Individual
            )

            const user = await initialRegistration(prepData)

            const { password, ...rest } = user

            return successResponse(res, 201, rest, "You have successfully initiated your registration. Please complete your sign up process.")
        } catch (error) {
            return handleError(res, 500, error)
        }
    }

    registerBusiness = async (req: Request, res: Response): Promise<Response> => {
        try {
            //validate form request
            // const { error, value } = validateBusinessPayload.validate(req.body, { abortEarly: false })

            // if (error) return handleError(res, 422, error.details[0].message);

            // Check if the email already exists
            // const existingUser = await getUserByTaxId(value.tax_id)

            // if (existingUser) return handleError(res, 409, "Email Address is already in use")

            // const hashedPassword = await hashPassword(value.password, 10)

            // const result = await retryTransaction(async (tx) => {
            //     //Create login details
            //     const authDetails = await initialRegistration({
            //         email: value.email,
            //         password: hashedPassword,
            //         role: UserRoles.Business
            //     })

            //     //unset password_hash from the object
            //     const { password, ...rest } = authDetails

            //     //Register User
            //     // const user = await createUserProfile({
            //     //     user_id: authDetails.id,
            //     //     name: value.name,
            //     //     phone_number: value.phone_number,
            //     //     description: value.description,
            //     //     website: value.website ?? null,
            //     //     address: value.address ?? null,
            //     //     industry: value.industry ?? null
            //     // })

            //     return { rest }
            // })
            return successResponse(res, 201, {}, "Business has been registered successfully")
        } catch (error) {
            return handleError(res, 500, error)
        }
    }

    completeSignup = async (req: Request, res: Response): Promise<Response> => {
        try {
            //validate form request
            const { error, value } = signupSchema.validate(req.body, { abortEarly: false })

            if (error)
                return handleError(res, 422, error.details[0].message);

            //check if verification code exist
            const user = await getUserByVerificationCode(value.verification_code)
            if (!user)
                return handleError(res, 404, "Sorry, we could not verify the verification code")

            //check if tax id matches
            if (user.tax_id !== value.tax_id)
                return handleError(res, 400, "Sorry, we are unable to verify your tax id as it does not match")

            const buildSignUpData = buildCompleteSignupData(value)
            const password = await generateStrongPassword({ includeSymbols: false })
            const temporaryPassword = await hashPassword(password, 10)

            // Send registration confirmation email
            await EmailService.sendRegistrationEmail({
                email: value.email_address,
                tax_id: value.tax_id,
                password: password // Use temporary password if available
            });

            const result = await retryTransaction(async (tx) => {
                const individual = await createIndividual(buildSignUpData)

                //update user table
                await updateUserData({
                    verification_code: null,
                    password: temporaryPassword,
                    email_address: value.email_address
                }, user.id); // user comes from outer scope

                return individual
            })

            return successResponse(
                res,
                200,
                result,
                "Congratulation, your registration has been completed"
            )
        } catch (error) {
            return handleError(res, 500, error)
        }
    }

    getAllIndividuals = async (req: Request, res: Response): Promise<Response> => {
        try {
            const queryParams = buildPaginationParams(res, req)
            const search = queryParams.search

            // Extract valid enum values for filtering
            const validGender = Object.values(GenderTypes);
            const validMaritalStatus = Object.values(MaritalStatus);

            // Define filters for gender and marital status
            const genderSearcch = search && validGender.includes(search as GenderTypes)
                ? { gender: { equals: search as GenderTypes } }
                : undefined;

            const maritalSearch = search && validMaritalStatus.includes(search as MaritalStatus)
                ? { marital_status: { equals: search as MaritalStatus } }
                : undefined;

            // Define the base where clause
            const whereClause: Prisma.IndividualWhereInput = {
                AND: [
                    // Always include this (no conditions)
                    {},
                    // Only apply these if search is provided
                    ...(search ? [
                        {
                            OR: [
                                { tax_id: { contains: search } },
                                { firstname: { contains: search } },
                                { surname: { contains: search } },
                                { business_type: { contains: search } },
                                { email_address: { contains: search } },
                                { occupation: { contains: search } },
                                ...(genderSearcch ? [genderSearcch] : []),
                                ...(maritalSearch ? [maritalSearch] : []),
                            ].filter(Boolean)
                        }
                    ] : [])
                ]
            };

            // Define the query options
            const options: Prisma.IndividualFindManyArgs = {
                select: {
                    id: true,
                    tax_id: true,
                    firstname: true,
                    surname: true,
                    othernames: true,
                    gender: true,
                    marital_status: true,
                    email_address: true,
                    phone_number: true,
                    date_of_birth: true,
                    kaadi_igbeayo_no: true,
                    business_type: true,
                    created_at: true,
                },
                take: queryParams.records_per_page,
                skip: queryParams.offset,
                orderBy: {
                    created_at: Prisma.SortOrder.desc,
                },
                where: whereClause,
            };

            // Fetch total records and paginated gigs
            const totalRecords = await prisma.individual.count({ where: whereClause });
            const individuals = await prisma.individual.findMany(options);
            const pages = Math.ceil(totalRecords / queryParams.records_per_page);

            // Define pagination result
            const pagination: PaginatedResult = {
                total: totalRecords,
                current: queryParams.current_page,
                from: queryParams.offset + 1,
                to: Math.min(queryParams.offset + queryParams.records_per_page, totalRecords),
                pages: pages,
            };

            // Return success response
            return successResponse(res, 200, { individuals, pagination }, "Individuals records retrieved successfully");

        } catch (error) {
            return handleError(res, 500, error)
        }
    }

    getSingleIndividual = async (req: Request, res: Response): Promise<Response> => {
        try {
            const { type, value } = req.query
            if (!type && !value)
                return handleError(res, 400, "Sorry, type and value parameters are missing from the route")

            // Validate the type parameter
            if (type !== 'tax_id' && type !== 'id')
                return handleError(res, 400, "The type parameter must be either 'tax_id' or 'id'");

            const individual = await singleInvididual(type, value)

            if (!individual)
                return handleError(res, 404, "Sorry, we could not find any associated record")

            return successResponse(res, 200, individual, "Single Individual has been fetched")
        } catch (error) {
            return handleError(res, 500, error)
        }
    }
}