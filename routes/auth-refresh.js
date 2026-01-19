/**
 * User Token Refresh Route
 *
 * Isolated endpoint for refreshing the user's OIDC access token via the
 * configured Keycloak token endpoint. This keeps token refresh logic
 * separate from form plugins and other application code.
 */
const express = require("express");
const config = require("../config");

const router = express.Router();

/**
 * POST /auth/refresh-token
 *
 * Refreshes the user's access token using the stored refresh token.
 * Updates the session with new tokens and returns the new access token
 * along with its expiry timestamp.
 *
 * Response: { accessToken, expiresAt, payload }
 */
router.post("/refresh-token", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const refreshToken = req.user?.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ error: "No refresh token available" });
  }

  try {
    const tokenResponse = await fetch(config.keycloak.tokenURL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: config.keycloak.clientID,
        refresh_token: refreshToken,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token refresh failed:", errorText);
      return res.status(401).json({ error: "Token refresh failed" });
    }

    const tokens = await tokenResponse.json();

    // Update session with new tokens
    req.user.accessToken = tokens.access_token;
    if (tokens.refresh_token) {
      // Keycloak may rotate refresh tokens
      req.user.refreshToken = tokens.refresh_token;
    }

    // Decode the new access token to extract expiry and payload
    const [, payloadB64] = tokens.access_token.split(".");
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());

    res.json({
      accessToken: tokens.access_token,
      expiresAt: payload.exp,
      payload,
    });
  } catch (err) {
    console.error("Token refresh error:", err);
    res.status(500).json({ error: "Internal error during token refresh" });
  }
});

module.exports = router;
