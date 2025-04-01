import { IdentityProvider } from 'saml2-js';
import { idpConfig, knownServiceProviders } from './config';
import { create } from 'xmlbuilder2';
import { SignedXml as OriginalSignedXml } from 'xml-crypto';
import envVars from '../validations/validateEnv';
import { Buffer } from 'buffer';
import crypto from 'crypto';
import * as zlib from 'zlib';
import * as xml2js from 'xml2js';
import * as util from 'util';

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
    sso_login_url: idpConfig.ssoLoginUrl,
    sso_logout_url: idpConfig.ssoLogoutUrl || `${idpConfig.ssoLoginUrl.replace('/login', '/logout')}`,
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

const idp = new IdentityProvider(idpOptions as CustomIdentityProviderOptions);

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

// Create SAML response with type-safe workarounds
export async function createLoginResponse(samlRequest: string, userAttributes: any): Promise<object | string> {
    // 1. Decode and parse the SAML request (if needed)
    // const decoded = Buffer.from(samlRequest, 'base64');
    // const inflated = await inflateRaw(decoded);
    // const xml = inflated.toString('utf8');
    // const parsed = await parseString(xml);

    // 2. Create the SAML Response with the Assertion wrapped inside
    const now = new Date();
    const issueInstant = now.toISOString();
    const notOnOrAfter = new Date(now.getTime() + 5 * 60 * 1000).toISOString(); // 5 minutes from now
    const sessionNotOnOrAfter = new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString(); // 8 hours from now

    const assertion = `
        <saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" 
                        ID="_${Date.now()}" 
                        IssueInstant="${issueInstant}" 
                        Version="2.0">
            <saml:Issuer>http://localhost:7001/saml/idp</saml:Issuer>
            <saml:Subject>
                <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">${userAttributes.email_address}</saml:NameID>
                <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
                    <saml:SubjectConfirmationData NotOnOrAfter="${notOnOrAfter}" Recipient="http://localhost:8000/saml/acs"/>
                </saml:SubjectConfirmation>
            </saml:Subject>
            <saml:Conditions NotBefore="${issueInstant}" NotOnOrAfter="${notOnOrAfter}">
                <saml:AudienceRestriction>
                    <saml:Audience>http://localhost:8000</saml:Audience>
                </saml:AudienceRestriction>
            </saml:Conditions>
            <saml:AuthnStatement AuthnInstant="${issueInstant}" SessionIndex="_${Date.now()}" SessionNotOnOrAfter="${sessionNotOnOrAfter}">
                <saml:AuthnContext>
                    <saml:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport</saml:AuthnContextClassRef>
                </saml:AuthnContext>
            </saml:AuthnStatement>
            <saml:AttributeStatement>
                ${Object.entries(userAttributes).map(([name, value]) => `
                    <saml:Attribute Name="${name}" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
                        <saml:AttributeValue>${value}</saml:AttributeValue>
                    </saml:Attribute>
                `).join('')}
            </saml:AttributeStatement>
        </saml:Assertion>
    `;

    const response = `
        <samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" 
                        xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" 
                        ID="_${Date.now()}" 
                        Version="2.0" 
                        IssueInstant="${issueInstant}" 
                        Destination="http://localhost:8000/saml/acs">
            <saml:Issuer>http://localhost:7001/saml/idp</saml:Issuer>
            <samlp:Status>
                <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
            </samlp:Status>
            ${assertion}
        </samlp:Response>
    `;

    // / Base64 encode
    // const base64Encoded = Buffer.from(response).toString('base64');
    // console.log("Base64-encoded SAML Response:\n", base64Encoded);

    // URL-encode (for form submission)
    // const urlEncoded = encodeURIComponent(base64Encoded);
    // console.log("URL-encoded SAML Response:\n", urlEncoded);

    // 3. Return the raw XML (for your current implementation)
    // If you need to return the Base64-encoded version instead:
    // const base64Response = Buffer.from(response).toString('base64');
    // return base64Response;

    // Return both formats for flexibility
    // const base64Encoded = Buffer.from(response).toString('base64');
    // const urlEncoded = encodeURIComponent(base64Encoded);

    // return {
    //     rawXml: response,
    //     encodedResponse: urlEncoded
    // };

    return response;
}

export { idp };