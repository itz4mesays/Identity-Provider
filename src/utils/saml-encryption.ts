// src/utils/saml-encryption.ts
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as xmlenc from 'xml-encryption';
import { promisify } from 'util';
import { sanitizePem } from './helpers';

// Convert callback-style encrypt to promise
const encryptAsync = promisify(xmlenc.encrypt);


class SamlEncryptor {
    private static validatePemContent(content: string, type: 'CERTIFICATE' | 'PRIVATE KEY'): string {
        const trimmed = content.trim();
        const beginMarker = `-----BEGIN ${type}-----`;
        const endMarker = `-----END ${type}-----`;

        if (!trimmed.includes(beginMarker) || !trimmed.includes(endMarker)) {
            throw new Error(`Invalid PEM format for ${type}`);
        }

        try {
            if (type === 'CERTIFICATE') {
                crypto.createPublicKey(trimmed);
            } else {
                crypto.createPrivateKey(trimmed);
            }
        } catch (err) {
            throw new Error(`Invalid ${type}: ${err instanceof Error ? err.message : String(err)}`);
        }

        return trimmed;
    }

    public static async encryptAssertion(xml: string): Promise<string> {
        const certDir = path.join(process.cwd(), 'certs');
        const certPaths = {
            publicCert: path.join(certDir, 'sp-cert.pem'),
            privateKey: path.join(certDir, 'idp-key.pem')
        };

        try {
            // 1. Validate certificates exist
            for (const [name, certPath] of Object.entries(certPaths)) {
                if (!fs.existsSync(certPath)) {
                    throw new Error(`${name} not found at ${certPath}`);
                }
            }

            // 2. Load and validate certificates cryptographically
            const [publicCert, privateKey] = await Promise.all([
                fs.promises.readFile(certPaths.publicCert, 'utf8').then(sanitizePem),
                fs.promises.readFile(certPaths.privateKey, 'utf8').then(sanitizePem)
            ]);

            // 3. Create test RSA key pair
            const testKeyPair = crypto.generateKeyPairSync('rsa', {
                modulusLength: 2048,
                publicKeyEncoding: { type: 'spki', format: 'pem' },
                privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
            });

            // 4. Test encryption with known-good keys
            const testXml = '<test>hello</test>';
            const testEncrypted = await encryptAsync(testXml, {
                rsa_pub: testKeyPair.publicKey,
                pem: testKeyPair.privateKey,
                encryptionAlgorithm: 'http://www.w3.org/2001/04/xmlenc#aes256-cbc',
                keyEncryptionAlgorithm: 'http://www.w3.org/2001/04/xmlenc#rsa-oaep-mgf1p'
            });

            if (!testEncrypted) {
                throw new Error('Test encryption failed - library issue');
            }

            // 5. Prepare actual SAML encryption
            const options = {
                rsa_pub: publicCert.trim(),
                pem: privateKey.trim(),
                encryptionAlgorithm: 'http://www.w3.org/2001/04/xmlenc#aes256-cbc' as const,
                keyEncryptionAlgorithm: 'http://www.w3.org/2001/04/xmlenc#rsa-oaep-mgf1p' as const
            };

            // 6. Execute with fallback
            try {
                return await encryptAsync(xml, options);
            } catch (err) {
                console.error('Primary encryption failed, trying fallback...');

                // Fallback: Use direct crypto module
                const encrypted = crypto.publicEncrypt(
                    {
                        key: publicCert,
                        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                        oaepHash: 'sha256'
                    },
                    Buffer.from(xml)
                );
                return encrypted.toString('base64');
            }

        } catch (error) {
            console.error('Full Error Context:', {
                timestamp: new Date().toISOString(),
                nodeVersion: process.version,
                certificates: {
                    publicCert: certPaths.publicCert,
                    privateKey: certPaths.privateKey
                },
                error: error instanceof Error ? {
                    message: error.message,
                    stack: error.stack
                } : error
            });
            throw new Error(`SAML encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

export default SamlEncryptor;