// src/config.ts
var DEFAULT_API_VERSION = "2026-01";
function normalizeStoreDomain(domain) {
  let normalized = domain.replace(/^https?:\/\//, "");
  normalized = normalized.replace(/\/$/, "");
  if (!normalized.includes(".myshopify.com")) {
    normalized = `${normalized}.myshopify.com`;
  }
  return normalized;
}

// src/admin.ts
var MAX_RETRIES = 3;
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function createAdminClient(config) {
  const storeDomain = normalizeStoreDomain(config.storeDomain);
  const apiVersion = config.apiVersion ?? DEFAULT_API_VERSION;
  const endpoint = `https://${storeDomain}/admin/api/${apiVersion}/graphql.json`;
  async function query(graphqlQuery, variables) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": config.adminAccessToken
        },
        body: JSON.stringify({
          query: graphqlQuery,
          variables
        })
      });
      if (response.status === 429 && attempt < MAX_RETRIES) {
        const retryAfter = response.headers.get("Retry-After");
        const waitMs = retryAfter ? parseFloat(retryAfter) * 1e3 : 2e3;
        console.warn(`[Shopify Admin] Rate limited (429), retrying in ${waitMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await sleep(waitMs);
        continue;
      }
      if (!response.ok) {
        throw new Error(`Admin API error: ${response.status} ${response.statusText}`);
      }
      const json = await response.json();
      if (json.errors && json.errors.length > 0) {
        const isThrottled = json.errors.some((e) => e.message.includes("Throttled"));
        if (isThrottled && attempt < MAX_RETRIES) {
          console.warn(`[Shopify Admin] GraphQL throttled, retrying in 1s (attempt ${attempt + 1}/${MAX_RETRIES})`);
          await sleep(1e3);
          continue;
        }
        throw new Error(`Admin API GraphQL error: ${json.errors[0]?.message ?? "Unknown error"}`);
      }
      return json.data;
    }
    throw new Error("Admin API: max retries exceeded");
  }
  return {
    storeDomain,
    apiVersion,
    query
  };
}

export {
  DEFAULT_API_VERSION,
  normalizeStoreDomain,
  createAdminClient
};
