/**
 * Decode a JWT token without verification
 * Returns the decoded header and payload
 */
function decodeJWT(token) {
  if (!token || typeof token !== 'string') {
    return null;
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode header
    const header = JSON.parse(
      Buffer.from(parts[0].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
    );

    // Decode payload
    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
    );

    return {
      header,
      payload,
      raw: token
    };
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

module.exports = { decodeJWT };
