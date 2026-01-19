# User Token Refresh - Host Application Integration

This document describes how the host application integrates with the `chefs-form-viewer` web component's user token refresh functionality.

## Overview

The host application's user (from OIDC/OAuth) has an access token that expires. While the user is filling out a form, the host needs to:

1. Provide the initial token to the web component
2. Listen for token expiry notifications
3. Refresh the token via its OIDC provider
4. Update the web component with the new token

This is separate from the CHEFS API auth token (`auth-token` attribute) which is managed by the web component's existing `formio:authTokenRefreshed` mechanism.

## Web Component Interface

The web component provides a simplified method-based interface:

### `refreshUserToken({ token, expiresAt?, buffer? })`

| Parameter   | Type   | Required | Default | Description                                         |
| ----------- | ------ | -------- | ------- | --------------------------------------------------- |
| `token`     | string | Yes      | -       | The bearer token (JWT)                              |
| `expiresAt` | number | No       | -       | Override expiry for non-JWT tokens (Unix timestamp) |
| `buffer`    | number | No       | 60      | Seconds before expiry to emit notification          |

The component automatically extracts expiry from JWT tokens, so `expiresAt` is only needed for opaque (non-JWT) tokens.

### Events

| Event                       | When Emitted                          | Detail Payload                            |
| --------------------------- | ------------------------------------- | ----------------------------------------- |
| `formio:userTokenExpiring`  | `buffer` seconds before token expires | `{ expiresAt: number, expired: boolean }` |
| `formio:userTokenRefreshed` | After `refreshUserToken()` is called  | `{ expiresAt: number \| null }`           |

## Host Application Implementation

### Architecture

```
Host App                    Web Component                  Host Server
    |                            |                              |
    |---refreshUserToken-------->|                              |
    |   ({ token })              |                              |
    |                            |                              |
    |                     [extracts JWT expiry]                 |
    |                     [updates headers]                     |
    |                     [schedules timer]                     |
    |                            |                              |
    |<--formio:userTokenRefreshed|                              |
    |                            |                              |
    |                     [timer fires at                       |
    |                      expires - 60s]                       |
    |                            |                              |
    |<--formio:userTokenExpiring-|                              |
    |                            |                              |
    |---POST /auth/refresh-------|----------------------------->|
    |                            |                              |
    |<---------------------------|------(new token)-------------|
    |                            |                              |
    |---refreshUserToken-------->|                              |
    |   ({ token })              |                              |
    |                            |                              |
    |<--formio:userTokenRefreshed|                              |
    |                            |                              |
    |                     [reschedules timer]                   |
```

### Files

| File                               | Purpose                                                |
| ---------------------------------- | ------------------------------------------------------ |
| `routes/auth-refresh.js`           | Server-side endpoint that refreshes token via Keycloak |
| `public/lib/user-token-refresh.js` | Client-side helper that handles the refresh lifecycle  |
| `views/chefs-embed-plugin.ejs`     | Wires the helper to the viewer                         |

### Server-Side: Token Refresh Endpoint

See `routes/auth-refresh.js` for the full implementation. The endpoint:

1. Validates the user is authenticated
2. Uses the stored refresh token to get a new access token from Keycloak
3. Updates the session with new tokens
4. Returns `{ accessToken, expiresAt, payload }`

### Client-Side: Token Refresh Helper

See `public/lib/user-token-refresh.js` for the full implementation. The helper:

1. Listens for `formio:userTokenExpiring` events from the web component
2. Calls the refresh endpoint to get a new token
3. Updates the web component via `refreshUserToken()`

### EJS Template Integration

See `views/chefs-embed-plugin.ejs` for the full implementation. Usage:

```javascript
import { initUserTokenRefresh } from "/lib/user-token-refresh.js";

// After setting up the viewer...
initUserTokenRefresh(viewer, {
  initialToken: requestContext.bearerToken,
  buffer: 60, // Optional: notify 60s before expiry (default)
  onRefreshFailed: (reason) => {
    console.warn("[chefs-embed] Token refresh failed:", reason);
    // Optionally redirect to login:
    // window.location.href = "/auth/login";
  },
  onRefreshSuccess: () => {
    console.log("[chefs-embed] User token refreshed");
  },
});
```

## Configuration Options

### Helper Options

| Option             | Type     | Default               | Description                                       |
| ------------------ | -------- | --------------------- | ------------------------------------------------- |
| `initialToken`     | string   | null                  | Initial bearer token to set up refresh scheduling |
| `refreshUrl`       | string   | `/auth/refresh-token` | Endpoint to call for token refresh                |
| `buffer`           | number   | 60                    | Seconds before expiry to trigger refresh          |
| `onRefreshFailed`  | function | null                  | Called when refresh fails                         |
| `onRefreshSuccess` | function | null                  | Called when refresh succeeds                      |

## Notes

1. **No DOM attributes for tokens** - The simplified interface uses only the `refreshUserToken()` method. Sensitive tokens are not stored in DOM attributes.

2. **JWT expiry auto-extraction** - The web component extracts the `exp` claim from JWT tokens automatically, so you don't need to pass expiry separately.

3. **Default 60-second buffer** - Matches the CHEFS auth token behavior. Adjust via the `buffer` option if needed.

4. **evalContext updates** - The web component updates both its internal headers and the live Form.io `evalContext.headers`, so custom JavaScript in the form has access to the current token.

5. **Token expiry handling** - If the token is already expired when `refreshUserToken()` is called, `userTokenExpiring` fires immediately with `expired: true`.
