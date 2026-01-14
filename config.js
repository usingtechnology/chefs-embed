require("dotenv").config();

module.exports = {
  port: process.env.PORT || 3333,
  sessionSecret:
    process.env.SESSION_SECRET || "your-secret-key-change-in-production",
  keycloak: {
    issuer:
      process.env.KEYCLOAK_ISSUER || "http://localhost:7777/realms/chefs-embed",
    clientID: process.env.KEYCLOAK_CLIENT_ID || "express-app",
    clientSecret: process.env.KEYCLOAK_CLIENT_SECRET || "", // Not needed for public client
    callbackURL:
      process.env.KEYCLOAK_CALLBACK_URL ||
      "http://localhost:3333/auth/callback",
    authorizationURL:
      process.env.KEYCLOAK_AUTHORIZATION_URL ||
      "http://localhost:7777/realms/chefs-embed/protocol/openid-connect/auth",
    tokenURL:
      process.env.KEYCLOAK_TOKEN_URL ||
      "http://localhost:7777/realms/chefs-embed/protocol/openid-connect/token",
    userInfoURL:
      process.env.KEYCLOAK_USERINFO_URL ||
      "http://localhost:7777/realms/chefs-embed/protocol/openid-connect/userinfo",
  },
  chefs: {
    baseUrl:
      process.env.CHEFS_BASE_URL ||
      "https://chefs-dev.apps.silver.devops.gov.bc.ca/pr-1802",
    formId: process.env.CHEFS_FORM_ID || "3145c95c-337e-41e5-836c-138cf1256bc9",
    apiKey: process.env.CHEFS_API_KEY || "a7464f97-9377-42ee-9f73-7c2d4250c132",
  },
};
