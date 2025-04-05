import { parseStringPromise } from 'xml2js';
import { IdentityProvider } from 'saml2-js';
import querystring from 'querystring';

export class SamlParser {
    private idp: IdentityProvider;

    constructor(idp: IdentityProvider) {
        this.idp = idp;
    }

    async parseRequest(SAMLRequest: string): Promise<any> {
        const methods = ['parseRequest', 'parse_login_request', 'parse_request'];

        // Decode URL first
        const urlDecoded = decodeURIComponent(SAMLRequest);

        for (const method of methods) {
            if (typeof (this.idp as any)[method] === 'function') {
                return new Promise((resolve, reject) => {
                    (this.idp as any)[method](urlDecoded, (err: Error, data: any) => {
                        err ? reject(err) : resolve(data);
                    });
                });
            }
        }

        // fallback
        try {
            const xml = Buffer.from(urlDecoded, 'base64').toString('utf8');
            console.log('Decoded XML:', xml);
            return await parseStringPromise(xml);
        } catch (err) {
            throw new Error(`SAML Parse Failed: ${err.message}`);
        }
    }
}
