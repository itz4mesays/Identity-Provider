import express, { Application, Request, Response, Router } from 'express'
import AuthController from '../controllers/Auth.Controller';

const router: Router = express.Router();
const authController = new AuthController();

/**
 * @swagger
 * /api/v1/auth/request-password:
 *   post:
 *     summary: Request password reset
 *     description: Initiates a password reset process for the user by sending a reset token to their registered email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tax_id
 *             properties:
 *               tax_id:
 *                 type: string
 *                 description: User's tax identification number
 *                 example: "12345678-0001"
 *     responses:
 *       200:
 *         description: Password reset initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Password reset instructions have been sent to your registered email"
 *                 data:
 *                   type: object
 *                   properties:
 *                     tax_id:
 *                       type: string
 *                       example: "12345678-0001"
 *                     reset_token_expires:
 *                       type: string
 *                       format: date-time
 *                       example: "2023-12-31T23:59:59Z"
 *       400:
 *         description: Invalid tax ID or email not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Sorry, we are unable to match your tax id or invalid email"
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Validation failed"
 *                 details:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                         example: "tax_id"
 *                       message:
 *                         type: string
 *                         example: "Tax ID is required"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "An unexpected error occurred while processing your request"
 */
router.post('/request-password', authController.forgotPassword)

/**
 * @swagger
 * /api/v1/auth/resend-password-request:
 *   post:
 *     summary: Resend password reset request
 *     tags: [Auth]
 *     description: Resends the password reset link to the user with the provided tax ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tax_id
 *             properties:
 *               tax_id:
 *                 type: string
 *                 example: "12345678-0001"
 *                 description: User's tax identification number
 *     responses:
 *       200:
 *         description: Password reset resent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Password reset link has been resent to your registered email"
 *                 data:
 *                   type: object
 *                   properties:
 *                     tax_id:
 *                       type: string
 *                       example: "12345678-0001"
 *       400:
 *         description: Invalid tax ID or email
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Sorry, we are unable to match your tax id or invalid email"
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Validation failed"
 *                 details:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                         example: "tax_id"
 *                       message:
 *                         type: string
 *                         example: "Tax ID is required"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "An error occurred while processing your request"
 */
router.post('/resend-password-request', authController.resendToken)

/**
 * @swagger
 * /api/v1/auth/complete-password-request:
 *   post:
 *     summary: Complete password reset process
 *     description: Verifies the password reset token and updates the user's password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password_reset_token
 *               - new_password
 *               - confirm_password
 *             properties:
 *               password_reset_token:
 *                 type: integer
 *                 example: 2578910
 *                 description: The token received in the password reset email
 *               new_password:
 *                 type: string
 *                 format: password
 *                 example: "W3lcome1231"
 *                 minLength: 8
 *                 maxLength: 30
 *                 description: The new password to set
 *               confirm_password:
 *                 type: string
 *                 format: password
 *                 example: "W3lcome1231"
 *                 description: Must match the new_password field exactly
 *     responses:
 *       200:
 *         description: Password successfully reset
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Password has been reset successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                       example: "user@example.com"
 *                     password_changed_at:
 *                       type: string
 *                       format: date-time
 *                       example: "2023-07-20T12:34:56.789Z"
 *       404:
 *         description: Invalid password reset token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Invalid password reset token"
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Validation failed"
 *                 details:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                         example: "new_password"
 *                       message:
 *                         type: string
 *                         example: "Password must be at least 8 characters"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "An error occurred while resetting password"
 */
router.post('/complete-password-request', authController.completeForgotPassword)

router.patch('/create-auth-data', authController.createAuthDetails)

export default router