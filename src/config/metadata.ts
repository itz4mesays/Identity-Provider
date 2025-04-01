import { create } from 'xmlbuilder2';
import fs from 'fs';
import path from 'path';

export function generateIdpMetadata(entityId: string, ssoUrl: string, certPath: string): string {
    try {
        // Read and clean certificate
        const cert = fs.readFileSync(path.resolve(certPath), 'utf8')
            .replace(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\s+/g, '');

        const ns = {
            md: 'urn:oasis:names:tc:SAML:2.0:metadata',
            ds: 'http://www.w3.org/2000/09/xmldsig#'
        };

        const metadata = create({ version: '1.0', encoding: 'UTF-8' })
            .ele(ns.md, 'EntityDescriptor', {
                entityID: entityId,
                'xmlns:md': ns.md,
                'xmlns:ds': ns.ds
            })
            .ele(ns.md, 'IDPSSODescriptor', {
                protocolSupportEnumeration: 'urn:oasis:names:tc:SAML:2.0:protocol'
            })
            .ele(ns.md, 'KeyDescriptor', { use: 'signing' })
            .ele(ns.ds, 'KeyInfo')
            .ele(ns.ds, 'X509Data')
            .ele(ns.ds, 'X509Certificate').txt(cert).up().up().up()
            .ele(ns.md, 'SingleSignOnService', {
                Binding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
                Location: ssoUrl
            })
            .up()
            .ele(ns.md, 'NameIDFormat')
            .txt('urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress')
            .end({ prettyPrint: true });

        return metadata;
    } catch (error: any) {
        console.error('Metadata generation failed:', error);
        throw new Error('Failed to generate metadata: ' + error.message);
    }
}