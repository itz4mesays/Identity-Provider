import express, { Application, Request, Response, Router } from 'express'
import ProfileController from '../controllers/AccountController';

const router: Router = express.Router();
const profileController = new ProfileController();


/**
 * @swagger
 * /api/v1/account/register/individual:
 *   post:
 *     summary: Register a new individual
 *     tags: [Account]
 *     description: This endpoint allows a new user to register by providing their email, name, phone number, password, password confirmation, and optional description.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tax_id
 *               - tax_pay_type
 *               - identification_value
 *               - date_of_birth
 *             properties:
 *               tax_id:
 *                 type: string
 *                 example: "12345678-0001"
 *               tax_pay_type:
 *                 type: string
 *                 example: "nin or bvn"
 *               identification_value:
 *                 type: string
 *                 example: "15241123123"
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *                 example: "1986-01-01"
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User registered successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     tax_id:
 *                       type: string
 *                       example: "12345678-0001"
 *                     identification_type:
 *                       type: string
 *                       example: "nin"
 *                     identification_value:
 *                       type: string
 *                       example: "febea1649baa64ae69832a9005cd98ca"
 *                     verification_code:
 *                       type: string
 *                       example: "228679209045992"
 *                     date_of_birth:
 *                       type: string
 *                       example: "1986-10-02T00:00:00.000Z"
 *                     role:
 *                       type: string
 *                       example: "Individual"
 *       409:
 *         description: Conflict - Identification value or Tax Id already in use
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Identification value or Tax Id already in use"
 *                 message:
 *                   type: string
 *                   example: "Identification value or Tax Id already in use"
 *       422:
 *         description: Unprocessable Entity - Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Validation failed"
 *                 details:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                         example: "email"
 *                       message:
 *                         type: string
 *                         example: "Email is required"
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Internal Server Error"
 *                 message:
 *                   type: string
 *                   example: "An unexpected error occurred. Please try again later."
 */
router.post('/register/individual', profileController.registerIndividual)

/**
 * @swagger
 * /api/v1/account/complete-signup:
 *   post:
 *     summary: Complete registration setup
 *     tags: [Account]
 *     description: Completes the registration process after verification
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - verification_code
 *               - tax_id
 *               - firstname
 *               - surname
 *               - gender
 *               - marital_status
 *               - email_address
 *               - phone_number
 *               - date_of_birth
 *               - is_public_servant
 *               - nationality
 *               - occupation
 *               - state_of_origin
 *               - lga_of_origin
 *               - business_type
 *               - tax_lga_area
 *               - tax_station
 *             properties:
 *               verification_code:
 *                 type: string
 *                 example: "228679209045992"
 *               tax_id:
 *                 type: string
 *                 example: "12345678-0001"
 *               firstname:
 *                 type: string
 *                 example: "John"
 *               surname:
 *                 type: string
 *                 example: "Doe"
 *               othernames:
 *                 type: string
 *                 example: "Michael"
 *               gender:
 *                 type: string
 *                 enum: [Male, Female, Other]
 *                 example: "Male"
 *               marital_status:
 *                 type: string
 *                 enum: [Single, Married, Divorced, Widowed]
 *                 example: "Married"
 *               email_address:
 *                 type: string
 *                 format: email
 *                 example: "john.doe@example.com"
 *               phone_number:
 *                 type: string
 *                 example: "+2348012345678"
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *                 example: "1985-05-15"
 *               is_public_servant:
 *                 type: string
 *                 enum: [Yes, No]
 *                 example: "No"
 *               nationality:
 *                 type: string
 *                 example: "Nigerian"
 *               occupation:
 *                 type: string
 *                 example: "Software Engineer"
 *               state_of_origin:
 *                 type: string
 *                 example: "Lagos"
 *               lga_of_origin:
 *                 type: string
 *                 example: "Ikeja"
 *               business_type:
 *                 type: string
 *                 example: "Information Technology"
 *               tax_lga_area:
 *                 type: string
 *                 example: "Ikeja LGA"
 *               tax_station:
 *                 type: string
 *                 example: "Ikeja Tax Office"
 *     responses:
 *       200:
 *         description: Registration completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Congratulations, your registration has been completed"
 *                 data:
 *                   type: object
 *                   properties:
 *                     tax_id:
 *                       type: string
 *                       example: "12345678-0001"
 *                     email:
 *                       type: string
 *                       example: "john.doe@example.com"
 *                     temporary_password:
 *                       type: string
 *                       example: "TempPass123!"
 *       400:
 *         description: Unable to match tax ID
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
 *                   example: "Sorry, we are unable to verify your tax id as it does not match"
 *       404:
 *         description: Verification code not found
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
 *                   example: "Sorry, we could not verify the verification code"
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
 *                   example: "Validation failed for field: tax_id"
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
 *                         example: "Tax ID must be either 8 or 10 characters"
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
 *                   example: "An unexpected error occurred while completing registration"
 */
