/**
 * Plugin Registry
 *
 * Maintains a registry of plugin manifests for server-side use.
 * Plugins are loaded from the public/plugins directory at startup.
 *
 * The registry can be queried for:
 * - All plugins
 * - A specific plugin by slug
 * - Plugins with specific capabilities (e.g., token refresh configured)
 *
 * Plugins can specify tokenRefresh.oidc as:
 * - An object { tokenEndpoint, clientId } for custom OIDC
 * - The string "host" to use the host application's OIDC configuration
 */

const path = require("path");
const fs = require("fs/promises");
const { pathToFileURL } = require("url");
const config = require("../config");

const pluginsDir = path.join(__dirname, "..", "public", "plugins");

// Registry: pluginSlug -> full manifest (with modulePath added)
const registry = new Map();

/**
 * Load all plugin manifests into the registry.
 * Should be called at server startup.
 */
async function loadPluginRegistry() {
  registry.clear();

  try {
    const entries = await fs.readdir(pluginsDir);
    const jsFiles = entries.filter((name) => name.endsWith(".js"));

    for (const file of jsFiles) {
      const absPath = path.join(pluginsDir, file);
      const modulePath = `/plugins/${file}`;
      try {
        const mod = await import(pathToFileURL(absPath));
        const manifest = mod.manifest;

        if (manifest?.slug) {
          registry.set(manifest.slug, {
            ...manifest,
            modulePath,
          });
          console.log(`[plugin-registry] Registered plugin: ${manifest.slug}`);
        }
      } catch (err) {
        console.error(`[plugin-registry] Failed to load ${file}:`, err.message);
      }
    }
  } catch (err) {
    console.error("[plugin-registry] Failed to read plugins directory:", err);
  }

  console.log(`[plugin-registry] Loaded ${registry.size} plugins`);
}

/**
 * Get all registered plugins.
 *
 * @returns {Array<Object>} Array of plugin manifests
 */
function getAllPlugins() {
  return Array.from(registry.values());
}

/**
 * Get a plugin manifest by slug.
 *
 * @param {string} slug - The plugin's slug identifier
 * @returns {Object|null} The plugin manifest or null if not found
 */
function getPlugin(slug) {
  return registry.get(slug) || null;
}

/**
 * Get plugins that have a specific capability.
 *
 * @param {Function} predicate - Function that receives manifest and returns boolean
 * @returns {Array<Object>} Array of matching plugin manifests
 */
function getPluginsWhere(predicate) {
  return getAllPlugins().filter(predicate);
}

/**
 * Check if a plugin has token refresh configured.
 *
 * @param {Object} plugin - The plugin manifest
 * @returns {boolean}
 */
function hasTokenRefresh(plugin) {
  const oidc = plugin?.tokenRefresh?.oidc;
  if (oidc === "host") return true;
  return !!(oidc?.tokenEndpoint && oidc?.clientId);
}

/**
 * Get plugins that have token refresh (OIDC) configured.
 *
 * @returns {Array<Object>} Array of plugin manifests with tokenRefresh.oidc
 */
function getPluginsWithTokenRefresh() {
  return getPluginsWhere(hasTokenRefresh);
}

/**
 * Get the OIDC configuration for a plugin by slug.
 * Convenience method for token refresh endpoint.
 *
 * If the plugin specifies oidc: "host", uses the host application's
 * Keycloak configuration from config.js.
 *
 * @param {string} slug - The plugin's slug identifier
 * @returns {{ tokenEndpoint: string, clientId: string, buffer: number }|null}
 */
function getPluginOidcConfig(slug) {
  const plugin = getPlugin(slug);
  if (!plugin?.tokenRefresh?.oidc) return null;

  const buffer = plugin.tokenRefresh.buffer || 60;

  // Handle "host" - use host application's OIDC config
  if (plugin.tokenRefresh.oidc === "host") {
    return {
      tokenEndpoint: config.keycloak.tokenURL,
      clientId: config.keycloak.clientID,
      buffer,
    };
  }

  // Handle custom OIDC config
  const { tokenEndpoint, clientId } = plugin.tokenRefresh.oidc;
  if (!tokenEndpoint || !clientId) return null;

  return {
    tokenEndpoint,
    clientId,
    buffer,
  };
}

module.exports = {
  loadPluginRegistry,
  getAllPlugins,
  getPlugin,
  getPluginsWhere,
  getPluginsWithTokenRefresh,
  getPluginOidcConfig,
};
