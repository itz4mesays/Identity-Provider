import Joi from 'joi'

interface EnvironmentVariablePayload {
    APP_PORT: number
    NODE_ENV: string
    DB_HOST: string
    DB_PORT: number
    SERVICE_PROVIDER_URL: string
    IDP_PROVIDER_URL: string
    ENCRYPTION_KEY: string
    DB_DATABASE: string
    DB_USERNAME: string
    DB_PASSWORD?: string | undefined
    MAIL_MAILER: string
    MAIL_HOST: string
    MAIL_PORT: number
    MAIL_USERNAME: string
    MAIL_PASSWORD: string
    MAIL_ENCRYPTION?: string | null
    MAIL_FROM_ADDRESS: string
    APP_NAME: string
    RELAY_STATE: string,
    IDP_PRIVATE_KEY_B64: string,
    IDP_CERTIFICATE_B64: string
}



// Define the schema for validation
const envSchema: Joi.ObjectSchema = Joi.object<EnvironmentVariablePayload>({
    APP_PORT: Joi.number().required(),
    NODE_ENV: Joi.string().required(),
    DB_HOST: Joi.string().required(),
    DB_PORT: Joi.string().required(),
    SERVICE_PROVIDER_URL: Joi.string().required(),
    IDP_PROVIDER_URL: Joi.string().required(),
    ENCRYPTION_KEY: Joi.string().required(),
    DB_DATABASE: Joi.string().required(),
    DB_USERNAME: Joi.string().required(),
    DB_PASSWORD: Joi.string().empty(''),
    MAIL_MAILER: Joi.string().required(),
    MAIL_HOST: Joi.string().required(),
    MAIL_PORT: Joi.number().required(),
    MAIL_USERNAME: Joi.string().required(),
    MAIL_PASSWORD: Joi.string().required(),
    MAIL_ENCRYPTION: Joi.string().required(),
    MAIL_FROM_ADDRESS: Joi.string().required(),
    RELAY_STATE: Joi.string().required(),
    APP_NAME: Joi.string().required(),
    IDP_CERTIFICATE_B64: Joi.string().required(),
    IDP_PRIVATE_KEY_B64: Joi.string().required(),

})
    .unknown() // Allow additional environment variables not specified in the schema
    .required();

// Validate the environment variables against the schema
const { error, value: envVars } = envSchema.validate(process.env, {
    abortEarly: true, // Return all errors found
});

// If validation fails, throw an error and exit
if (error) {
    throw new Error(`Environment variable validation error: ${error.details[0].message}`)
    process.exit(1); // Exit the process with an error code
}

// If validation is successful, you can safely use envVars
export default envVars;