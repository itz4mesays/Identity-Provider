import { IdentificationType } from '@prisma/client';
import { IndividualPayload } from './../utils/types';
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
    tax_pay_type: Joi.string().required().messages({
        "string.base": "Tax Pay Type must be a string",
        "any.required": "Tax Pay Type is required"
    }),
    password: Joi.string().required().messages({
        "string.base": "Password field must be a string",
        "any.required": "Password field is required"
    }),
    email_address: Joi.string().required().messages({
        "string.base": "Email Address field must be a string",
        "any.required": "Email Address field is required"
    }),
    role: Joi.string().required().messages({
        "string.base": "Role field must be a string",
        "any.required": "Role field is required"
    }),
    identification_value: Joi.string().required().messages({
        "date.base": "Identification value must be a string",
        "any.required": "Date of Birth is required"
    }),
    date_of_birth: Joi.string().required().messages({
        "date.base": "Date of Birth must be a valid date",
        "any.required": "Date of Birth is required"
    }),
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