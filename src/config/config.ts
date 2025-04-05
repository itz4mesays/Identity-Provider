import fs from 'fs';
import path from 'path';
import envVars from '../validations/validateEnv';
import { IdentityProvider } from 'saml2-js';

export const loadFile = (filename: string): string => {
    const filePath = path.resolve(__dirname, '../../', filename);
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found:${filePath}`);
    }
    return fs.readFileSync(filePath, 'utf8');
};

export interface IdpConfig {
    entity_id: string;
    sso_login_url: string;
    sso_logout_url: string;
    privateKey: string;
    certificates: string[];
    assertEndpoint: string;
}

export const idpConfig: IdpConfig = {
    entity_id: `${envVars.IDP_PROVIDER_URL}/saml/idp`,
    sso_login_url: `${envVars.IDP_PROVIDER_URL}/saml/idp/login`,
    certificates: [loadFile('idp-cert.pem')],
    privateKey: loadFile('idp-private-key.pem'),
    assertEndpoint: `${envVars.IDP_PROVIDER_URL}/saml/idp/acs`,
    sso_logout_url: `${envVars.SERVICE_PROVIDER_URL}/saml/sp/logout`
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
        entityId: `${envVars.SERVICE_PROVIDER_URL}/saml/sp`,
        certificate: loadFile('sp-cert.pem'),
        audience: `${envVars.SERVICE_PROVIDER_URL}`,
        assertionConsumerService: `${envVars.SERVICE_PROVIDER_URL}/saml/acs`,
        wantAssertionsSigned: false
    }
};


// Initialize IdentityProvider WITHOUT method overrides
export const identityProvider = new IdentityProvider(idpConfig);