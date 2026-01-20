const express = require("express");
const session = require("express-session");
const passport = require("passport");
const OpenIDConnectStrategy = require("passport-openidconnect").Strategy;
const config = require("./config");
const { decodeJWT } = require("./utils/jwt");
const { fetchChefsToken } = require("./utils/chefs");
const {
  loadPluginRegistry,
  getAllPlugins,
  getPlugin,
} = require("./utils/plugin-registry");
const authRefreshRoutes = require("./routes/auth-refresh");

const app = express();

// Configure session
app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true if using HTTPS
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Configure Passport with Keycloak OpenID Connect
passport.use(
  "keycloak",
  new OpenIDConnectStrategy(
    {
      issuer: config.keycloak.issuer,
      authorizationURL: config.keycloak.authorizationURL,
      tokenURL: config.keycloak.tokenURL,
      userInfoURL: config.keycloak.userInfoURL,
      clientID: config.keycloak.clientID,
      clientSecret: config.keycloak.clientSecret,
      callbackURL: config.keycloak.callbackURL,
      scope: "openid profile email",
    },
    (
      issuer,
      profile,
      context,
      idToken,
      accessToken,
      refreshToken,
      params,
      done
    ) => {
      // The 'sub' (subject) is available in profile.id
      // context contains additional context/claims
      // idToken is the ID token (separate parameter)
      // params contains additional token response parameters

      return done(null, {
        id: profile.id,
        username: profile.preferred_username || profile.username || profile.id,
        email: profile.email,
        name: profile.displayName || profile.name,
        accessToken: accessToken,
        refreshToken: refreshToken,
        idToken: idToken, // Store ID token for logout
      });
    }
  )
);

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialize user from session
passport.deserializeUser((user, done) => {
  done(null, user);
});

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/auth/login");
};

// Set view engine
app.set("view engine", "ejs");
app.set("views", "./views");

// Middleware for parsing request bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static files
app.use(express.static("public"));

// Helper function to decode tokens for display
function decodeUserTokens(user) {
  if (!user) return null;

  return {
    accessToken: user.accessToken ? decodeJWT(user.accessToken) : null,
    idToken: user.idToken ? decodeJWT(user.idToken) : null,
    refreshToken: user.refreshToken ? decodeJWT(user.refreshToken) : null,
  };
}

// Routes
app.get("/", (req, res) => {
  const decodedTokens = req.user ? decodeUserTokens(req.user) : null;
  res.render("public", {
    title: "Public Page",
    user: req.user,
    isAuthenticated: req.isAuthenticated(),
    decodedTokens: decodedTokens,
  });
});

app.get("/protected", requireAuth, (req, res) => {
  const decodedTokens = decodeUserTokens(req.user);
  res.render("protected", {
    title: "Protected Page",
    user: req.user,
    decodedTokens: decodedTokens,
  });
});

app.get("/chefs-embed", requireAuth, async (req, res, next) => {
  try {
    const decodedTokens = decodeUserTokens(req.user);

    // Fetch CHEFS auth token from gateway endpoint
    const authToken = await fetchChefsToken(
      config.chefs.formId,
      config.chefs.apiKey,
      config.chefs.baseUrl
    );

    // Prepare token object for Form.io evalContext (optional)
    // Pass the complete accessToken payload to the web component
    const tokenObject =
      decodedTokens?.accessToken?.payload ||
      decodedTokens?.idToken?.payload ||
      null;

    // Build user object for Form.io evalContext from bearer payload
    const bearerPayload = decodedTokens?.accessToken?.payload;
    const userObject = bearerPayload
      ? {
          sub: bearerPayload.sub,
          given_name: bearerPayload.given_name,
          family_name: bearerPayload.family_name,
          email: bearerPayload.email,
        }
      : null;

    // Prepare headers object for Form.io evalContext
    // Include request headers and Authorization Bearer token
    const headersObject = {
      ...req.headers,
      Authorization: req.user?.accessToken
        ? `Bearer ${req.user.accessToken}`
        : null,
    };
    // Remove undefined/null values
    Object.keys(headersObject).forEach(
      (key) => headersObject[key] == null && delete headersObject[key]
    );

    // Render the EJS template with all required variables
    res.render("chefs-embed", {
      title: "CHEFS Embed",
      user: req.user,
      formId: config.chefs.formId,
      authToken: authToken,
      baseUrl: config.chefs.baseUrl,
      token: tokenObject, // optional - can be null/undefined if not needed
      user: userObject, // optional user object for Form.io evalContext
      headers: headersObject, // Request headers for Form.io evalContext
      decodedTokens: decodedTokens,
      error: null,
    });
  } catch (error) {
    console.error("Error loading CHEFS embed:", error);
    const decodedTokensError = decodeUserTokens(req.user);
    res.status(500).render("chefs-embed", {
      title: "CHEFS Embed",
      user: req.user,
      error: "Failed to load CHEFS form. Please try again later.",
      formId: config.chefs.formId,
      baseUrl: config.chefs.baseUrl,
      authToken: null,
      token: null,
      user: null,
      headers: null,
      decodedTokens: decodedTokensError,
    });
  }
});

