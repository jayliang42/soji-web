const requiredEnv = {
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  CRON_SECRET: process.env.CRON_SECRET,
  OPS_ALERT_WEBHOOK_URL: process.env.OPS_ALERT_WEBHOOK_URL,
  SOJI_DEMO_MODE: process.env.SOJI_DEMO_MODE,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  REVENUECAT_WEBHOOK_AUTHORIZATION: process.env.REVENUECAT_WEBHOOK_AUTHORIZATION,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET
};

export const env = {
  ...requiredEnv
};

export function isValidSiteUrl(
  configuredValue: string | undefined,
  nodeEnv = process.env.NODE_ENV
): configuredValue is string {
  if (!configuredValue) {
    return false;
  }

  try {
    const url = new URL(configuredValue);
    const validProtocol =
      url.protocol === "https:" ||
      (nodeEnv !== "production" && url.protocol === "http:");

    return (
      validProtocol &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.pathname === "/"
    );
  } catch {
    return false;
  }
}

export function hasSiteUrlConfig() {
  return isValidSiteUrl(env.NEXT_PUBLIC_SITE_URL);
}

export function hasProductionSiteUrlConfig(
  configuredValue = env.NEXT_PUBLIC_SITE_URL
) {
  return isValidSiteUrl(configuredValue, "production");
}

export function getSiteUrl() {
  const configuredValue = env.NEXT_PUBLIC_SITE_URL;
  if (isValidSiteUrl(configuredValue)) {
    return new URL(configuredValue).origin;
  }

  return process.env.NODE_ENV === "production" ? null : "http://localhost:3000";
}

const trustedCheckoutReturnOrigins = new Set([
  "https://gr8tfuture.com",
  "https://www.gr8tfuture.com",
  "https://soji-web.vercel.app"
]);

function isTrustedSojiVercelCheckoutOrigin(url: URL) {
  return (
    url.protocol === "https:" &&
    (url.hostname.startsWith("soji-") ||
      url.hostname.startsWith("soji-web-")) &&
    url.hostname.endsWith("-szjasonliang-7817s-projects.vercel.app")
  );
}

export function getCheckoutReturnSiteUrl(
  requestUrl: string,
  configuredValue = env.NEXT_PUBLIC_SITE_URL,
  nodeEnv = process.env.NODE_ENV
) {
  const configuredOrigin = isValidSiteUrl(configuredValue, nodeEnv)
    ? new URL(configuredValue).origin
    : null;

  let requestOrigin: URL;
  try {
    requestOrigin = new URL(requestUrl);
  } catch {
    return configuredOrigin;
  }

  if (!isValidSiteUrl(requestOrigin.origin, nodeEnv)) {
    return configuredOrigin;
  }

  if (nodeEnv !== "production") {
    return requestOrigin.origin;
  }

  if (
    requestOrigin.origin === configuredOrigin ||
    trustedCheckoutReturnOrigins.has(requestOrigin.origin) ||
    isTrustedSojiVercelCheckoutOrigin(requestOrigin)
  ) {
    return requestOrigin.origin;
  }

  return configuredOrigin;
}

export function getClientSiteUrl(
  currentOrigin: string,
  configuredValue = env.NEXT_PUBLIC_SITE_URL,
  nodeEnv = process.env.NODE_ENV
) {
  if (isValidSiteUrl(configuredValue, nodeEnv)) {
    return new URL(configuredValue).origin;
  }

  if (
    nodeEnv !== "production" &&
    isValidSiteUrl(currentOrigin, "development")
  ) {
    return new URL(currentOrigin).origin;
  }

  return null;
}

export function hasSupabaseConfig() {
  return Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function hasStripeConfig() {
  return Boolean(env.STRIPE_SECRET_KEY);
}

export function isValidStripeWebhookSecret(
  configuredValue: string | undefined
) {
  return Boolean(
    configuredValue &&
      configuredValue === configuredValue.trim() &&
      configuredValue.startsWith("whsec_") &&
      configuredValue.length > "whsec_".length
  );
}

export function hasStripeWebhookConfig(
  configuredValue = env.STRIPE_WEBHOOK_SECRET
) {
  return isValidStripeWebhookSecret(configuredValue);
}

export function hasSupabaseAdminConfig() {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

export function hasRevenueCatWebhookConfig() {
  return Boolean(env.REVENUECAT_WEBHOOK_AUTHORIZATION);
}

export function isValidOpsAlertWebhookUrl(
  configuredValue: string | undefined,
  nodeEnv = process.env.NODE_ENV
): configuredValue is string {
  if (!configuredValue) {
    return false;
  }

  try {
    const url = new URL(configuredValue);
    const validProtocol =
      url.protocol === "https:" ||
      (nodeEnv !== "production" && url.protocol === "http:");

    return (
      validProtocol &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}

export function getOpsAlertConfigState(
  configuredValue = env.OPS_ALERT_WEBHOOK_URL,
  nodeEnv = process.env.NODE_ENV
) {
  if (!configuredValue?.trim()) {
    return "missing" as const;
  }

  return isValidOpsAlertWebhookUrl(configuredValue, nodeEnv)
    ? ("ready" as const)
    : ("invalid" as const);
}

export function getOpsAlertWebhookUrl() {
  return isValidOpsAlertWebhookUrl(env.OPS_ALERT_WEBHOOK_URL)
    ? new URL(env.OPS_ALERT_WEBHOOK_URL)
    : null;
}

export function hasOpsAlertConfig() {
  return isValidOpsAlertWebhookUrl(env.OPS_ALERT_WEBHOOK_URL);
}

export function hasProductionOpsAlertConfig(
  configuredValue = env.OPS_ALERT_WEBHOOK_URL
) {
  return getOpsAlertConfigState(configuredValue, "production") === "ready";
}

export function isValidCronSecret(configuredValue: string | undefined) {
  return Boolean(
    configuredValue &&
      configuredValue === configuredValue.trim() &&
      configuredValue.length >= 32
  );
}

export function hasCronSecretConfig(configuredValue = env.CRON_SECRET) {
  return isValidCronSecret(configuredValue);
}

export function resolveDemoMode(
  configuredValue: string | undefined,
  nodeEnv: string | undefined
) {
  if (configuredValue !== undefined) {
    return configuredValue.trim().toLowerCase() === "true";
  }

  return nodeEnv === "development" || nodeEnv === "test";
}

export function isDemoModeEnabled() {
  return resolveDemoMode(env.SOJI_DEMO_MODE, process.env.NODE_ENV);
}

export function isExplicitDemoModeEnabled() {
  return resolveDemoMode(env.SOJI_DEMO_MODE, "production");
}
