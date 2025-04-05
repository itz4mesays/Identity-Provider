import { IdentityProvider } from 'saml2-js';
import { idpConfig, knownServiceProviders } from './config';
import envVars from '../validations/validateEnv';
import { Buffer } from 'buffer';
import crypto from 'crypto';
import { SamlParser } from '../utils/samlParser';

interface CustomIdentityProviderOptions {
  sso_login_url: string;
  sso_logout_url: string;
  privateKey?: string;
  certificates: string[];
  allow_unencrypted_assertion: boolean;
  serviceProviders: {
    entityId: string;
    certificate: string;
    audience: string;
    assertionConsumerService: string;
    wantAssertionsSigned: boolean;
  }[];
}


// Helper function to decode base64 and clean certificate
function prepareCertificate(certB64: string): string {
  if (!certB64) throw new Error('Certificate is required');
  const cert = Buffer.from(certB64, 'base64').toString('utf-8');
  return cert
    .replace(/-----BEGIN CERTIFICATE-----/g, '')
    .replace(/-----END CERTIFICATE-----/g, '')
    .replace(/\n/g, '');
}

const IDP_PRIVATE_KEY_B64 = envVars.IDP_PRIVATE_KEY_B64
// Helper function to validate and prepare private key
function validatePrivateKey(key: string): string {
  if (!key) throw new Error('Private key is empty');

  // Normalize line endings and remove any extra whitespace
  const normalizedKey = key
    .replace(/\r\n/g, '\n')
    .trim();

  // Verify key format
  if (!normalizedKey.includes('-----BEGIN PRIVATE KEY-----') ||
    !normalizedKey.includes('-----END PRIVATE KEY-----')) {
    throw new Error('Invalid private key format');
  }

  // Test if key can actually sign data
  try {
    const sign = crypto.createSign('RSA-SHA256');
    sign.update('test');
    sign.sign(normalizedKey);
  } catch (err) {
    throw new Error(`Private key validation failed: ${err.message}`);
  }

  return normalizedKey;
}

// Prepare private key (from your hardcoded value)
const privateKey = validatePrivateKey(
  Buffer.from(IDP_PRIVATE_KEY_B64, 'base64').toString('utf-8')
);

if (!privateKey) throw new Error('IDP_PRIVATE_KEY_B64 is required in environment variables');

const IDP_CERTIFICATE_B64 = envVars.IDP_CERTIFICATE_B64
// Prepare certificate
const certificate = prepareCertificate(IDP_CERTIFICATE_B64);
const certificates = [certificate];

// Test the private key independently
console.log('=== PRIVATE KEY VALIDATION ===');
console.log('Key starts with:', privateKey.substring(0, 50));
console.log('Key ends with:', privateKey.substring(privateKey.length - 50));
console.log('Key length:', privateKey.length);

try {
  const sign = crypto.createSign('RSA-SHA256');
  sign.update('test');
  const signature = sign.sign(privateKey);
  console.log('Key test signature successful! Length:', signature.length);
} catch (err) {
  console.error('KEY TEST FAILED:', err);
  process.exit(1);
}

// Configure the IDP
const idpOptions = {
  sso_login_url: idpConfig.sso_login_url,
  sso_logout_url: idpConfig.sso_logout_url || `${idpConfig.sso_login_url.replace('/login', '/logout')}`,
  privateKey: privateKey,
  certificates: certificates,
  allow_unencrypted_assertion: true,
  serviceProviders: Object.values(knownServiceProviders).map(sp => ({
    entityId: sp.entityId,
    certificate: prepareCertificate(sp.certificate),
    audience: sp.audience,
    assertionConsumerService: sp.assertionConsumerService,
    wantAssertionsSigned: sp.wantAssertionsSigned || false
  }))
};

// Create the parser instance
const idp = new IdentityProvider(idpOptions as CustomIdentityProviderOptions);
const parseSml = new SamlParser(idp);

// Create a type-safe wrapper that matches xml-crypto@3.2.1 API
interface XmlCryptoV3 {
  new(options?: {
    signatureAlgorithm?: string;
    canonicalizationAlgorithm?: string;
  }): {
    signingKey: string;
    addReference(xpath: string, transforms: string[], digestAlgorithm: string): void;
    computeSignature(xml: string): void;
    getSignedXml(): string;
  };
}

export interface SamlUserAttributes {
  email_address: string;
  id: string;
  tax_id: string;
  role: string;
  // identification_type: string;
  // identification_value: string;
}

export async function createLoginResponse(
  userAttributes: SamlUserAttributes,
  options: {
    acsUrl: string;
    audience: string;
    inResponseTo?: string;
  }
): Promise<{ raw: string; base64: string }> {
  const now = new Date();
  const issueInstant = now.toISOString();
  const notOnOrAfter = new Date(now.getTime() + 5 * 60 * 1000).toISOString(); // 5 minutes validity
  const sessionNotOnOrAfter = new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString(); // 8 hour session

  const response = `<?xml version="1.0"?>
<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
               xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
               ID="_${generateId()}"
               Version="2.0"
               IssueInstant="${issueInstant}"
               Destination="${options.acsUrl}"
               ${options.inResponseTo ? `InResponseTo="${options.inResponseTo}"` : ''}>
  <saml:Issuer>${envVars.IDP_PROVIDER_URL}/saml/idp</saml:Issuer>
  <samlp:Status>
    <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
  </samlp:Status>
  <saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                 ID="_${generateId()}"
                 IssueInstant="${issueInstant}"
                 Version="2.0">
    <saml:Issuer>${envVars.IDP_PROVIDER_URL}/saml/idp</saml:Issuer>
    <saml:Subject>
      <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">
        ${userAttributes.email_address}
      </saml:NameID>
      <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
        <saml:SubjectConfirmationData NotOnOrAfter="${notOnOrAfter}"
                                     Recipient="${options.acsUrl}"/>
      </saml:SubjectConfirmation>
    </saml:Subject>
    <saml:Conditions NotBefore="${issueInstant}"
                   NotOnOrAfter="${notOnOrAfter}">
      <saml:AudienceRestriction>
        <saml:Audience>${options.audience}</saml:Audience>
      </saml:AudienceRestriction>
    </saml:Conditions>
    <saml:AuthnStatement AuthnInstant="${issueInstant}"
                       SessionIndex="_${generateId()}"
                       SessionNotOnOrAfter="${sessionNotOnOrAfter}">
      <saml:AuthnContext>
        <saml:AuthnContextClassRef>
          urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport
        </saml:AuthnContextClassRef>
      </saml:AuthnContext>
    </saml:AuthnStatement>
    <saml:AttributeStatement>
      <saml:Attribute Name="email_address"
                     NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue>${userAttributes.email_address}</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="id"
                     NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue>${userAttributes.id}</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="tax_id"
                     NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue>${userAttributes.tax_id}</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="role"
                     NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue>${userAttributes.role}</saml:AttributeValue>
      </saml:Attribute>
    </saml:AttributeStatement>
  </saml:Assertion>
</samlp:Response>`;

  return {
    raw: response,
    base64: Buffer.from(response).toString('base64')
  };
}


// Helper function to generate unique IDs
function generateId(): string {
  return 'id' + crypto.randomBytes(16).toString('hex');
}


export { idp, parseSml };