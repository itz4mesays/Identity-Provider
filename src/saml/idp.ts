import { IdentityProvider } from 'saml2-js'
import fs from 'fs'

// SAML Service Provider (SP) configuration
export const identityProvider = new IdentityProvider({
    sso_login_url: "http://localhost:4015/sso/login",
    sso_logout_url: "http://localhost:4015/sso/logout",
    certificates: [fs.readFileSync("./idp-cert.pem", "utf8")], // IdP Certificate
});