router.post('/complete-signup', profileController.completeSignup)

/**
 * @swagger
 * /api/v1/account/manage-individuals:
 *   get:
 *     summary: Get list of individuals
 *     description: Retrieve a paginated list of individual accounts with detailed information
 *     tags: [Account]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page_number
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: The page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: records_per_page
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: The number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, pending]
 *         description: Filter by account status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for name, email, phone number, or tax ID
 *     responses:
 *       200:
 *         description: List of individuals retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/IndividualAccount'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     IndividualAccount:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         tax_id:
 *           type: string
 *           example: "TAX-123456789"
 *         firstname:
 *           type: string
 *           example: "John"
 *         surname:
 *           type: string
 *           example: "Doe"
 *         othernames:
 *           type: string
 *           nullable: true
 *           example: "Smith"
 *         gender:
 *           type: string
 *           enum: [male, female, other]
 *           example: "male"
 *         marital_status:
 *           type: string
 *           nullable: true
 *           example: "married"
 *         email_address:
 *           type: string
 *           format: email
 *           example: "john.doe@example.com"
 *         phone_number:
 *           type: string
 *           example: "+2348012345678"
 *         date_of_birth:
 *           type: string
 *           format: date
 *           example: "1985-05-15"
 *         kaadi_igbeayo_no:
 *           type: string
 *           nullable: true
 *           example: "KAD-987654321"
 *         business_type:
 *           type: string
 *           nullable: true
 *           example: "Retail"
 *         created_at:
 *           type: string
 *           format: date-time
 *           example: "2023-01-15T09:30:00Z"
 *     Pagination:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           example: 150
 *         page:
 *           type: integer
 *           example: 1
 *         limit:
 *           type: integer
 *           example: 20
 *         total_pages:
 *           type: integer
 *           example: 8
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         error:
 *           type: string
 *           example: "Error message"
 *         code:
 *           type: string
 *           example: "error_code"
 *         details:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               field:
 *                 type: string
 *               message:
 *                 type: string
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */
router.get('/manage-individuals', profileController.getAllIndividuals)

/**
 * @swagger
 * /api/v1/account/manage-individuals/single:
 *   get:
 *     summary: Get single individual by ID or tax ID
 *     tags: [Account]
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [id, tax_id]
 *         description: Search type (id or tax_id)
 *       - in: query
 *         name: value
 *         required: true
 *         schema:
 *           type: string
 *         description: The value to search for
 *     responses:
 *       200:
 *         description: Individual record
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 tax_id:
 *                   type: string
 *                 firstname:
 *                   type: string
 *                 surname:
 *                   type: string
 *                 othernames:
 *                   type: string
 *                   nullable: true
 *                 gender:
 *                   type: string
 *                 marital_status:
 *                   type: string
 *                   nullable: true
 *                 email_address:
 *                   type: string
 *                 phone_number:
 *                   type: string
 *                 date_of_birth:
 *                   type: string
 *                   format: date
 *                 kaadi_igbeayo_no:
 *                   type: string
 *                   nullable: true
 *                 business_type:
 *                   type: string
 *                   nullable: true
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid parameters
 *       404:
 *         description: Individual not found
 *       500:
 *         description: Internal server error
 */
router.get('/manage-individuals/single', profileController.getSingleIndividual)


export default router