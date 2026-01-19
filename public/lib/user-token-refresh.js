/**
 * User Token Refresh Helper
 *
 * Client-side module that listens for token expiry events from the
 * chefs-form-viewer web component and automatically refreshes the
 * user's access token via the host application's refresh endpoint.
 *
 * The web component automatically extracts JWT expiry from tokens,
 * so this helper only needs to provide the token string.
 *
 * This keeps token refresh logic isolated from form plugins.
 */

/**
 * UserTokenRefresh class handles automatic token refresh for the web component.
 */
export class UserTokenRefresh {
  /**
   * @param {HTMLElement} viewer - The chefs-form-viewer element
   * @param {Object} options - Configuration options
   * @param {string} [options.initialToken] - Initial bearer token to set up refresh scheduling
   * @param {string} [options.refreshUrl="/auth/refresh-token"] - Endpoint to call for refresh
   * @param {number} [options.buffer=60] - Seconds before expiry to trigger refresh
   * @param {Function} [options.onRefreshFailed] - Callback when refresh fails
   * @param {Function} [options.onRefreshSuccess] - Callback when refresh succeeds
   */
  constructor(viewer, options = {}) {
    this.viewer = viewer;
    this.initialToken = options.initialToken || null;
    this.refreshUrl = options.refreshUrl || "/auth/refresh-token";
    this.buffer = options.buffer || 60;
    this.onRefreshFailed = options.onRefreshFailed || null;
    this.onRefreshSuccess = options.onRefreshSuccess || null;
    this._bound = false;
    this._handleExpiring = this._handleExpiring.bind(this);
  }

  /**
   * Bind the refresh handler to the viewer's userTokenExpiring event.
   * If an initial token was provided, sets it up immediately.
   * Safe to call multiple times - will only bind once.
   */
  bind() {
    if (this._bound) return;
    this.viewer.addEventListener(
      "formio:userTokenExpiring",
      this._handleExpiring
    );
    this._bound = true;

    // Set up initial token if provided - this schedules the first refresh notification
    if (
      this.initialToken &&
      typeof this.viewer.refreshUserToken === "function"
    ) {
      this.viewer.refreshUserToken({
        token: this.initialToken,
        buffer: this.buffer,
      });
    }
  }

  /**
   * Unbind the refresh handler from the viewer.
   */
  unbind() {
    if (!this._bound) return;
    this.viewer.removeEventListener(
      "formio:userTokenExpiring",
      this._handleExpiring
    );
    this._bound = false;
  }

  /**
   * Handle the userTokenExpiring event by calling the refresh endpoint.
   * @param {CustomEvent} event - The userTokenExpiring event
   * @private
   */
  async _handleExpiring(event) {
    const { expired } = event.detail || {};

    if (expired) {
      this._handleFailure("Token already expired");
      return;
    }

    try {
      const response = await fetch(this.refreshUrl, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Refresh failed: ${response.status}`
        );
      }

      const { accessToken } = await response.json();

      // Update the web component with the new token
      // The component auto-extracts expiry from the JWT
      if (typeof this.viewer.refreshUserToken === "function") {
        this.viewer.refreshUserToken({
          token: accessToken,
          buffer: this.buffer,
        });
      } else {
        console.warn(
          "[user-token-refresh] viewer.refreshUserToken not available"
        );
      }

      if (this.onRefreshSuccess) {
        this.onRefreshSuccess();
      }
    } catch (err) {
      this._handleFailure(err.message);
    }
  }

  /**
   * Handle refresh failure by logging and calling the failure callback.
   * @param {string} reason - The failure reason
   * @private
   */
  _handleFailure(reason) {
    console.error("[user-token-refresh] Failed:", reason);
    if (this.onRefreshFailed) {
      this.onRefreshFailed(reason);
    }
  }
}

/**
 * Initialize automatic user token refresh for a chefs-form-viewer element.
 *
 * @param {HTMLElement} viewer - The chefs-form-viewer element
 * @param {Object} [options] - Configuration options
 * @param {string} [options.initialToken] - Initial bearer token to set up refresh scheduling
 * @param {string} [options.refreshUrl="/auth/refresh-token"] - Endpoint to call for refresh
 * @param {number} [options.buffer=60] - Seconds before expiry to trigger refresh
 * @param {Function} [options.onRefreshFailed] - Callback when refresh fails
 * @param {Function} [options.onRefreshSuccess] - Callback when refresh succeeds
 * @returns {UserTokenRefresh} The refresh handler instance (can be used to unbind later)
 *
 * @example
 * import { initUserTokenRefresh } from "/lib/user-token-refresh.js";
 *
 * const viewer = document.querySelector("chefs-form-viewer");
 * const refresher = initUserTokenRefresh(viewer, {
 *   initialToken: accessToken,  // Sets up initial token and schedules refresh
 *   buffer: 60,                 // Notify 60 seconds before expiry (default)
 *   onRefreshFailed: (reason) => {
 *     console.warn("Token refresh failed:", reason);
 *     // Optionally redirect to login
 *   },
 *   onRefreshSuccess: () => {
 *     console.log("Token refreshed successfully");
 *   }
 * });
 *
 * // Later, if needed:
 * // refresher.unbind();
 */
export function initUserTokenRefresh(viewer, options) {
  const refresher = new UserTokenRefresh(viewer, options);
  refresher.bind();
  return refresher;
}
