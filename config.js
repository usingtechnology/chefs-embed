require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3333,
  sessionSecret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  keycloak: {
    issuer: process.env.KEYCLOAK_ISSUER || 'http://localhost:7777/realms/chefs-embed',
    clientID: process.env.KEYCLOAK_CLIENT_ID || 'express-app',
    clientSecret: process.env.KEYCLOAK_CLIENT_SECRET || '', // Not needed for public client
    callbackURL: process.env.KEYCLOAK_CALLBACK_URL || 'http://localhost:3333/auth/callback',
    authorizationURL: process.env.KEYCLOAK_AUTHORIZATION_URL || 'http://localhost:7777/realms/chefs-embed/protocol/openid-connect/auth',
    tokenURL: process.env.KEYCLOAK_TOKEN_URL || 'http://localhost:7777/realms/chefs-embed/protocol/openid-connect/token',
    userInfoURL: process.env.KEYCLOAK_USERINFO_URL || 'http://localhost:7777/realms/chefs-embed/protocol/openid-connect/userinfo'
  },
  chefs: {
    baseUrl: process.env.CHEFS_BASE_URL || 'https://chefs-dev.apps.silver.devops.gov.bc.ca/app',
    formId: process.env.CHEFS_FORM_ID || '7f936e1e-824c-4478-9880-8506430cfd43',
    apiKey: process.env.CHEFS_API_KEY || '08d72bd2-0675-45d5-9aea-0c042db5ddf7'
  }
};
