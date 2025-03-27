import dotenv from 'dotenv'
dotenv.config()
import express, { Application, NextFunction, Request, Response } from 'express'
import morgan from 'morgan'
import cors from 'cors'
import { handleError, successResponse } from './utils/responseHandler'
import envVars from './validations/validateEnv'
import { logger } from './utils/logger'
import bodyParser from 'body-parser'
import swaggerUi from 'swagger-ui-express'
import swaggerJsdoc from 'swagger-jsdoc'
import { getUserByTaxId } from './services/account.service'
import bcrypt from 'bcrypt'
import { encrypt } from 'xml-encryption';
import { promisify } from 'util';
const encryptAsync = promisify(encrypt)
import fs from 'fs'
import path from 'path'
import { ServiceProvider, IdentityProvider } from 'saml2-js'
import accountRoute from './routes/account.router'
import authRoute from './routes/auth.router'
import { encryptSamlResponse, generateSamlResponse, sendSamlResponse } from './utils/saml.helper'


const app: Application = express();

// Define the list of allowed origins
const allowedOrigins = [
    'http://localhost:4014',
    'http://localhost:4015'
]; // Add your allowed origins

// Configure CORS
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Check if the origin is in the allowed list
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        } else {
            return callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true, // Include cookies or authentication headers
}));

// Middleware to parse JSON and URL-encoded bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(morgan('combined'));

const swaggerOptions = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "IdP Api Documentation",
            version: "1.0.0",
            description: "Identity Provider API documentation with Swagger",
            license: {
                name: "MIT",
                url: "https://spdx.org/licenses/MIT.html",
            },
            contact: {
                name: "Oyedele Olufemi",
                email: "oyedele.phemy@gmail.com",
            },
        },
        schemes: ['http', 'https'],
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                in: 'header',
                name: 'Authorization',
                description: 'Bearer token to access these api endpoints',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
        servers: [
            {
                url: `http://localhost:${envVars.APP_PORT}`,
                description: 'Local Server'
            },
        ],
    },
    apis: ['./src/routes/*.ts'], // Path to your API files
};

const swaggerSpecs = swaggerJsdoc(swaggerOptions);

// Serve Swagger UI
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, { explorer: true }));

//logger
logger;

// Set the port, ensuring it’s a number or string
const port: string | number = envVars.APP_PORT || 4015;

// Define a basic route
app.get('/', (req: Request, res: Response): Response => {
    return successResponse(res, 200, {}, "Single-Sign-On Service");
});

// Handle SAML Login Request
app.get('/sso/login', (req: Request, res: Response) => {
    // Get the error message from query parameters
    const error = req.query.error;

    // Send a styled login form with error message (if any)
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Login Page</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #f4f4f9;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
        }
        .login-container {
          background-color: #ffffff;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
          width: 100%;
          max-width: 400px;
          text-align: center;
        }
        .login-container h1 {
          margin-bottom: 1.5rem;
          color: #333;
          font-size: 24px;
        }
        .login-container label {
          display: block;
          margin-bottom: 0.5rem;
          color: #555;
          font-size: 14px;
          text-align: left;
        }
        .login-container input {
          width: 100%;
          padding: 0.75rem;
          margin-bottom: 1rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          box-sizing: border-box;
        }
        .login-container input:focus {
          border-color: #007bff;
          outline: none;
        }
        .login-container button {
          width: 100%;
          padding: 0.75rem;
          background-color: #007bff;
          color: #fff;
          border: none;
          border-radius: 4px;
          font-size: 16px;
          cursor: pointer;
        }
        .login-container button:hover {
          background-color: #0056b3;
        }
        .login-container .error {
          color: #dc3545;
          margin-bottom: 1rem;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="login-container">
        <h1>Identity Provider Authentication</h1>
        ${error ? `<div class="error">${error}</div>` : ''}
        <form action="/sso/acs" method="POST">
          <label for="taxid">Tax ID:</label>
          <input type="text" id="taxid" name="taxid" required>
          <label for="password">Password:</label>
          <input type="password" id="password" name="password" required>
          <button type="submit">Login</button>
        </form>
      </div>
    </body>
    </html>
  `);
});

// Check if files exist and are readable
try {
    const rootDir = path.join(__dirname, '..', '..');

    const spCert = path.join(rootDir, 'certs', 'sp-cert.pem')
    const idpKey = path.join(rootDir, 'certs', 'idp-key.pem')

    if (!spCert || !idpKey) {
        throw new Error("Certificate or private key file is empty");
    }

} catch (err) {
    console.error("Error reading certificate or private key file:", err);
    process.exit(1); // Exit the application if files are missing or invalid
}


// Handle SAML Response
app.post('/sso/acs', async (req: Request, res: Response) => {
    const { taxid, password } = req.body;

    try {
        // Input validation
        if (!taxid || !password) {
            return res.redirect('/sso/login?error=Tax ID and password are required');
        }

        // Get user by tax id
        const user = await getUserByTaxId(taxid);
        if (!user) {
            return res.redirect('/sso/login?error=Tax ID does not exist');
        }

        // Compare the provided password with the hashed password in the database
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.redirect('/sso/login?error=Invalid Tax ID or Password');
        }

        // Generate SAML XML response
        const samlResponse = generateSamlResponse(user);

        // Encrypt the SAML assertion
        const encryptedResponse = await encryptSamlResponse(samlResponse);

        // Send to SP
        return sendSamlResponse(res, encryptedResponse);

    } catch (err) {
        console.error("Error during authentication:", err);
        res.status(500).send("Internal Server Error");
    }
})

app.use('/api/v1/account', accountRoute)
app.use('/api/v1/auth', authRoute)

// Start the server
app.listen(port, () => {
    console.log(`Identity Provider Service is up and running on ${port}`);
    logger.info(`Identity Provider Service  up and running on ${port}`);
});