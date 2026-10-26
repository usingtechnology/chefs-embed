/**
 * Public Form Demo Plugin
 *
 * Embeds a CHEFS form that uses the Public login option, with no API key or
 * gateway token. Needs web component release 1.1.0 or later.
 *
 * With no apiKey in the manifest:
 * - The host skips the gateway token fetch and sets no auth-token
 * - The component loads and submits through /webcomponents/v1/public/{formId}
 * - CHEFS only answers when this page's origin is in the form's allowed origins
 *   (Manage Form > Web Component > Allowed origins), e.g. http://localhost:3333
 * - token/user/headers still feed the form's evalContext but are never sent to CHEFS
 * - Printing, files and loading a submission-id need a key, so they emit formio:error
 */
export const manifest = {
  slug: "public-form-demo",
  name: "Public Form (no API key)",
  description:
    "Embeds a Public form without an API key, on an allowed origin (release 1.1.0).",
  // Embed Public" in pr-1966; it must list http://localhost:3333 as an allowed origin
  formId: "f7119ebe-ea80-4301-b40f-91d1e89cf0ea",
  baseUrl: "https://chefs-dev.apps.silver.devops.gov.bc.ca/pr-1966",
  release: "1.1.0",
  debug: true,
  // Optional plugin-provided attributes (uncomment to use)
  // language: "en",
  // autoReloadOnSubmit: false,
  // themeCss: "https://example.com/theme.css",
};

export function register({ request }) {
  const decoded = request?.decoded || {};

  // Example token shape: decoded access token payload for the form's evalContext
  const shapedToken =
    decoded?.accessToken?.payload || decoded?.idToken?.payload || null;

  // Example user shape: derive from decoded payload
  const shapedUser = shapedToken
    ? {
        sub: shapedToken.sub,
        given_name: shapedToken.given_name,
        family_name: shapedToken.family_name,
        email: shapedToken.email,
      }
    : null;

  const optionalConfig = pickOptional(manifest, [
    "language",
    "debug",
    "autoReloadOnSubmit",
    "themeCss",
  ]);

  return {
    config: {
      token: shapedToken,
      user: shapedUser,
      ...optionalConfig,
    },
    handlers: {
      "formio:beforeLoadSchema": logEvent("beforeLoadSchema"),
      "formio:loadSchema": logEvent("loadSchema"),
      "formio:ready": logEvent("ready"),
      "formio:beforeSubmit": logEvent("beforeSubmit"),
      "formio:submit": logEvent("submit"),
      "formio:submitDone": onSubmitDone,
      "formio:error": logEvent("error", true),
    },
  };
}

// Anonymous submissions cannot be read back, so the host shows its own confirmation
function onSubmitDone({ event }) {
  const { submission, showConfirmationId } = event?.detail || {};
  console.log("[public-form-demo] submitDone", event?.detail);
  if (showConfirmationId && submission?.confirmationId) {
    console.log(
      `[public-form-demo] Confirmation ID: ${submission.confirmationId}`,
    );
  }
}

function logEvent(name, isError = false) {
  return ({ event }) => {
    const prefix = "[public-form-demo]";
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
