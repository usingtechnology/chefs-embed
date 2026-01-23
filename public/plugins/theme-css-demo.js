// Demo plugin that ships a customer-owned theme stylesheet and proves it loads
const themeCssUrl = new URL("./theme-css-demo.css", import.meta.url).toString();

export const manifest = {
  slug: "chefs-theme-demo",
  name: "Theme CSS Demo",
  description:
    "Shows how a client bundles a theme CSS with their plugin and lets the web component load it.",
  formId: "bcc7a548-1100-432d-82a3-5c0901574a0b",
  apiKey: "83688c02-59d7-49fc-a25a-462895e37a13",
  baseUrl: "https://chefs-dev.apps.silver.devops.gov.bc.ca/app",
  // Optional plugin-provided attributes (uncomment to use)
  // language: "en",
  // submissionId: "123",
  // readOnly: true,
  // noShadow: true,
  // debug: true,
  // isolateStyles: true,
  // noIcons: true,
  // submitButtonKey: "submit",
  // printButtonKey: "print",
  // printEventName: "printDocument",
  // autoReloadOnSubmit: false,
  // themeCss: "https://example.com/theme.css",
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

  const optionalConfig = pickOptional(manifest, [
    "language",
    "submissionId",
    "readOnly",
    "noShadow",
    "debug",
    "isolateStyles",
    "noIcons",
    "submitButtonKey",
    "printButtonKey",
    "printEventName",
    "autoReloadOnSubmit",
    "themeCss",
  ]);

  return {
    config: {
      headers: shapedHeaders,
      token: shapedToken,
      user: shapedUser,
      themeCss: themeCssUrl,
      ...optionalConfig,
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

function pickOptional(source, keys) {
  return keys.reduce((acc, key) => {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      acc[key] = source[key];
    }
    return acc;
  }, {});
}
