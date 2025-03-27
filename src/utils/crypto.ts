import crypto from 'crypto';
import envVars from '../validations/validateEnv';

const algorithm = 'aes-256-cbc';
const ENCRYPTION_KEY = envVars.ENCRYPTION_KEY; // Must be 32 bytes
const IV_LENGTH = 16; // For AES, this is always 16

if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY is not defined in environment variables');
}

if (ENCRYPTION_KEY.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 characters long (32 bytes in hex)');
}

export function encrypt(text: string): string {
    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(
            algorithm,
            Buffer.from(ENCRYPTION_KEY, 'hex'), // Convert from hex string
            iv
        );
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return `${iv.toString('hex')}:${encrypted}`;
    } catch (err: any) {
        throw new Error(`Encryption failed: ${err.message}`);
    }
}

export function decrypt(text: string): string {
    try {
        const [ivHex, encryptedText] = text.split(':');
        if (!ivHex || !encryptedText) {
            throw new Error('Invalid encrypted text format');
        }
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv(
            algorithm,
            Buffer.from(ENCRYPTION_KEY, 'hex'), // Convert from hex string
            iv
        );
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (err: any) {
        throw new Error(`Decryption failed: ${err.message}`);
    }
}