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
export async function createLoginResponse(
    samlRequest: string,
    user: {
        id: string;
        tax_id: string;
        role: string;
        email_address: string;
        identification_type: string;
        identification_value: string;
    }
): Promise<string> {
    return new Promise((resolve, reject) => {
        try {
            // Validate inputs
            if (!samlRequest) throw new Error('SAMLRequest is required');
            if (!user) throw new Error('User object is required');
            if (!user.id || !user.email_address) {
                throw new Error('User missing required attributes');
            }

            // Get service provider configuration
            const spConfig = knownServiceProviders.sp1; // Or get dynamically

            // Build complete SAML assertion
            const assertion = create({ version: '1.0' })
                .ele('saml:Assertion', {
                    'xmlns:saml': 'urn:oasis:names:tc:SAML:2.0:assertion',
                    'ID': `_${Date.now()}`,
                    'IssueInstant': new Date().toISOString(),
                    'Version': '2.0'
                })

                // Issuer
                .ele('saml:Issuer').txt(idpConfig.entityId).up()

                // Subject
                .ele('saml:Subject')
                .ele('saml:NameID', {
                    'Format': 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'
                }).txt(user.email_address).up()

                .ele('saml:SubjectConfirmation', {
                    'Method': 'urn:oasis:names:tc:SAML:2.0:cm:bearer'
                })
                .ele('saml:SubjectConfirmationData', {
                    'NotOnOrAfter': new Date(Date.now() + 5 * 60 * 1000).toISOString(),
                    'Recipient': spConfig.assertionConsumerService
                }).up()
                .up()
                .up()

                // Conditions
                .ele('saml:Conditions', {
                    'NotBefore': new Date().toISOString(),
                    'NotOnOrAfter': new Date(Date.now() + 5 * 60 * 1000).toISOString()
                })
                .ele('saml:AudienceRestriction')
                .ele('saml:Audience').txt(spConfig.audience).up()
                .up()
                .up()

                // AuthnStatement
                .ele('saml:AuthnStatement', {
                    'AuthnInstant': new Date().toISOString(),
                    'SessionIndex': `_${Date.now()}`,
                    'SessionNotOnOrAfter': new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
                })
                .ele('saml:AuthnContext')
                .ele('saml:AuthnContextClassRef')
                .txt('urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport')
                .up()
                .up()
                .up()

                // AttributeStatement
                .ele('saml:AttributeStatement')
                .ele('saml:Attribute', {
                    'Name': 'id',
                    'NameFormat': 'urn:oasis:names:tc:SAML:2.0:attrname-format:basic'
                }).ele('saml:AttributeValue').txt(user.id).up().up()

                .ele('saml:Attribute', {
                    'Name': 'tax_id',
                    'NameFormat': 'urn:oasis:names:tc:SAML:2.0:attrname-format:basic'
                }).ele('saml:AttributeValue').txt(user.tax_id || '').up().up()

                .ele('saml:Attribute', {
                    'Name': 'role',
                    'NameFormat': 'urn:oasis:names:tc:SAML:2.0:attrname-format:basic'
                }).ele('saml:AttributeValue').txt(user.role).up().up()

                .ele('saml:Attribute', {
                    'Name': 'email_address',
                    'NameFormat': 'urn:oasis:names:tc:SAML:2.0:attrname-format:basic'
                }).ele('saml:AttributeValue').txt(user.email_address).up().up()

                .ele('saml:Attribute', {
                    'Name': 'identification_type',
                    'NameFormat': 'urn:oasis:names:tc:SAML:2.0:attrname-format:basic'
                }).ele('saml:AttributeValue').txt(user.identification_type || '').up().up()

                .ele('saml:Attribute', {
                    'Name': 'identification_value',
                    'NameFormat': 'urn:oasis:names:tc:SAML:2.0:attrname-format:basic'
                }).ele('saml:AttributeValue').txt(user.identification_value || '').up().up()
                .up()
                .end({ prettyPrint: true });


            const assertionXml = assertion.toString();

            // Configure and sign the assertion
            const sig = new (OriginalSignedXml as any)({
                signatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
                canonicalizationAlgorithm: 'http://www.w3.org/2001/10/xml-exc-c14n#'
            });

            sig.signingKey = privateKey;
            sig.addReference(
                "//*[local-name()='Assertion']",
                [
                    'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
                    'http://www.w3.org/2001/10/xml-exc-c14n#'
                ],
                'http://www.w3.org/2001/04/xmlenc#sha256'
            );

            sig.computeSignature(assertionXml);
            resolve(sig.getSignedXml());

        } catch (err) {
            console.error('SAML Error:', {
                message: err.message,
                stack: err.stack,
                user: user ? {
                    id: user.id,
                    email: user.email_address
                } : null,
                spConfig: knownServiceProviders.sp1.entityId
            });
            reject(new Error(`SAML response creation failed: ${err.message}`));
        }
    });
}

export { idp };