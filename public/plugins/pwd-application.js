// PWD Application — embedded CHEFS form
export const manifest = {
  slug: "pwd-application",
  name: "PWD Application",
  description: "Embedded form for the PWD application.",
  formId: "f705749a-c2c5-4324-961b-4ac96c8a357f",
  apiKey: "316e3043-8339-406f-a336-c1f3d058edc3",
  baseUrl: "https://chefs-dev.apps.silver.devops.gov.bc.ca/app",
};

/** Simulated access-token claims when IdP does not yet map address / birthdate. Real JWT payload fields win on merge. */
const SIMULATED_TOKEN_CLAIMS = {
  birthdate: "1985-06-15",
  address: {
    street_address: "123 Demo Street",
    postal_code: "V8W 9A1",
  },
};

export function register({ request }) {
  const headers = request?.headers || {};
  const bearerToken = request?.bearerToken || "";
  const decoded = request?.decoded || {};

  const shapedHeaders = {
    ...(headers["x-tenant"] && { "x-tenant": headers["x-tenant"] }),
    ...(bearerToken && { Authorization: `Bearer ${bearerToken}` }),
  };

  const basePayload =
    decoded?.accessToken?.payload || decoded?.idToken?.payload || null;
  const shapedToken = mergeAccessTokenShape(basePayload, bearerToken);

  const shapedUser = buildUserFromToken(shapedToken);

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
    const prefix = "[pwd-application]";
    const payload = event?.detail;
    if (isError) {
      console.error(`${prefix} ${name}`, payload);
    } else {
      console.log(`${prefix} ${name}`, payload);
    }
  };
}

function mergeAccessTokenShape(basePayload, bearerToken) {
  const sim = SIMULATED_TOKEN_CLAIMS;
  if (!basePayload && !bearerToken) {
    return { ...sim };
  }
  if (!basePayload && bearerToken) {
    return { ...sim, bearer: bearerToken };
  }
  return {
    ...sim,
    ...basePayload,
    address: {
      ...sim.address,
      ...(basePayload.address && typeof basePayload.address === "object"
        ? basePayload.address
        : {}),
    },
    birthdate: basePayload.birthdate ?? sim.birthdate,
  };
}

function buildUserFromToken(shapedToken) {
  if (!shapedToken) return null;
  return {
    sub: shapedToken.sub,
    given_name: shapedToken.given_name,
    family_name: shapedToken.family_name,
    email: shapedToken.email,
    birthdate: shapedToken.birthdate,
    address: shapedToken.address,
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
