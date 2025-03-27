// config/mailer.ts
import nodemailer from 'nodemailer';
import envVars from '../validations/validateEnv';

const mailConfig = {
    host: envVars.MAIL_HOST,
    port: parseInt(envVars.MAIL_PORT),
    auth: {
        user: envVars.MAIL_USERNAME,
        pass: envVars.MAIL_PASSWORD,
    },
    secure: false, // Set to false for Mailtrap
    tls: {
        rejectUnauthorized: false // Only for development/testing
    },
    from: envVars.MAIL_FROM_ADDRESS
};

export const transporter = nodemailer.createTransport(mailConfig);

export default mailConfig;