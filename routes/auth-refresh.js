/**
 * User Token Refresh Route
 *
 * Isolated endpoint for refreshing the user's OIDC access token.
 * Each plugin provides its own OIDC configuration (tokenEndpoint, clientId).
 * The client passes the pluginId, and this endpoint looks up the config
 * from the plugin registry.
 *
 * If a plugin does not have OIDC configuration, token refresh is disabled
 * for that plugin (no fallback to host config).
 */
const express = require("express");
const { getPluginOidcConfig } = require("../utils/plugin-registry");

const router = express.Router();

/**
 * POST /auth/refresh-token
 *
 * Refreshes the user's access token using the stored refresh token.
 * Looks up OIDC configuration from the plugin registry based on pluginId.
 *
 * Request body: { pluginId: string }
 * Response: { accessToken, expiresAt, payload }
 */
router.post("/refresh-token", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { pluginId } = req.body || {};
  if (!pluginId) {
    return res.status(400).json({ error: "pluginId is required" });
  }

  const oidc = getPluginOidcConfig(pluginId);
  if (!oidc) {
    return res.status(400).json({
      error: `Plugin "${pluginId}" does not have token refresh configured`,
    });
  }

  const refreshToken = req.user?.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ error: "No refresh token available" });
  }

  try {
    const tokenResponse = await fetch(oidc.tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: oidc.clientId,
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
      // OIDC providers may rotate refresh tokens
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
