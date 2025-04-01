import fs from 'fs';
import path from 'path';

const loadFile = (filename: string): string => {
    const filePath = path.resolve(__dirname, '../../', filename);
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    return fs.readFileSync(filePath, 'utf8');
};

export interface IdpConfig {
    entityId: string;
    ssoLoginUrl: string;
    ssoLogoutUrl?: string;
    privateKey: string;
    certificates: string[];
    assertEndpoint: string;
}

export const idpConfig: IdpConfig = {
    entityId: 'http://localhost:7001/saml/idp',
    ssoLoginUrl: 'http://localhost:7001/sso/login',
    certificates: [loadFile('idp-cert.pem')],
    privateKey: loadFile('idp-private-key.pem'),
    assertEndpoint: 'http://localhost:7001/saml/assert'
};

export interface ServiceProviderConfig {
    entityId: string;
    certificate: string;
    audience: string;
    assertionConsumerService: string;
    wantAssertionsSigned?: boolean;
}

export const knownServiceProviders: Record<string, ServiceProviderConfig> = {
    sp1: {
        entityId: 'http://localhost:8000/saml/sp',
        certificate: loadFile('sp-cert.pem'),
        audience: 'http://localhost:8000',
        assertionConsumerService: 'http://localhost:8000/saml/acs',
        wantAssertionsSigned: false
    }
};