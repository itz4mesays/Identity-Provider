// types/xml-encryption.d.ts
declare module 'xml-encryption' {
    export interface EncryptOptions {
        rsa_pub: string;
        pem: string;
        encryptionAlgorithm: string;
        keyEncryptionAlgorithm: string;
    }
    export function encrypt(
        content: string,
        options: EncryptOptions,
        callback: (error: Error | null, result?: string) => void
    ): void;
}