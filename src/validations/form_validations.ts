import { GenderTypes, IdentificationType, MaritalStatus, Options } from '@prisma/client';
import { CompleteSignUpPayload, IndividualPayload } from './../utils/types';
import Joi from "joi"
import moment from 'moment';
import * as joiPassword from 'joi-password';


const { joiPasswordExtendCore } = joiPassword;
const extendedJoi = Joi.extend(joiPasswordExtendCore);


export const validateUserPayload = Joi.object<IndividualPayload>({
    tax_id: Joi.string()
        .custom((value, helpers) => {
            if (value.length !== 8 && value.length !== 13) {
                return helpers.error('string.length');
            }
            return value;
        })
        .required()
        .messages({
            "string.base": "Tax ID must be a string",
            "string.length": "Tax ID must be either 8 or 13 characters long",
            "any.required": "Tax ID is required"
        }),
    tax_pay_type: Joi.string().valid(IdentificationType.nin, IdentificationType.bvn).required().messages({
        "string.base": "Tax Pay Type must be a string",
        "any.only": "Tax Pay Type must be either 'nin' or 'bvn'",
        "any.required": "Tax Pay Type is required"
    }),
    identification_value: Joi.alternatives().conditional(
        Joi.ref('tax_pay_type'),
        {
            switch: [
                {
                    is: Joi.string().valid('nin'),
                    then: Joi.string()
                        .pattern(/^\d{11}$/)
                        .required()
                        .messages({
                            "string.base": "NIN must be a string",
                            "string.pattern.base": "NIN must be exactly 11 digits",
                            "any.required": "NIN is required"
                        })
                },
                {
                    is: Joi.string().valid('bvn'),
                    then: Joi.string()
                        .pattern(/^\d{11}$/)
                        .required()
                        .messages({
                            "string.base": "BVN must be a string",
                            "string.pattern.base": "BVN must be exactly 11 digits",
                            "any.required": "BVN is required"
                        })
                }
            ],
            otherwise: Joi.forbidden()
        }
    ),
    date_of_birth: Joi.date().iso().max(moment().subtract(18, 'years').toDate()).required().messages({
        "date.base": "Date of Birth must be a valid date",
        "date.format": "Date of Birth must be in ISO format (YYYY-MM-DD)",
        "date.max": "Individual must be at least 18 years old",
        "any.required": "Date of Birth is required"
    })
});

