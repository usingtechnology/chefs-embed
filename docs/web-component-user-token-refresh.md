# User Token Refresh - Plugin-Driven Integration

This document describes how plugins integrate with the `chefs-form-viewer` web component's user token refresh functionality.

## Overview

Each plugin can configure its own OIDC provider for user token refresh. This allows different plugins to use different identity providers, with the refresh handled server-side for security.

If a plugin does not provide token refresh configuration, token refresh is disabled for that plugin (no fallback to host configuration).

## Architecture

```
Plugin Manifest                 Host Server                    OIDC Provider
     |                              |                              |
     |--tokenRefresh.oidc---------->|                              |
     |  { tokenEndpoint, clientId } |                              |
     |                              |                              |
     |                    [Registers in plugin                     |
     |                     OIDC registry at startup]               |
     |                              |                              |
                                    |                              |
Client (Browser)                    |                              |
     |                              |                              |
     |---POST /auth/refresh-token-->|                              |
     |   { pluginId }               |                              |
     |                              |--[lookup OIDC config]        |
     |                              |                              |
     |                              |---token refresh request----->|
     |                              |                              |
     |                              |<------new tokens-------------|
     |                              |                              |
     |<----{ accessToken }----------|                              |
```

## Plugin Configuration

Plugins declare their OIDC configuration in the manifest. There are two options:

### Option 1: Use Host Application's OIDC

Set `oidc: "host"` to use the host application's Keycloak configuration:

```javascript
export const manifest = {
  slug: "my-plugin",
  name: "My Plugin",
  // ... other manifest fields ...

  tokenRefresh: {
    oidc: "host", // Uses host app's Keycloak config
    buffer: 60,
  },
};
```

### Option 2: Custom OIDC Provider

Provide `{ tokenEndpoint, clientId }` for a custom OIDC provider:

```javascript
export const manifest = {
  slug: "my-plugin",
  name: "My Plugin",
  // ... other manifest fields ...

  tokenRefresh: {
    oidc: {
      tokenEndpoint:
        "https://keycloak.example.com/realms/myrealm/protocol/openid-connect/token",
      clientId: "my-public-client",
    },
    buffer: 60,
  },
};
```

### Option 3: No Token Refresh

Omit `tokenRefresh` entirely to disable user token refresh for the plugin.

### Configuration Fields

| Field                             | Type           | Required | Default | Description                                                    |
| --------------------------------- | -------------- | -------- | ------- | -------------------------------------------------------------- |
| `tokenRefresh`                    | object         | No       | -       | Token refresh configuration block                              |
| `tokenRefresh.oidc`               | object\|"host" | Yes\*    | -       | OIDC config object, or "host" to use host app's config         |
| `tokenRefresh.oidc.tokenEndpoint` | string         | Yes\*\*  | -       | Full URL to the OIDC token endpoint (\*\*if oidc is an object) |
| `tokenRefresh.oidc.clientId`      | string         | Yes\*\*  | -       | The public client ID (\*\*if oidc is an object)                |
| `tokenRefresh.buffer`             | number         | No       | 60      | Seconds before expiry to trigger refresh                       |

## Files

| File                               | Purpose                                                     |
| ---------------------------------- | ----------------------------------------------------------- |
| `utils/plugin-registry.js`         | Loads and caches plugin manifests at startup                |
| `routes/auth-refresh.js`           | Server-side endpoint that refreshes token via plugin's OIDC |
| `public/lib/user-token-refresh.js` | Client-side helper that handles the refresh lifecycle       |
| `views/chefs-embed-plugin.ejs`     | Wires the helper to the viewer based on plugin config       |

## Server-Side: Plugin Registry

At server startup, the plugin registry loads all plugin manifests:

```javascript
const {
  loadPluginRegistry,
  getAllPlugins,
  getPlugin,
  getPluginsWithTokenRefresh,
  getPluginOidcConfig,
} = require("./utils/plugin-registry");

// Load all plugins at startup
await loadPluginRegistry();

// Get all plugins
const plugins = getAllPlugins();

// Get a specific plugin by slug
const plugin = getPlugin("my-plugin");

// Get plugins that have token refresh configured
const refreshablePlugins = getPluginsWithTokenRefresh();

// Get OIDC config for token refresh (convenience method)
// Returns { tokenEndpoint, clientId, buffer } or null
const oidc = getPluginOidcConfig("my-plugin");
```

