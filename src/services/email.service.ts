// services/email.service.ts
import envVars from '../validations/validateEnv';
import { transporter } from './../utils/mailer';

interface RegistrationEmailParams {
    email: string;
    tax_id: string;
    password: string;
}

interface PasswordRequestParams {
    email: string,
    code: string
}

export class EmailService {
    static async sendRegistrationEmail(params: RegistrationEmailParams): Promise<void> {
        try {
            await transporter.sendMail({
                from: envVars.MAIL_FROM_ADDRESS,
                to: params.email,
                subject: 'Your Registration is Complete',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2>Registration Successful</h2>
                        <p>Thank you for registering with us. Here are your login details:</p>
                        <p><strong>Tax ID:</strong> ${params.tax_id}</p>
                        <p><strong>Password:</strong> ${params.password}</p>
                        <p>Please keep this information secure.</p>
                        <p>You can now login to your account using these credentials.</p>
                        <p>If you didn't request this registration, please contact our support team immediately.</p>

                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">

                        <div style="text-align: center; color: #7f8c8d; font-size: 0.9em;">
                            <p>© ${new Date().getFullYear()} ${envVars.APP_NAME}. All rights reserved.</p>
                        </div>
                    </div>

                `,
            });
            console.log('Registration email sent successfully');
        } catch (error) {
            console.error('Error sending registration email:', error);
            throw new Error('Failed to send registration email');
        }
    }

    static async sendPasswordRequest(params: PasswordRequestParams): Promise<void> {
        try {
            await transporter.sendMail({
                from: envVars.MAIL_FROM_ADDRESS,
                to: params.email,
                subject: 'Password Reset Request',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2c3e50;">Hello User,</h2>
                    
                    <p>We received a request to reset your password. Please use the following token to proceed:</p>
                    
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <strong>Password Reset Token:</strong> 
                        <span style="font-family: monospace; font-size: 1.1em;">${params.code}</span>
                    </div>
                    
                    <p>If you didn't request this password reset, please ignore this email or contact support.</p>
                    
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    
                    <div style="text-align: center; color: #7f8c8d; font-size: 0.9em;">
                        <p>© ${new Date().getFullYear()} ${envVars.APP_NAME}. All rights reserved.</p>
                    </div>
                </div>
                `,
            });
            console.log('Password Request email sent successfully');
        } catch (error) {
            console.error('Error sending request password email:', error);
            throw new Error('Failed to send password request email');
        }
    }

    static async passwordSuccessfullyChanged(params: any): Promise<void> {
        try {
            await transporter.sendMail({
                from: envVars.MAIL_FROM_ADDRESS,
                to: params.email,
                subject: 'Your Password Has Been Changed',
                html: `
                   <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 5px 5px 0 0;">
                        <h2 style="color: #2c3e50; margin: 0;">Password Update Confirmation</h2>
                    </div>

                    <div style="padding: 20px;">
                        <p>Hello User,</p>
                        
                        <p>This is to confirm that your password was successfully changed on 
                        ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}.</p>
                                                
                        <p>For your security:</p>
                        <ul style="padding-left: 20px;">
                            <li>Never share your password with anyone</li>
                            <li>Use a strong, unique password</li>
                            <li>Change your password regularly</li>
                        </ul>
                        
                        <p>Thank you for helping keep your account secure.</p>
                        
                        <p>Best regards,<br>The ${envVars.APP_NAME || 'Our Team'}</p>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 15px; text-align: center; border-radius: 0 0 5px 5px; font-size: 0.8em; color: #7f8c8d;">
                        <p>© ${new Date().getFullYear()} ${envVars.APP_NAME}. All rights reserved.</p>
                        <p>This is an automated message - please do not reply directly to this email.</p>
                    </div>
                </div>
                `,
            });
            console.log('Password Request email sent successfully');
        } catch (error) {
            console.error('Error sending request password email:', error);
            throw new Error('Failed to send password request email');
        }
    }
}