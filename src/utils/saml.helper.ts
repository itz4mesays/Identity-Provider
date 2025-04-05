import fs from "fs";
import path from "path";
import envVars from "../validations/validateEnv";
import { Response } from 'express'
import * as xmlenc from 'xml-encryption';
import * as crypto from 'crypto';
import { loadFile } from "../config/config";

// 1. Define strict types for encryption algorithms
type EncryptionAlgorithm = 'http://www.w3.org/2001/04/xmlenc#aes256-cbc';
type KeyEncryptionAlgorithm = 'http://www.w3.org/2001/04/xmlenc#rsa-oaep-mgf1p';

interface SamlEncryptOptions {
    rsa_pub: string;
    pem: string;
    encryptionAlgorithm: EncryptionAlgorithm;
    keyEncryptionAlgorithm: KeyEncryptionAlgorithm;
}

export const generateSamlResponse = (user: any): string => {
    return `
        <samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                        ID="_${crypto.randomBytes(16).toString('hex')}"
                        Version="2.0"
                        IssueInstant="${new Date().toISOString()}"
                        Destination="${envVars.SERVICE_PROVIDER_ACS_URL}">
            <saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
          ${envVars.IDP_PROVIDER_URL}
        </saml:Issuer>
        <samlp:Status>
          <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
        </samlp:Status>
        <saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                        ID="_1234567890"
                        IssueInstant="${new Date().toISOString()}"
                        Version="2.0">
          <saml:Issuer>${envVars.IDP_PROVIDER_URL}</saml:Issuer>
          <saml:Subject>
            <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">
              ${user.tax_id}
            </saml:NameID>
            <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
              <saml:SubjectConfirmationData NotOnOrAfter="${new Date(Date.now() + 5 * 60 * 1000).toISOString()}"
                                            Recipient="${envVars.SERVICE_PROVIDER_URL}/sso/acs"/>
            </saml:SubjectConfirmation>
          </saml:Subject>
          <saml:Conditions NotBefore="${new Date().toISOString()}"
                           NotOnOrAfter="${new Date(Date.now() + 5 * 60 * 1000).toISOString()}">
            <saml:AudienceRestriction>
              <saml:Audience>${envVars.SERVICE_PROVIDER_URL}</saml:Audience>
            </saml:AudienceRestriction>
          </saml:Conditions>
          <saml:AuthnStatement AuthnInstant="${new Date().toISOString()}"
                               SessionIndex="_1234567890">
            <saml:AuthnContext>
              <saml:AuthnContextClassRef>
                urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport
              </saml:AuthnContextClassRef>
            </saml:AuthnContext>
          </saml:AuthnStatement>
          <saml:AttributeStatement>
            <saml:Attribute Name="email"
                            NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
              <saml:AttributeValue>${user.tax_id}</saml:AttributeValue>
            </saml:Attribute>
            <saml:Attribute Name="role"
                            NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
              <saml:AttributeValue>${user.role}</saml:AttributeValue>
            </saml:Attribute>
          </saml:AttributeStatement>
        </saml:Assertion>
        </samlp:Response>
    `;
}

export const encryptXml = async (xml: string, options: xmlenc.EncryptOptions): Promise<string> => {
    return new Promise((resolve, reject) => {
        xmlenc.encrypt(xml, options, (err, encrypted) => {
            if (err) {
                return reject(err);
            }
            if (!encrypted) {
                return reject(new Error('Encryption returned undefined result'));
            }
            resolve(encrypted);
        });
    });
}

// 1. Define certificate paths relative to project root
export const validatePemFile = (content: string, expectedType: 'CERTIFICATE' | 'PRIVATE KEY'): string => {
    const trimmed = content.trim();

    if (!trimmed) {
        throw new Error(`Empty ${expectedType} content`);
    }

    const beginMarker = `-----BEGIN ${expectedType}-----`;
    const endMarker = `-----END ${expectedType}-----`;

    if (!trimmed.includes(beginMarker) || !trimmed.includes(endMarker)) {
        throw new Error(`Invalid PEM format - missing ${expectedType} markers`);
    }

    // Verify base64 content between markers
    const base64Content = trimmed.split(beginMarker)[1]?.split(endMarker)[0]?.trim();
    if (!base64Content || !/^[A-Za-z0-9+/=\n]+$/.test(base64Content)) {
        throw new Error(`Invalid base64 content in ${expectedType}`);
    }

    return trimmed;
};


// 2. Validate and read certificates
export const loadAndValidateCertificate = (filePath: string, type: 'cert' | 'key'): string => {
    try {
        console.log(`Loading ${type} from:`, filePath);

        if (!fs.existsSync(filePath)) {
            throw new Error('File not found');
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const pemType = type === 'cert' ? 'CERTIFICATE' : 'PRIVATE KEY';
        const validated = validatePemFile(content, pemType);

        // Additional cryptographic validation
        if (type === 'cert') {
            require('crypto').createPublicKey(validated); // Will throw if invalid
        } else {
            require('crypto').createPrivateKey(validated); // Will throw if invalid
        }

        return validated;
    } catch (err) {
        throw new Error(`Invalid ${type}: ${err instanceof Error ? err.message : String(err)}`);
    }
};

export const encryptSamlResponse = async (xml: string): Promise<string> => {
    const certPaths = {
        spCert: loadFile('sp-cert.pem'),
        idpKey: loadFile('idp-private-key.pem')
    };

    try {
        const [spPublicCert, idpPrivateKey] = await Promise.all([
            loadAndValidateCertificate(certPaths.spCert, 'cert'),
            loadAndValidateCertificate(certPaths.idpKey, 'key')
        ]);

        const options: xmlenc.EncryptOptions = {
            rsa_pub: spPublicCert,
            pem: idpPrivateKey,
            encryptionAlgorithm: 'http://www.w3.org/2001/04/xmlenc#aes256-cbc',
            keyEncryptionAlgorithm: 'http://www.w3.org/2001/04/xmlenc#rsa-oaep-mgf1p'
        };

        return new Promise<string>((resolve, reject) => {
            xmlenc.encrypt(xml, options, (err, encrypted) => {
                if (err || !encrypted) {
                    reject(err || new Error('Encryption failed'));
                } else {
                    resolve(encrypted);
                }
            });
        });
    } catch (error) {
        console.error('SAML Encryption Error:', error);
        throw new Error(`SAML encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

export const sendSamlResponse = (res: Response, base64Response: string) => {
    const spUrl = `${envVars.SERVICE_PROVIDER}/sso/acs`;
    res.send(`
        <html>
            <body onload="document.forms[0].submit()">
                <form action="${spUrl}" method="POST">
                    <input type="hidden" name="SAMLResponse" value="${base64Response}">
                    ${envVars.RELAY_STATE ? `<input type="hidden" name="RelayState" value="${envVars.RELAY_STATE}">` : ''}
                </form>
            </body>
        </html>
    `);
}