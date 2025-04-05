import express, { Request, Response, Router } from 'express'
import { handleError, successResponse } from '../utils/responseHandler'
import { generateIdpMetadata } from '../config/metadata'
import { identityProvider, idpConfig } from '../config/config'
import { createLoginResponse, idp, SamlUserAttributes } from '../config/saml'
import bodyParser from 'body-parser'
import { getUserByTaxId } from '../services/account.service'
import envVars from '../validations/validateEnv'
import { parseSml } from '../config/saml'
import { parseStringPromise } from 'xml2js';


const router: Router = express.Router()

interface AuthnRequest {
  provider?: {
    entity_id?: string;
  };
  // Add other expected properties
}

// Middleware to handle different content types
router.use(bodyParser.text({ type: ['application/xml', 'text/xml'] }));
router.use(bodyParser.urlencoded({ extended: true }));

router.get('/', (req: Request, res: Response): Response => {
  return successResponse(res, 200, {}, "Identity Provider Service")
})


// Metadata - XML descriptor of IdP capabilities(entityID, certs, endpoints)
router.get('/saml/idp', (req, res) => {
  try {
    const metadata = generateIdpMetadata(
      idpConfig.entity_id,
      idpConfig.sso_login_url,
      './idp-cert.pem'
    )
    res.type('application/xml')
    res.send(metadata)
  } catch (error) {
    console.error('Metadata endpoint failed:', error)
    return handleError(res, 500, "Metadata generation failed")
  }
})

router.post('/saml/idp/login', express.urlencoded({ extended: true }), async (req, res) => {
  try {
    console.log('I just got here');
    console.log('Raw SAMLRequest:', req.body.SAMLRequest);

    if (!req.body.SAMLRequest) {
      return res.status(400).json({ error: 'Missing SAMLRequest' });
    }

    // Step 1: URL decode the SAMLRequest
    const decodedSamlRequest = decodeURIComponent(req.body.SAMLRequest);
    console.log('Decoded SAMLRequest:', decodedSamlRequest);

    // Step 2: Base64 decode the SAMLRequest
    const buffer = Buffer.from(decodedSamlRequest, 'base64');
    const xmlString = buffer.toString('utf-8');
    console.log('Base64-decoded SAMLRequest (XML):', xmlString);

    // Step 3: Optionally, parse the XML if you need to extract specific fields
    const authnRequest = await parseStringPromise(xmlString);
    console.log('Parsed SAMLRequest:', authnRequest);

    // Step 4: Handle the response, in this case return success
    return successResponse(res, 200, {
      RelayState: req.body.RelayState,
      target: authnRequest?.provider?.entity_id
    }, "SAML request processed successfully.");

    // Or render a login page or any other logic you require:
    // res.render('login', {
    //   RelayState: req.body.RelayState,
    //   target: authnRequest?.provider?.entity_id
    // });

  } catch (err) {
    console.error('SAML Error:', err);
    res.status(400).json({
      error: 'Invalid SAML Request',
      details: envVars.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

//route to process user data after SAML Request has been processed
router.post('/saml/idp/login/submit',
  express.urlencoded({ extended: true }),
  async (req, res) => {
    const { username, password, SAMLRequest, RelayState } = req.body;

    // Lookup user in DB
    const user = await UserModel.findOne({ username });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).send('Invalid username or password');
    }

    // If valid, send SAML Response
    idp.create_login_response(sp, {
      relay_state: RelayState,
      sign_get_request: false,
      name_identifier: user.email, // or user.id
    }, (err, response) => {
      if (err) {
        console.error('SAML Response Error:', err);
        return res.status(500).send('Failed to create SAML response');
      }

      // Auto-post the SAML response to the SP
      res.send(`
        <form method="POST" action="${sp.assert_endpoint}">
          <input type="hidden" name="SAMLResponse" value="${response}">
          <input type="hidden" name="RelayState" value="${RelayState}">
          <button type="submit">Continue</button>
        </form>
        <script>document.forms[0].submit();</script>
      `);
    });
  }
);


router.get('/saml/health', (req, res) => {
  res.json({
    status: 'ok',
    parserAvailable: true, // Now guaranteed to be true
    timestamp: new Date().toISOString()
  });
});

router.post('/saml/idp/acs', (req, res) => {
  res.send('Assertion received by IdP')
})

export default router