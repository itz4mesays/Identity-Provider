import { spConfig } from './../saml/idp';
import express, { Request, Response, Router } from 'express'
import { handleError, successResponse } from '../utils/responseHandler'
import { generateIdpMetadata } from '../config/metadata'
import { idpConfig } from '../config/config'
import bodyParser from 'body-parser'
import { getUserByTaxId } from '../services/account.service'
import envVars from '../validations/validateEnv'
import { parseStringPromise } from 'xml2js';
import bcrypt from 'bcrypt'
import { signSAMLResponse } from '../config/saml'
import crypto from 'crypto';
import xml2js from 'xml2js';
import { ServiceProvider } from 'saml2-js';

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
router.get('/idp', (req, res) => {
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

router.post('/idp/login', express.urlencoded({ extended: true }), async (req, res) => {
  try {
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
      target: authnRequest?.provider?.entity_id,
      samlResponse: decodedSamlRequest
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
router.post('/idp/login/submit', async (req, res) => {
  const { taxid, password, RelayState } = req.body;

  if (!taxid || !password) {
    return handleError(res, 422, 'Tax ID and password are required')
  }

  // Get user by tax ID
  const user = await getUserByTaxId(taxid);
  if (!user) {
    return handleError(res, 404, 'Tax ID does not exist')
  }

  // Verify password
  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return handleError(res, 400, 'Invalid Tax ID or Password')
  }

  // Manually create the SAML response
  const samlResponse = {
    Response: {
      $: {
        Version: '2.0',
        ID: '_' + crypto.randomBytes(16).toString('hex'), // Unique ID for Response
        IssueInstant: new Date().toISOString(),
        Destination: `${envVars.SERVICE_PROVIDER_URL}/saml/sp/acs`, // ACS URL of the SP
      },
      Assertion: {
        $: {
          ID: '_' + crypto.randomBytes(16).toString('hex'), // Unique ID for Assertion
          IssueInstant: new Date().toISOString(),
          // Subject, Conditions, and other elements might be needed depending on your requirements
        },
        AttributeStatement: {
          Attribute: [
            { $: { Name: 'TaxId' }, _: user.tax_id }, // The primary identifier (e.g., tax_id)
            { $: { Name: 'EmailAddress' }, _: user.email_address }, // Email address of the user
            { $: { Name: 'Role' }, _: user.role }, // Role (or any other relevant attribute)
            { $: { Name: 'NameId' }, _: user.email_address }, // Role (or any other relevant attribute)
            // Add any other required attributes here
          ],
        },
      },
    },
  };


  // Convert the SAML Response to XML
  const builder = new xml2js.Builder();
  const xmlResponse = builder.buildObject(samlResponse);

  // Sign the response (simplified, you can use xml-crypto for signing)
  const signedResponse = signSAMLResponse(xmlResponse);

  // Encode the response in base64
  const encodedResponse = Buffer.from(signedResponse).toString('base64');

  // Send the response to the Service Provider
  res.send(`
    <form method="POST" action="${envVars.SERVICE_PROVIDER_URL}/saml/sp/acs">
      <input type="hidden" name="SAMLResponse" value="${encodedResponse}">
      <input type="hidden" name="RelayState" value="${RelayState}">
      <button type="submit">Continue</button>
    </form>
    <script>document.forms[0].submit();</script>
  `);
});

router.get('/idp/health', (req, res) => {
  res.json({
    status: 'ok',
    parserAvailable: true, // Now guaranteed to be true
    timestamp: new Date().toISOString()
  });
});

// router.post("/idp/slo", (req, res) => {
//   const samlRequest = req.body.SAMLRequest;
//   const relayState = req.body.RelayState;

//   spConfig.parse_logout_request(idpConfig, { request_body: req.body }, (err: Error, logoutRequest: string) => {
//     if (err) {
//       console.error("Failed to parse LogoutRequest", err);
//       return res.status(400).send("Invalid SAML LogoutRequest");
//     }

//     console.log("Received LogoutRequest for user:", logoutRequest.user.name_id);

//     // Optional: Destroy user session here
//     // req.session.destroy();

//     // Create and send LogoutResponse back to SP
//     sspConfigp.create_logout_response_url(idpConfig, logoutRequest, { relay_state: relayState }, (err, logoutUrl) => {
//       if (err) {
//         console.error("Failed to create LogoutResponse", err);
//         return res.status(500).send("Error creating LogoutResponse");
//       }

//       // Redirect back to SP with the LogoutResponse
//       res.redirect(logoutUrl);
//     });
//   });
// });

//Optional
router.post('/idp/acs', (req, res) => {
  res.send('Assertion received by IdP')
})

export default router