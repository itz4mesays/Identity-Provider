import crypto from 'crypto';

// Add this validation before encryption
export const validateKeyPair = (publicCert: string, privateKey: string) => {
    try {
        const pubKey = crypto.createPublicKey(publicCert);
        const privKey = crypto.createPrivateKey(privateKey);

        // Test encryption/decryption (RSA only)
        const testData = 'test';
        const encrypted = crypto.publicEncrypt(
            pubKey,
            Buffer.from(testData)
        );
        crypto.privateDecrypt(privKey, encrypted); // Throws if keys don't match

    } catch (err) {
        throw new Error(`Key validation failed: ${err instanceof Error ? err.message : String(err)}`);
    }
};