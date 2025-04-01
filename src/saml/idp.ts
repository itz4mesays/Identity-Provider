import { IdentityProvider } from 'saml2-js';
import fs from 'fs';

export interface IdpConfig {
    entityId: string;
    sso_login_url: string;
    sso_logout_url: string;
    certificates: string[];
    privateKey: string;
    assert_endpoint: string;
}

export const idpConfig: IdpConfig = {
    entityId: 'http://localhost:4015/saml/idp',
    sso_login_url: 'http://localhost:4015/sso/login',
    sso_logout_url: 'http://localhost:4015/sso/logout',
    certificates: [fs.readFileSync('./idp-cert.pem', 'utf8')],
    privateKey: fs.readFileSync('./idp-private-key.pem', 'utf8'),
    assert_endpoint: 'http://localhost:4015/saml/assert'
};

// Service Provider configuration that the IdP knows about
export const spConfig = {
    entityId: 'http://localhost:4016/saml/sp',
    audience: 'http://localhost:4016/saml/sp',
    certificate: fs.readFileSync('./sp-cert.pem', 'utf8'),
    callbackUrl: 'http://localhost:4016/saml/acs',
    logoutCallbackUrl: 'http://localhost:4016/saml/logout/callback'
};