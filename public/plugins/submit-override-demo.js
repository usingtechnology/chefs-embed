/**
 * Submit Override Demo Plugin
 *
 * Demonstrates how the host application can handle form submissions instead of CHEFS
 * using the `submit-mode="host"` attribute.
 *
 * With submit-mode="host":
 * - Form validation runs normally via Form.io
 * - After validation passes, formio:hostSubmit event is emitted
 * - Host handles the data (send to own API, store locally, etc.)
 * - Web component automatically displays form as read-only after (for submissions)
 * - Drafts do NOT auto-display read-only (they're meant for continued editing)
 *
 * Use cases:
 * - Store submission data in host application's own database
 * - Transform data before sending to a different API
 * - Validate data against host application's business rules
 * - Queue submissions for batch processing
 * - Integrate with host application's workflow system
 */
export const manifest = {
  slug: "submit-override-demo",
  name: "Submit Override Demo",
  description:
    "Demonstrates using submit-mode='host' to handle submissions in the host application.",
  formId: "74446f66-5b6b-4207-8bf0-61f5e366f31c",
  apiKey: "4824e7b7-a1dc-406a-a545-0aebbb323979",
  baseUrl: "https://chefs-dev.apps.silver.devops.gov.bc.ca/app",
  debug: true,

  // Host data to pass to the form
  hostData: {
    config: {
      submitMode: "host",
      description: "Form data will be sent to host application, not CHEFS",
    },
  },

  tokenRefresh: {
    oidc: "host",
    buffer: 60,
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

  const shapedToken =
    decoded?.accessToken?.payload ||
    decoded?.idToken?.payload ||
    (bearerToken ? { bearer: bearerToken } : null);

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
      hostData: manifest.hostData,
      // KEY: Set submit-mode to "host" - this routes submissions to formio:hostSubmit
      submitMode: "host",
    },
    handlers: {
      "formio:beforeLoad": logEvent("beforeLoad"),
      "formio:loadSchema": logEvent("loadSchema"),
      "formio:beforeInit": logEvent("beforeInit"),
      "formio:ready": onFormReady,
      "formio:render": logEvent("render"),
      "formio:change": logEvent("change"),
      // KEY: This is where we handle the submission data (submit-mode="host")
      "formio:hostSubmit": onHostSubmit,
      "formio:error": logEvent("error", true),
    },
  };
}

/**
 * Handles form submission/draft when submit-mode="host".
 *
 * The web component has already:
 * - Validated the form data via Form.io
 * - Packaged the submission with metadata (formId, formName, timestamp, isDraft)
 *
 * After this handler completes:
 * - For submissions: web component automatically displays form as read-only
 * - For drafts: no auto read-only (drafts are meant for continued editing)
 *
 * To prevent auto read-only display, call event.preventDefault()
 * To perform async operations before display, use event.detail.waitUntil(promise)
 */
function onHostSubmit({ event, viewer }) {
  const prefix = "[submit-override-demo]";
  const { data, submission, formId, formName, timestamp, isDraft } = event.detail;

  console.log(`${prefix} hostSubmit received`, {
    formId,
    formName,
    timestamp,
    isDraft,
    data,
  });

  // Distinguish between submit and draft
  if (isDraft) {
    console.log(`${prefix} This is a DRAFT save - data captured but form stays editable`);
  } else {
    console.log(`${prefix} This is a SUBMISSION - form will auto-display as read-only`);
  }

  // EXAMPLE: Send to your own API
  // event.detail.waitUntil(
  //   fetch('/api/my-submissions', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ data, formId, isDraft })
  //   }).then(res => res.ok)
  // );

  // EXAMPLE: Store in localStorage
  // localStorage.setItem('lastSubmission', JSON.stringify({ data, formId, timestamp, isDraft }));

  // EXAMPLE: Prevent auto read-only display (handle it yourself)
  // event.preventDefault();
  // ... do custom handling ...
  // await viewer.displayAsReadOnly(data); // or redirect, show custom UI, etc.

  // EXAMPLE: Async validation before display
  // event.detail.waitUntil(
  //   validateWithExternalService(data).then(valid => {
  //     if (!valid) {
  //       console.error('External validation failed');
  //       return false; // Prevents auto read-only display
  //     }
  //     return true;
  //   })
  // );

  console.log(`${prefix} Host submission handling complete`);
}

function onFormReady({ event }) {
  const prefix = "[submit-override-demo]";
  console.log(`${prefix} ready`, event?.detail);
  console.log(`${prefix} Using submit-mode="host" - submissions go to formio:hostSubmit event`);
}

function logEvent(name, isError = false) {
  return ({ event }) => {
    const prefix = "[submit-override-demo]";
    const payload = event?.detail;
    if (isError) {
      console.error(`${prefix} ${name}`, payload);
    } else {
      console.log(`${prefix} ${name}`, payload);
    }
  };
}
