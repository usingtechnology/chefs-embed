// Demo plugin: shapes token/headers from raw request context and wires events
export const manifest = {
  slug: "print-demo",
  name: "Embed Print",
  description: "Embed demo showing how to print a form.",
  formId: "a05b2034-db16-4d3f-9a0f-e2bdbfb0558b",
  apiKey: "749134d7-3983-41a6-bf26-30262eed41ac",
  baseUrl: "https://chefs-dev.apps.silver.devops.gov.bc.ca/pr-1802",
  // Optional plugin-provided attributes (uncomment to use)
  // language: "en",
  // submissionId: "123",
  // readOnly: true,
  // noShadow: true,
  debug: true,
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
      ...optionalConfig,
    },
    handlers: {
      "formio:beforeLoad": logEvent("beforeLoad"),
      "formio:beforeLoadSchema": logEvent("beforeLoadSchema"),
      "formio:loadSchema": logEvent("loadSchema"),
      "formio:beforeInit": logEvent("beforeInit"),
      "formio:ready": logEvent("ready"),
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
      "formio:beforeFileUpload": logEvent("beforeFileUpload"),
      "formio:beforeFileDownload": logEvent("beforeFileDownload"),
      "formio:beforeFileDelete": logEvent("beforeFileDelete"),
      "formio:error": logEvent("error", true),
    },
  };
}

function logEvent(name, isError = false) {
  return ({ event }) => {
    const prefix = "[print-demo-plugin]";
    const payload = event?.detail;
    if (isError) {
      console.error(`${prefix} ${name}`, payload);
    } else {
      console.log(`${prefix} ${name}`, payload);
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
