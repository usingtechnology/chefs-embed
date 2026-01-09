const config = require("../config");

/**
 * Fetch an authentication token from CHEFS API for embedding forms
 * Uses Basic authentication with base64(formId:apiKey) as per CHEFS gateway API spec
 * 
 * @param {string} formId - CHEFS form UUID (optional, defaults to config)
 * @param {string} apiKey - API access key (optional, defaults to config)
 * @param {string} baseUrl - Base URL for CHEFS API (optional, defaults to config)
 * @returns {Promise<string>} The authentication token
 * @throws {Error} If token fetch fails
 */
async function fetchChefsToken(formId = null, apiKey = null, baseUrl = null) {
  const formIdToUse = formId || config.chefs.formId;
  const apiKeyToUse = apiKey || config.chefs.apiKey;
  const baseUrlToUse = baseUrl || config.chefs.baseUrl;
  
  const tokenUrl = `${baseUrlToUse}/gateway/v1/auth/token/forms/${formIdToUse}`;

  if (!formIdToUse || !apiKeyToUse) {
    throw new Error("Missing formId or apiKey configuration");
  }

  try {
    console.log(`Fetching CHEFS token from: ${tokenUrl}`);

    // Create Basic auth header: base64(formId:apiKey)
    const basicAuth = Buffer.from(`${formIdToUse}:${apiKeyToUse}`).toString("base64");

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ formId: formIdToUse }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch auth token: ${response.status} ${errorText}`
      );
    }

    const tokenData = await response.json();
    const authToken = tokenData.token;

    if (!authToken) {
      throw new Error("No token in response from gateway endpoint");
    }

    return authToken;
  } catch (error) {
    console.error("Error fetching CHEFS token:", error.message);
    throw error;
  }
}

module.exports = { fetchChefsToken };
