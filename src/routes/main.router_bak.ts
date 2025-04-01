import express, { Request, Response, Router } from 'express'
import { handleError, successResponse } from '../utils/responseHandler'
import { generateIdpMetadata } from '../config/metadata'
import { idpConfig } from '../config/config'
import { createLoginResponse } from '../config/saml'
import bodyParser from 'body-parser'


const router: Router = express.Router()

// Middleware to handle different content types
router.use(bodyParser.text({ type: ['application/xml', 'text/xml'] }));
router.use(bodyParser.urlencoded({ extended: true }));

router.get('/', (req: Request, res: Response): Response => {
    return successResponse(res, 200, {}, "Identity Provider Service")
})

router.get('/metadata', (req, res) => {
    try {
        const metadata = generateIdpMetadata(
            idpConfig.entityId,
            idpConfig.ssoLoginUrl,
            './idp-cert.pem'
        )
        res.type('application/xml')
        res.send(metadata)
    } catch (error) {
        console.error('Metadata endpoint failed:', error)
        return handleError(res, 500, "Metadata generation failed")
    }
})

router.post('/sso/login', async (req: Request, res: Response) => {
    try {
        // Handle both form-encoded and raw XML requests
        let samlRequest: string;

        if (req.body.SAMLRequest) {
            // Form-encoded request
            samlRequest = req.body.SAMLRequest;
        } else if (typeof req.body === 'string' && req.body.includes('<SAMLRequest>')) {
            // XML request - extract the base64 payload
            const match = req.body.match(/<SAMLRequest>([^<]+)<\/SAMLRequest>/);
            samlRequest = match?.[1]?.trim() || '';
        } else {
            throw new Error('Invalid SAML request format');
        }

        if (!samlRequest) {
            throw new Error('Empty SAML request');
        }

        console.log(`Creating login Response`)

        const response = await createLoginResponse(samlRequest, {
            id: 'usr_12345',
            tax_id: 'TAX-987654321',
            role: 'admin',
            email_address: 'user@example.com',
            identification_type: 'passport',
            identification_value: 'P12345678'
        });

        console.log(`Completed creating login response`, response)
        res.type('application/xml').send(response);
    } catch (error) {
        console.error('SAML Error:', error);
        res.status(500).send('SAML Processing Failed');
    }
});


router.post('/saml/assert', (req, res) => {
    res.send('Assertion received by IdP')
})

export default router