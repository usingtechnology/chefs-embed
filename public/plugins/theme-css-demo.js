// Demo plugin that ships a customer-owned theme stylesheet and proves it loads
const themeCssUrl = new URL("./theme-css-demo.css", import.meta.url).toString();

export const manifest = {
  slug: "chefs-theme-demo",
  name: "Theme CSS Demo",
  description:
    "Shows how a client bundles a theme CSS with their plugin and lets the web component load it.",
  formId: "3145c95c-337e-41e5-836c-138cf1256bc9",
  apiKey: "a7464f97-9377-42ee-9f73-7c2d4250c132",
  baseUrl: "https://chefs-dev.apps.silver.devops.gov.bc.ca/pr-1802",
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
      themeCss: themeCssUrl,
    },
    handlers: {
      "formio:assetStateChange": logThemeAsset(themeCssUrl),
      "formio:ready": logEvent("ready"),
      "formio:render": logEvent("render"),
      "formio:change": logEvent("change"),
    },
  };
}

function logEvent(name) {
  return ({ event }) => {
    const prefix = "[theme-demo]";
    const payload = event?.detail;
    console.log(`${prefix} ${name}`, payload);
  };
}

function logThemeAsset(themeUrl) {
  return ({ event }) => {
    const assets = event?.detail?.assets || [];
    if (assets.includes("theme-css")) {
      console.info(
        "[theme-demo] theme stylesheet loaded by web component",
        themeUrl
      );
    }
  };
}