// Plugin directory listing
app.get("/chefs-embed-plugins", requireAuth, (req, res) => {
  res.render("chefs-embed-plugins", {
    title: "CHEFS Plugin Directory",
    user: req.user,
    plugins: getAllPlugins(),
  });
});

// Plugin-driven CHEFS embed
app.get("/chefs-embed-plugin", requireAuth, async (req, res) => {
  try {
    const plugins = getAllPlugins();
    const pluginSlug = req.query.plugin || (plugins[0]?.slug ?? null);
    const plugin = getPlugin(pluginSlug);
    if (!plugin) {
      return res.status(404).render("chefs-embed-plugin", {
        title: "CHEFS Plugin Embed",
        user: req.user,
        error: pluginSlug
          ? `Plugin "${pluginSlug}" not found.`
          : "No plugins are available.",
        formId: null,
        authToken: null,
        baseUrl: null,
        requestContext: null,
        plugin: null,
      });
    }

    const decodedTokens = decodeUserTokens(req.user);

    // Keep auth acquisition server-side (form-id + api-key)
    const authToken = await fetchChefsToken(
      plugin.formId || config.chefs.formId,
      plugin.apiKey || config.chefs.apiKey,
      plugin.baseUrl || config.chefs.baseUrl
    );

    // Raw context passed to the plugin so it can shape token/headers
    const requestContext = {
      headers: req.headers,
      bearerToken: req.user?.accessToken || null,
      tokenExpiresAt: decodedTokens?.accessToken?.payload?.exp || null,
      decoded: decodedTokens,
    };

    res.render("chefs-embed-plugin", {
      title: "CHEFS Plugin Embed",
      user: req.user,
      formId: plugin.formId || config.chefs.formId,
      authToken,
      baseUrl: plugin.baseUrl || config.chefs.baseUrl,
      requestContext,
      plugin,
      error: null,
    });
  } catch (error) {
    console.error("Error loading CHEFS plugin embed:", error);
    res.status(500).render("chefs-embed-plugin", {
      title: "CHEFS Plugin Embed",
      user: req.user,
      error: "Failed to load CHEFS plugin embed. Please try again later.",
      formId: null,
      baseUrl: null,
      authToken: null,
      requestContext: null,
      plugin: null,
    });
  }
});

// Auth routes
app.use("/auth", authRefreshRoutes);
app.get("/auth/login", passport.authenticate("keycloak"));

app.get(
  "/auth/callback",
  passport.authenticate("keycloak", {
    successRedirect: "/protected",
    failureRedirect: "/auth/login",
  })
);

app.get("/auth/logout", (req, res) => {
  // Store the ID token before destroying session
  const idToken = req.user?.idToken;
  const postLogoutRedirectUri = "http://localhost:3333/";

  // Destroy local session first
  req.logout((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.redirect("/");
    }

    // Build Keycloak logout URL with proper parameters
    const logoutParams = new URLSearchParams({
      post_logout_redirect_uri: postLogoutRedirectUri,
      client_id: config.keycloak.clientID,
    });

    // Add id_token_hint if available for better UX (skips confirmation page)
    if (idToken) {
      logoutParams.append("id_token_hint", idToken);
    }

    const keycloakLogoutURL = `${config.keycloak.issuer}/protocol/openid-connect/logout?${logoutParams.toString()}`;
    res.redirect(keycloakLogoutURL);
  });
});

// Start server
(async () => {
  // Load plugin registry before starting server
  await loadPluginRegistry();

  app.listen(config.port, () => {
    console.log(`Server running on http://localhost:${config.port}`);
    console.log(`Keycloak configured at: ${config.keycloak.issuer}`);
  });
})();