## Server-Side: Token Refresh Endpoint

The refresh endpoint accepts `pluginId` in the request body and looks up the OIDC config:

```
POST /auth/refresh-token
Content-Type: application/json

{ "pluginId": "my-plugin" }
```

Response:

```json
{
  "accessToken": "eyJ...",
  "expiresAt": 1737312000,
  "payload": { "sub": "...", ... }
}
```

Error responses:

- `400` - Missing pluginId or plugin has no token refresh configured
- `401` - Not authenticated or no refresh token available
- `500` - Token refresh failed

## Client-Side: Token Refresh Helper

The helper listens for `formio:userTokenExpiring` events and calls the refresh endpoint:

```javascript
import { initUserTokenRefresh } from "/lib/user-token-refresh.js";

const refresher = initUserTokenRefresh(viewer, {
  pluginId: "my-plugin", // Required: identifies which OIDC config to use
  initialToken: accessToken, // Sets up initial token and schedules refresh
  buffer: 60, // Notify 60 seconds before expiry (default)
  onRefreshFailed: (reason) => {
    console.warn("Token refresh failed:", reason);
  },
  onRefreshSuccess: () => {
    console.log("Token refreshed successfully");
  },
});

// Returns null if pluginId is not provided
// Later, if needed:
// refresher?.unbind();
```

### Helper Options

| Option             | Type     | Required | Default               | Description                                       |
| ------------------ | -------- | -------- | --------------------- | ------------------------------------------------- |
| `pluginId`         | string   | Yes      | -                     | The plugin's slug identifier                      |
| `initialToken`     | string   | No       | null                  | Initial bearer token to set up refresh scheduling |
| `refreshUrl`       | string   | No       | `/auth/refresh-token` | Endpoint to call for token refresh                |
| `buffer`           | number   | No       | 60                    | Seconds before expiry to trigger refresh          |
| `onRefreshFailed`  | function | No       | null                  | Called when refresh fails                         |
| `onRefreshSuccess` | function | No       | null                  | Called when refresh succeeds                      |

## EJS Template Integration

The template conditionally initializes token refresh based on plugin configuration:

```html
<% if (plugin?.tokenRefresh?.oidc) { %> initUserTokenRefresh(viewer, { pluginId:
"<%= plugin.slug %>", initialToken: requestContext.bearerToken, buffer: <%=
plugin.tokenRefresh.buffer || 60 %>, onRefreshFailed: (reason) => { /* ... */ },
onRefreshSuccess: () => { /* ... */ } }); <% } else { %> console.log("Token
refresh not configured for this plugin"); <% } %>
```

## Web Component Interface

The web component provides a method-based interface:

### `refreshUserToken({ token, expiresAt?, buffer? })`

| Parameter   | Type   | Required | Default | Description                                         |
| ----------- | ------ | -------- | ------- | --------------------------------------------------- |
| `token`     | string | Yes      | -       | The bearer token (JWT)                              |
| `expiresAt` | number | No       | -       | Override expiry for non-JWT tokens (Unix timestamp) |
| `buffer`    | number | No       | 60      | Seconds before expiry to emit notification          |

### Events

| Event                       | When Emitted                          | Detail Payload                            |
| --------------------------- | ------------------------------------- | ----------------------------------------- |
| `formio:userTokenExpiring`  | `buffer` seconds before token expires | `{ expiresAt: number, expired: boolean }` |
| `formio:userTokenRefreshed` | After `refreshUserToken()` is called  | `{ expiresAt: number \| null }`           |

## Example Plugin

See `public/plugins/token-refresh-demo.js` for a complete example of a plugin with token refresh configured.

## Notes

1. **No fallback** - If a plugin does not provide `tokenRefresh.oidc`, token refresh is completely disabled for that plugin. There is no fallback to host configuration.

2. **Server-side refresh** - The refresh token is stored server-side in the session and never exposed to the browser. Only the access token is returned to the client.

3. **Public clients only** - This implementation assumes public OIDC clients (no client secret required). For confidential clients, additional configuration would be needed.

4. **Registry loaded at startup** - Plugin OIDC configurations are loaded once at server startup. If you add or modify plugin configurations, restart the server.

5. **JWT expiry auto-extraction** - The web component extracts the `exp` claim from JWT tokens automatically.