export const signupSchema = Joi.object<CompleteSignUpPayload>({
    tax_id: Joi.string()
        .required()
        .messages({
            "string.base": "Tax ID must be a string",
            "any.required": "Tax ID is required"
        }),
    verification_code: Joi.string()
        .required()
        .messages({
            "string.base": "Verification code should be a text value",
            "string.empty": "Verification code cannot be empty",
            "any.required": "Verification code is required to complete signup"
        }),

    firstname: Joi.string()
        .max(155)
        .required()
        .messages({
            "string.base": "First name should be a text value",
            "string.empty": "First name cannot be empty",
            "string.max": "First name cannot exceed 155 characters",
            "any.required": "First name is required"
        }),

    surname: Joi.string()
        .max(155)
        .required()
        .messages({
            "string.base": "Surname should be a text value",
            "string.empty": "Surname cannot be empty",
            "string.max": "Surname cannot exceed 155 characters",
            "any.required": "Surname is required"
        }),

    othernames: Joi.string()
        .max(155)
        .optional()
        .allow(null, '')
        .messages({
            "string.base": "Other names should be a text value",
            "string.max": "Other names cannot exceed 155 characters"
        }),

    gender: Joi.string()
        .valid(...Object.values(GenderTypes))
        .required()
        .messages({
            "string.base": "Gender should be a text value",
            "any.only": `Gender must be one of: ${Object.values(GenderTypes).join(', ')}`,
            "any.required": "Gender is required"
        }),

    marital_status: Joi.string()
        .valid(...Object.values(MaritalStatus))
        .required()
        .messages({
            "string.base": "Marital status should be a text value",
            "any.only": `Marital status must be one of: ${Object.values(MaritalStatus).join(', ')}`,
            "any.required": "Marital status is required"
        }),

    email_address: Joi.string()
        .email()
        .required()
        .messages({
            "string.base": "Email should be a text value",
            "string.email": "Please enter a valid email address",
            "string.empty": "Email cannot be empty",
            "any.required": "Email is required"
        }),

    phone_number: Joi.string()
        .required()
        .messages({
            "string.base": "Phone number should be a text value",
            "string.empty": "Phone number cannot be empty",
            "any.required": "Phone number is required"
        }),

    date_of_birth: Joi.date()
        .max(new Date(new Date().setFullYear(new Date().getFullYear() - 18)))
        .optional()
        .allow(null)
        .messages({
            "date.base": "Date of birth must be a valid date",
            "date.format": "Please use a valid date format (YYYY-MM-DD)",
            "date.max": "You must be at least 18 years old to register",
            "any.required": "Date of birth is required"
        }),

    kaadi_igbeayo_no: Joi.string()
        .optional()
        .allow(null, '')
        .messages({
            "string.base": "Kaadi Igbeayo number should be a text value"
        }),

    is_public_servant: Joi.string()
        .valid(...Object.values(Options))
        .required()
        .messages({
            "string.base": "Public servant status should be a text value",
            "any.only": `Please specify if you're a public servant with either: ${Object.values(Options).join(' or ')}`,
            "any.required": "Public servant status is required"
        }),

    nationality: Joi.string()
        .max(100)
        .required()
        .messages({
            "string.base": "Nationality should be a text value",
            "string.empty": "Nationality cannot be empty",
            "string.max": "Nationality cannot exceed 100 characters",
            "any.required": "Nationality is required"
        }),

    occupation: Joi.string()
        .max(155)
        .required()
        .messages({
            "string.base": "Occupation should be a text value",
            "string.empty": "Occupation cannot be empty",
            "string.max": "Occupation cannot exceed 155 characters",
            "any.required": "Occupation is required"
        }),

    state_of_origin: Joi.string()
        .max(100)
        .required()
        .messages({
            "string.base": "State of origin should be a text value",
            "string.empty": "State of origin cannot be empty",
            "string.max": "State of origin cannot exceed 100 characters",
            "any.required": "State of origin is required"
        }),

    lga_of_origin: Joi.string()
        .max(100)
        .required()
        .messages({
            "string.base": "LGA of origin should be a text value",
            "string.empty": "LGA of origin cannot be empty",
            "string.max": "LGA of origin cannot exceed 100 characters",
            "any.required": "LGA of origin is required"
        }),

    business_type: Joi.string()
        .max(255)
        .required()
        .messages({
            "string.base": "Business type should be a text value",
            "string.empty": "Business type cannot be empty",
            "string.max": "Business type cannot exceed 255 characters",
            "any.required": "Business type is required"
        }),

    tax_lga_area: Joi.string()
        .required()
        .messages({
            "string.base": "Tax LGA area should be a text value",
            "string.empty": "Tax LGA area cannot be empty",
            "any.required": "Tax LGA area is required"
        }),

    tax_station: Joi.string()
        .required()
        .messages({
            "string.base": "Tax station should be a text value",
            "string.empty": "Tax station cannot be empty",
            "any.required": "Tax station is required"
        })
});

export const passwordRequestSchema = Joi.object({
    tax_id: Joi.string()
        .custom((value, helpers) => {
            if (value.length !== 8 && value.length !== 13) {
                return helpers.error('string.length');
            }
            return value;
        })
        .required()
        .messages({
            "string.base": "Tax ID must be a string",
            "string.length": "Tax ID must be either 8 or 13 characters long",
            "any.required": "Tax ID is required"
        }),
})

export const resetPasswordValidation = extendedJoi.object({
    password_reset_token: extendedJoi.number().required().messages({
        'number.base': 'Password Reset Token can only contain numbers',
        'any.required': 'Password Reset Token is a required field.',
    }),
    new_password: extendedJoi.string()
        .min(8)
        .max(30)
        .required()
        .minOfLowercase(1)
        .minOfUppercase(1)
        .noWhiteSpaces()
        .messages({
            'string.min': 'New Password must be at least 8 characters long.',
            'string.max': 'New Password must not exceed 30 characters.',
            'password.minOfLowercase': 'New Password must contain at least one lowercase letter.',
            'password.minOfUppercase': 'New Password must contain at least one uppercase letter.',
            'password.noWhiteSpaces': 'New Password must not contain white spaces.',
            'any.required': 'New Password is a required field.',
        }),
    confirm_password: extendedJoi.string()
        .valid(Joi.ref('new_password'))
        .required()
        .messages({
            'any.only': 'Confirm password must match the password.',
            'any.required': 'Confirm password is a required field.',
        }),
})