/**
 * Embed Data Demo Plugin
 *
 * Demonstrates how to pass arbitrary data from the host application to Form.io
 * using the `hostData` feature. This data becomes available in Form.io's evalContext
 * as `host`, allowing form components to access it in:
 *   - Calculated values: `value = host.lookup?.find(x => x.code === data.selected)?.name`
 *   - Conditional logic: `show = host.config?.enableFeature === true`
 *   - Default values: `value = host.defaults?.region || 'BC'`
 *   - Custom JavaScript: `if (host.permissions?.canEdit) { ... }`
 */
export const manifest = {
  slug: "embed-data-demo",
  name: "Embed Data Demo",
  description:
    "Embed demo showing how to pass data to `hostData`.",
  formId: "79cfc247-51a4-4684-aac0-dc5b1689ef87",
  apiKey: "5de336be-fd1e-400a-be5a-e225b721c91a",
  baseUrl: "https://chefs-dev.apps.silver.devops.gov.bc.ca/app",
  debug: true,

  // Host data configuration - this data will be passed to Form.io evalContext as `host`
  // In form components, access via: host.lookup, host.config, host.permissions, etc.
  hostData: {
    // Example lookup table for dropdowns/calculated values
    lookup: [
      { code: "VAN", name: "Vancouver", region: "Lower Mainland" },
      { code: "VIC", name: "Victoria", region: "Vancouver Island" },
      { code: "KEL", name: "Kelowna", region: "Okanagan" },
      { code: "PG", name: "Prince George", region: "Northern BC" },
    ],
    // Example configuration object
    config: {
      maxItems: 10,
      enableAdvancedFeatures: true,
      defaultRegion: "Lower Mainland",
    },
    // Example permissions object from host application
    permissions: {
      canEdit: true,
      canDelete: false,
      canApprove: false,
    },
    // Example metadata from host application context
    context: {
      applicationName: "Embed Data Demo",
      version: "1.0.0",
      environment: "development",
    },
  },

  // Token refresh using host application's OIDC configuration.
  tokenRefresh: {
    oidc: "host",
    buffer: 60,
  },
};

export function register({ request }) {
  const headers = request?.headers || {};
  const bearerToken = request?.bearerToken || "";
  const decoded = request?.decoded || {};

  // Example shaping: forward a few headers and add bearer to Authorization
  const shapedHeaders = {
    ...(headers["x-tenant"] && { "x-tenant": headers["x-tenant"] }),
    ...(bearerToken && { Authorization: `Bearer ${bearerToken}` }),
  };

  // Example token shape: prefer decoded access token payload, fall back to raw bearer
  const shapedToken =
    decoded?.accessToken?.payload ||
    decoded?.idToken?.payload ||
    (bearerToken ? { bearer: bearerToken } : null);

  // Example user shape: derive from decoded payload
  const payloadForUser =
    decoded?.accessToken?.payload || decoded?.idToken?.payload || null;
  const shapedUser = payloadForUser
    ? {
        sub: payloadForUser.sub,
        given_name: payloadForUser.given_name,
        family_name: payloadForUser.family_name,
        email: payloadForUser.email,
      }
    : null;

  return {
    config: {
      headers: shapedHeaders,
      token: shapedToken,
      user: shapedUser,
      debug: manifest.debug,
      // Pass hostData from manifest - this becomes available as `host` in Form.io evalContext
      // Form components can access: host.lookup, host.config, host.permissions, host.context
      hostData: manifest.hostData,
    },
    handlers: {
      "formio:beforeLoad": logEvent("beforeLoad"),
      "formio:beforeLoadSchema": logEvent("beforeLoadSchema"),
      "formio:loadSchema": logEvent("loadSchema"),
      "formio:beforeInit": logEvent("beforeInit"),
      "formio:ready": onFormReady,
      "formio:render": logEvent("render"),
      "formio:change": logEvent("change"),
      "formio:beforeSubmit": logEvent("beforeSubmit"),
      "formio:submit": logEvent("submit"),
      "formio:submitDone": logEvent("submitDone"),
      "formio:beforeAutoReload": logEvent("beforeAutoReload"),
      "formio:autoReload": logEvent("autoReload"),
      "formio:autoReloadComplete": logEvent("autoReloadComplete"),
      "formio:beforeNext": logEvent("beforeNext"),
      "formio:beforePrev": logEvent("beforePrev"),
      "formio:authTokenRefreshed": logEvent("authTokenRefreshed"),
      "formio:hostDataChanged": logEvent("hostDataChanged"),
      "formio:beforeFileUpload": logEvent("beforeFileUpload"),
      "formio:beforeFileDownload": logEvent("beforeFileDownload"),
      "formio:beforeFileDelete": logEvent("beforeFileDelete"),
      "formio:error": logEvent("error", true),
    },
  };
}

/**
 * Handler for formio:ready event
 * Demonstrates how to use setHostData() for dynamic updates after form initialization
 */
function onFormReady({ event, viewer }) {
  const prefix = "[embed-data-demo]";
  console.log(`${prefix} ready`, event?.detail);

  // Log the initial hostData that was passed
  console.log(`${prefix} Initial hostData:`, viewer?.getHostData?.());

  // Example: Dynamically add more data after form is ready
  // This merges with existing hostData (default behavior)
  if (viewer?.setHostData) {
    viewer.setHostData({
      dynamicData: {
        loadedAt: new Date().toISOString(),
        sessionId: crypto.randomUUID?.() || "demo-session",
      },
    });
    console.log(`${prefix} Added dynamic hostData, new state:`, viewer.getHostData());
  }

  // Example: How to completely replace hostData (not recommended, but possible)
  // viewer.setHostData({ freshData: {...} }, { replace: true });
}

function logEvent(name, isError = false) {
  return ({ event }) => {
    const prefix = "[embed-data-demo]";
    const payload = event?.detail;
    if (isError) {
      console.error(`${prefix} ${name}`, payload);
    } else {
      console.log(`${prefix} ${name}`, payload);
    }
  };
}
