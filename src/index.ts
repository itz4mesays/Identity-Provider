import dotenv from 'dotenv'
dotenv.config()
import express, { Application, NextFunction, Request, Response } from 'express'
import morgan from 'morgan'
import cors from 'cors'
import envVars from './validations/validateEnv'
import { logger } from './utils/logger'
import bodyParser from 'body-parser'
import swaggerUi from 'swagger-ui-express'
import swaggerJsdoc from 'swagger-jsdoc'
import path from 'path'
import authRoute from './routes/auth.router'
import mainRoute from './routes/main.router'
import { successResponse } from './utils/responseHandler'

const app: Application = express();

// Define the list of allowed origins
const allowedOrigins = [
  `${envVars.SERVICE_PROVIDER_URL}`,
  `${envVars.IDP_PROVIDER_URL}`
];

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
      title: "API Documentation",
      version: "1.0.0",
      description: "API documentation with Swagger",
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
      }, {
        url: `http://214.134.167.72.host.secureserver.net:${envVars.APP_PORT}`,
        description: "Staging Server"
      }
    ],
  },
  apis: ['./src/routes/*.ts'], // Path to your API files
};

const swaggerSpecs = swaggerJsdoc(swaggerOptions);

// Serve Swagger UI
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, { explorer: true }));

app.get('/', (req: Request, res: Response) => {
  return successResponse(res, 200, {}, "Identity Provider Service is up and running")
})

//logger
logger;

// Set the port, ensuring it’s a number or string
const port: string | number = envVars.APP_PORT || 7001;

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

app.use('/saml', mainRoute)
app.use('/api/v1/auth', authRoute)

// Start the server
app.listen(port, () => {
  console.log(`Identity Provider Service is up and running on ${port}`);
});