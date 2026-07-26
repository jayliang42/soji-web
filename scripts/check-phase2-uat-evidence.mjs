import { execFileSync } from "node:child_process";
import {
  lstatSync,
  readFileSync,
  realpathSync
} from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export const DEFAULT_EVIDENCE_PATH =
  ".planning/phases/02-billing-and-fulfillment-uat/02-UAT-EVIDENCE.md";

export const CANONICAL_ORIGIN = "https://soji-web.vercel.app";
export const PHASE2_MIGRATION_VERSION = "20260726000000";
export const PHASE2_MIGRATION_FILE =
  "20260726000000_subscription_billing_adjustments.sql";

export const REQUIRED_SCENARIOS = [
  "BILL-DB-SCHEMA-PARITY",
  "BILL-01-CATALOG",
  "BILL-01-PORTAL-CONFIG",
  "BILL-03-TIER-1-CHECKOUT",
  "BILL-03-TIER-2-CHECKOUT",
  "BILL-03-TIER-3-CHECKOUT",
  "BILL-03-CUSTOMER-REUSE",
  "BILL-03-PORTAL-CANCEL",
  "BILL-02-SIGNED-RECEIPT",
  "BILL-02-IGNORED-RECEIPT",
  "BILL-02-FAILED-RETRY",
  "BILL-02-RECONCILIATION",
  "BILL-04-PRODUCT-CATALOG",
  "BILL-04-PRODUCT-DELIVERY",
  "BILL-04-UNAUTHORIZED-DOWNLOAD",
  "BILL-04-PARTIAL-REFUND",
  "BILL-04-FULL-REFUND",
  "BILL-04-DISPUTE-OPEN",
  "BILL-04-DISPUTE-WON",
  "BILL-04-DISPUTE-LOST",
  "BILL-05-PARTIAL-REFUND",
  "BILL-05-FULL-REFUND",
  "BILL-05-DISPUTE-OPEN",
  "BILL-05-DISPUTE-WON",
  "BILL-05-DISPUTE-LOST"
];

export const ALLOWED_STATUSES = ["PENDING", "PASS", "FAIL", "BLOCKED"];

export const REQUIRED_SCHEMA_CHECKS = [
  "adjustmentTable",
  "adjustmentConstraints",
  "accessHelper",
  "adjustmentSyncRpc",
  "paidReconciliationRpc",
  "adjustmentRls",
  "serviceRoleGrants",
  "authenticatedNoWrite",
  "receiptAllowlist"
];

export const REQUIRED_READINESS_CHECKS = [
  "demoModeDisabled",
  "siteUrl",
  "supabase",
  "supabaseAdmin",
  "supabasePublicOperational",
  "supabaseServiceRoleOperational",
  "stripe",
  "stripeMembershipPrices",
  "stripeWebhook"
];

const schemaResponseFields = new Map([
  ["adjustment_table", "adjustmentTable"],
  ["adjustment_constraints", "adjustmentConstraints"],
  ["access_helper", "accessHelper"],
  ["adjustment_sync_rpc", "adjustmentSyncRpc"],
  ["paid_reconciliation_rpc", "paidReconciliationRpc"],
  ["adjustment_rls", "adjustmentRls"],
  ["service_role_grants", "serviceRoleGrants"],
  ["authenticated_no_write", "authenticatedNoWrite"],
  ["receipt_allowlist", "receiptAllowlist"],
  ...REQUIRED_SCHEMA_CHECKS.map((name) => [name, name])
]);

const evidenceSecretRules = [
  {
    name: "bearer/JWT value",
    pattern:
      /\bbearer\s+[a-z0-9_-]{12,}\.[a-z0-9_-]{12,}(?:\.[a-z0-9_-]{8,})?/i
  },
  {
    name: "Supabase service-role key assignment",
    pattern: /\bSUPABASE_SERVICE_ROLE_KEY\s*=\s*\S+/i
  },
  {
    name: "provider secret or publishable key",
    pattern: /\b(?:sk|rk|pk)_(?:live|test)_[a-z0-9_-]+/i
  },
  {
    name: "Stripe webhook secret",
    pattern: /\bwhsec_[a-z0-9_-]+/i
  },
  {
    name: "password assignment",
    pattern: /\bpassword\s*=\s*\S+/i
  },
  {
    name: "cookie header",
    pattern: /\bcookie\s*:\s*\S+/i
  },
  {
    name: "authorization header",
    pattern: /\bauthorization\s*:\s*\S+/i
  },
  {
    name: "token assignment",
    pattern:
      /\b(?:access|refresh|id|oauth|session)[_-]?token\s*[:=]\s*\S+/i
  },
  {
    name: "URI credentials",
    pattern: /\bhttps?:\/\/[^\s/:@]+:[^\s/@]+@[^\s/]+/i
  },
  {
    name: "email address",
    pattern:
      /\b[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+\b/i
  },
  {
    name: "full Stripe object identifier",
    pattern:
      /\b(?:evt|pi|ch|sub|cus|dp|in|price|prod|cs_(?:test|live))_[a-z0-9]{9,}\b/i
  },
  {
    name: "raw provider payload",
    pattern: /\braw\s+(?:stripe|provider|event)?\s*payload\b/i
  }
];

const trackedSecretRules = [
  {
    name: "Stripe secret",
    pattern: /\b(?:sk|rk)_(?:live|test)_[a-z0-9_-]{8,}/i
  },
  {
    name: "Stripe webhook secret",
    pattern: /\bwhsec_[a-z0-9_-]{8,}/i
  },
  {
    name: "assigned server secret",
    pattern:
      /\b(?:SUPABASE_SERVICE_ROLE_KEY|STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET|CRON_SECRET|OPS_ALERT_WEBHOOK_URL)\s*=\s*[^\s#]{8,}/i
  },
  {
    name: "private key",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/
  },
  {
    name: "URI credentials",
    pattern: /\bhttps?:\/\/[^\s/:@]+:[^\s/@]+@[^\s/]+/i
  }
];

const providerFabricationPattern =
  /\b(?:mock(?:ed)?|fixture|repository\s+tests?|unit\s+tests?|contract[- ]only|configuration[- ]only|configured\s+only|config[- ]only|dry[- ]run)\b/i;

const scenarioPattern = /^BILL-(?:DB|[0-9]{2})-[A-Z0-9-]+$/;
const utcDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const utcTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const suffixPattern = /^[A-Za-z0-9]{8}$/;
const objectTypePattern = /^[a-z][a-z0-9_.-]{1,63}$/;
const migrationVersionPattern = /^\d{14}$/;
const migrationFilenamePattern = /^\d{14}_[a-z0-9][a-z0-9_]*\.sql$/;

function isPlainObject(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value)
  );
}

function isValidUtcDate(value) {
  if (!utcDatePattern.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.valueOf()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function isValidUtcTimestamp(value) {
  if (!utcTimestampPattern.test(value)) {
    return false;
  }
  return !Number.isNaN(new Date(value).valueOf());
}

function normalizeHttpsUrl(value, label) {
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      throw new Error();
    }
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    return url.origin + (url.pathname === "/" ? "" : url.pathname);
  } catch {
    throw new Error(`${label} must be a credential-free HTTPS URL`);
  }
}

function splitEvidenceRow(line, lineNumber) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) {
    throw new Error(`malformed evidence row at line ${lineNumber}`);
  }

  const cells = trimmed
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());

  if (cells.length !== 10) {
    throw new Error(
      `malformed evidence row at line ${lineNumber}: expected 10 columns`
    );
  }

  return {
    environment: cells[3],
    expected: cells[7],
    lineNumber,
    notes: cells[9],
    objectSuffix: cells[6],
    objectType: cells[5],
    observed: cells[8],
    scenarioId: cells[0],
    status: cells[1],
    subject: cells[4],
    utcDate: cells[2]
  };
}

export function parseEvidence(source) {
  if (typeof source !== "string") {
    throw new TypeError("evidence source must be text");
  }

  const scenarios = [];
  const lines = source.split(/\r?\n/);

  for (const [index, line] of lines.entries()) {
    if (!/^\s*\|\s*BILL-/i.test(line)) {
      continue;
    }
    const row = splitEvidenceRow(line, index + 1);
    if (!scenarioPattern.test(row.scenarioId)) {
      throw new Error(
        `malformed Phase 2 scenario ID ${row.scenarioId || "(empty)"} at line ${index + 1}`
      );
    }
    scenarios.push(row);
  }

  return scenarios;
}

function findCardNumber(source) {
  const candidates = source.match(/(?:\d[ -]?){13,19}/g) ?? [];
  return candidates.some((candidate) => {
    const digits = candidate.replace(/\D/g, "");
    if (digits.length < 13 || digits.length > 19) {
      return false;
    }
    let total = 0;
    let doubleDigit = false;
    for (let index = digits.length - 1; index >= 0; index -= 1) {
      let digit = Number(digits[index]);
      if (doubleDigit) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      total += digit;
      doubleDigit = !doubleDigit;
    }
    return total % 10 === 0;
  });
}

function evidenceSecretErrors(source) {
  const errors = [];
  for (const rule of evidenceSecretRules) {
    if (rule.pattern.test(source)) {
      errors.push(`evidence contains a prohibited ${rule.name}`);
    }
  }
  if (findCardNumber(source)) {
    errors.push("evidence contains prohibited payment-card data");
  }
  return errors;
}

function parseSchemaObservation(observed) {
  const fields = new Map();
  for (const item of observed.split(";")) {
    const trimmed = item.trim();
    const separator = trimmed.indexOf("=");
    if (separator <= 0 || separator === trimmed.length - 1) {
      throw new Error(
        "BILL-DB-SCHEMA-PARITY contains malformed schema observation fields"
      );
    }
    const name = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (fields.has(name)) {
      throw new Error(
        `BILL-DB-SCHEMA-PARITY duplicates schema field ${name}`
      );
    }
    fields.set(name, value);
  }
  return fields;
}

function validateSchemaPass(row, errors) {
  let fields;
  try {
    fields = parseSchemaObservation(row.observed);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    return;
  }

  const expectedFields = new Set([
    "localMigrationVersion",
    "remoteMigrationVersion",
    "pendingMigrationCount",
    "dryRunPendingCount",
    ...REQUIRED_SCHEMA_CHECKS,
    "observedAt"
  ]);

  for (const name of fields.keys()) {
    if (!expectedFields.has(name)) {
      errors.push(
        `BILL-DB-SCHEMA-PARITY contains unexpected schema field ${name}`
      );
    }
  }

  for (const name of ["localMigrationVersion", "remoteMigrationVersion"]) {
    if (fields.get(name) !== PHASE2_MIGRATION_VERSION) {
      errors.push(
        `BILL-DB-SCHEMA-PARITY ${name} must be ${PHASE2_MIGRATION_VERSION}`
      );
    }
  }

  for (const name of ["pendingMigrationCount", "dryRunPendingCount"]) {
    if (fields.get(name) !== "0") {
      errors.push(`BILL-DB-SCHEMA-PARITY ${name} must be 0`);
    }
  }

  for (const name of REQUIRED_SCHEMA_CHECKS) {
    if (fields.get(name) !== "true") {
      errors.push(`BILL-DB-SCHEMA-PARITY ${name} must be true`);
    }
  }

  if (!isValidUtcTimestamp(fields.get("observedAt") ?? "")) {
    errors.push(
      "BILL-DB-SCHEMA-PARITY observedAt must be an ISO-8601 UTC timestamp"
    );
  }
}

function validateRowStructure(row, errors) {
  if (!ALLOWED_STATUSES.includes(row.status)) {
    errors.push(
      `${row.scenarioId} uses invalid status ${row.status || "(empty)"}`
    );
  }
  if (!isValidUtcDate(row.utcDate)) {
    errors.push(`${row.scenarioId} must have a valid UTC date (YYYY-MM-DD)`);
  }
  if (row.environment !== CANONICAL_ORIGIN) {
    errors.push(
      `${row.scenarioId} must use canonical environment ${CANONICAL_ORIGIN}`
    );
  }
  if (!/^redacted-[a-z0-9-]{3,100}$/.test(row.subject)) {
    errors.push(`${row.scenarioId} must use a redacted subject label`);
  }
  if (
    row.objectType !== "—" &&
    !objectTypePattern.test(row.objectType)
  ) {
    errors.push(`${row.scenarioId} has an invalid object type`);
  }
  if (
    row.objectSuffix !== "—" &&
    !suffixPattern.test(row.objectSuffix)
  ) {
    errors.push(
      `${row.scenarioId} must use only an exact last-8 suffix or —`
    );
  }
  for (const [label, value] of [
    ["Expected", row.expected],
    ["Observed", row.observed],
    ["Notes", row.notes]
  ]) {
    if (!value || value === "—") {
      errors.push(`${row.scenarioId} ${label} must be explicit`);
    }
  }
  if (row.status === "PENDING" && !/\bpending\b/i.test(row.observed)) {
    errors.push(
      `${row.scenarioId} PENDING observation must remain explicitly pending`
    );
  }
}

function validateProviderPass(row, errors) {
  if (row.objectType === "—") {
    errors.push(
      `${row.scenarioId} PASS requires a live provider object type`
    );
  }
  if (!suffixPattern.test(row.objectSuffix)) {
    errors.push(
      `${row.scenarioId} PASS requires an exact provider last-8 suffix`
    );
  }

  const evidenceText = `${row.expected}\n${row.observed}\n${row.notes}`;
  if (providerFabricationPattern.test(evidenceText)) {
    errors.push(
      `${row.scenarioId} PASS contains prohibited fabrication/config-only wording`
    );
  }
  if (
    !/\blive\b/i.test(row.observed) ||
    !/\bStripe\b/i.test(row.observed) ||
    !/\btest[- ]mode\b/i.test(row.observed) ||
    !/\bcanonical\b/i.test(row.observed)
  ) {
    errors.push(
      `${row.scenarioId} PASS requires a live Stripe test-mode canonical provider observation`
    );
  }
}

export function validateEvidence(
  source,
  { ready = false, requireAllStatus, requirePass = [] } = {}
) {
  const errors = [];
  let scenarios = [];

  try {
    scenarios = parseEvidence(source);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    return { errors, scenarios, valid: false };
  }

  const counts = new Map();
  for (const row of scenarios) {
    counts.set(row.scenarioId, (counts.get(row.scenarioId) ?? 0) + 1);
    validateRowStructure(row, errors);
  }

  for (const scenarioId of REQUIRED_SCENARIOS) {
    const count = counts.get(scenarioId) ?? 0;
    if (count === 0) {
      errors.push(`${scenarioId} is missing`);
    } else if (count > 1) {
      errors.push(`${scenarioId} appears ${count} times`);
    }
  }
  for (const scenarioId of counts.keys()) {
    if (!REQUIRED_SCENARIOS.includes(scenarioId)) {
      errors.push(
        `${scenarioId} is not a recognized Phase 2 scenario`
      );
    }
  }

  errors.push(...evidenceSecretErrors(source));

  if (ready) {
    requireAllStatus = "PASS";
  }
  if (requireAllStatus !== undefined) {
    if (!ALLOWED_STATUSES.includes(requireAllStatus)) {
      errors.push(
        `--require-all-status must be one of ${ALLOWED_STATUSES.join(", ")}`
      );
    } else {
      for (const scenarioId of REQUIRED_SCENARIOS) {
        const row = scenarios.find(
          (candidate) => candidate.scenarioId === scenarioId
        );
        if (row?.status !== requireAllStatus) {
          errors.push(`${scenarioId} must be ${requireAllStatus}`);
        }
      }
    }
  }

  const requiredPassIds = Array.isArray(requirePass)
    ? requirePass
    : String(requirePass)
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
  const requiredPassCounts = new Map();
  for (const scenarioId of requiredPassIds) {
    requiredPassCounts.set(
      scenarioId,
      (requiredPassCounts.get(scenarioId) ?? 0) + 1
    );
  }
  for (const [scenarioId, count] of requiredPassCounts) {
    if (!REQUIRED_SCENARIOS.includes(scenarioId)) {
      errors.push(`unknown required PASS scenario ${scenarioId}`);
      continue;
    }
    if (count !== 1) {
      errors.push(`required PASS scenario ${scenarioId} was requested ${count} times`);
      continue;
    }
    const matching = scenarios.filter(
      (candidate) => candidate.scenarioId === scenarioId
    );
    if (matching.length !== 1) {
      errors.push(
        `${scenarioId} must exist exactly once for --require-pass`
      );
      continue;
    }
    if (matching[0].status !== "PASS") {
      errors.push(`${scenarioId} must be PASS`);
      continue;
    }
    if (scenarioId === "BILL-DB-SCHEMA-PARITY") {
      validateSchemaPass(matching[0], errors);
    } else {
      validateProviderPass(matching[0], errors);
    }
  }

  if (ready) {
    for (const row of scenarios) {
      if (row.status !== "PASS") {
        continue;
      }
      if (row.scenarioId === "BILL-DB-SCHEMA-PARITY") {
        validateSchemaPass(row, errors);
      } else {
        validateProviderPass(row, errors);
      }
    }
  }

  return {
    errors,
    scenarios,
    valid: errors.length === 0
  };
}

export function parseMigrationList(source) {
  if (typeof source !== "string" || !source.trim()) {
    throw new Error("migration list is empty");
  }

  const local = [];
  const remote = [];
  let sawData = false;

  for (const rawLine of source.split(/\r?\n/)) {
    if (!rawLine.includes("|")) {
      continue;
    }
    const cells = rawLine.split("|").map((cell) => cell.trim());
    if (cells.length < 2) {
      throw new Error("migration list contains a malformed row");
    }
    const [localValue, remoteValue] = cells;
    if (
      /^local$/i.test(localValue) ||
      /^-+$/.test(localValue) ||
      (/^-*$/.test(localValue) && /^-+$/.test(remoteValue))
    ) {
      continue;
    }
    if (!localValue && !remoteValue) {
      continue;
    }
    if (
      (localValue && !migrationVersionPattern.test(localValue)) ||
      (remoteValue && !migrationVersionPattern.test(remoteValue))
    ) {
      throw new Error("migration list contains a malformed migration version");
    }
    sawData = true;
    if (localValue) {
      local.push(localValue);
    }
    if (remoteValue) {
      remote.push(remoteValue);
    }
  }

  if (!sawData || local.length === 0) {
    throw new Error("migration list contains no local migration versions");
  }
  if (new Set(local).size !== local.length) {
    throw new Error("migration list contains duplicate local migration versions");
  }
  if (new Set(remote).size !== remote.length) {
    throw new Error("migration list contains duplicate remote migration versions");
  }

  return { local, remote };
}

export function parseDryRun(source) {
  if (typeof source !== "string" || !source.trim()) {
    throw new Error("dry-run output is empty");
  }

  const filenames = [];
  const filenameFinder = /\b\d{14}_[a-z0-9][a-z0-9_]*\.sql\b/gi;
  for (const rawLine of source.split(/\r?\n/)) {
    const matches = rawLine.match(filenameFinder) ?? [];
    for (const match of matches) {
      const filename = match.toLowerCase();
      if (!migrationFilenamePattern.test(filename)) {
        throw new Error("dry-run output contains a malformed migration filename");
      }
      filenames.push(filename);
    }
    if (
      /\.sql\b/i.test(rawLine) &&
      matches.length === 0 &&
      !/^\s*(?:would push these migrations|migrations?)\s*:/i.test(rawLine)
    ) {
      throw new Error("dry-run output contains an unrecognized migration filename");
    }
  }

  if (new Set(filenames).size !== filenames.length) {
    throw new Error("dry-run output contains duplicate migration filenames");
  }
  if (
    filenames.length === 0 &&
    /would push these migrations\s*:/i.test(source) &&
    !/(?:up to date|no pending migrations)/i.test(source)
  ) {
    throw new Error(
      "dry-run output announced pending migrations without parseable filenames"
    );
  }

  return filenames;
}

function sameOrderedValues(left, right) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

export function validatePrepush({
  dryRunSource,
  expectedPending,
  migrationListSource
}) {
  if (!migrationVersionPattern.test(expectedPending ?? "")) {
    throw new Error("expected pending migration must be a 14-digit version");
  }

  const { local, remote } = parseMigrationList(migrationListSource);
  const dryRunFiles = parseDryRun(dryRunSource);
  const remoteSet = new Set(remote);
  const localOnly = local.filter((version) => !remoteSet.has(version));
  const localSet = new Set(local);
  const remoteOnly = remote.filter((version) => !localSet.has(version));

  if (
    localOnly.length !== 1 ||
    localOnly[0] !== expectedPending ||
    remoteOnly.length !== 0
  ) {
    throw new Error(
      `prepush migration scope must contain only pending version ${expectedPending}`
    );
  }

  const expectedFile = `${expectedPending}_subscription_billing_adjustments.sql`;
  if (
    dryRunFiles.length !== 1 ||
    dryRunFiles[0] !== expectedFile
  ) {
    throw new Error(
      `prepush dry-run scope must contain only ${expectedFile}`
    );
  }

  return {
    localVersions: local,
    pendingVersions: localOnly,
    remoteVersions: remote
  };
}

export function validatePostpush({ dryRunSource, migrationListSource }) {
  const { local, remote } = parseMigrationList(migrationListSource);
  const dryRunFiles = parseDryRun(dryRunSource);

  if (!sameOrderedValues(local, remote)) {
    throw new Error(
      "postpush migration list must have exact local/remote parity"
    );
  }
  if (dryRunFiles.length !== 0) {
    throw new Error("postpush dry-run must contain zero pending migrations");
  }

  return {
    localVersions: local,
    pendingVersions: [],
    remoteVersions: remote
  };
}

function normalizeSchemaReadiness(raw) {
  if (!isPlainObject(raw)) {
    throw new Error("schema readiness response must be one object");
  }

  const normalized = {};
  for (const [rawName, value] of Object.entries(raw)) {
    const normalizedName = schemaResponseFields.get(rawName);
    if (!normalizedName) {
      throw new Error(`unexpected schema readiness field ${rawName}`);
    }
    if (Object.hasOwn(normalized, normalizedName)) {
      throw new Error(`duplicate schema readiness field ${normalizedName}`);
    }
    if (typeof value !== "boolean") {
      throw new Error(
        `schema readiness ${normalizedName} must be boolean`
      );
    }
    normalized[normalizedName] = value;
  }

  for (const name of REQUIRED_SCHEMA_CHECKS) {
    if (normalized[name] !== true) {
      throw new Error(`schema readiness ${name} must be true`);
    }
  }
  if (Object.keys(normalized).length !== REQUIRED_SCHEMA_CHECKS.length) {
    throw new Error("schema readiness response is missing named checks");
  }

  return normalized;
}

export async function probeProductionSchema({
  expectedProjectRef = process.env.SUPABASE_PROJECT_REF,
  fetchImpl = globalThis.fetch,
  serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
} = {}) {
  if (typeof fetchImpl !== "function") {
    throw new Error("production schema probe requires fetch");
  }
  if (
    typeof expectedProjectRef !== "string" ||
    !/^[a-z0-9]{20}$/.test(expectedProjectRef)
  ) {
    throw new Error(
      "production schema probe requires the independently verified Supabase project ref"
    );
  }
  if (!serviceRoleKey || /\s/.test(serviceRoleKey)) {
    throw new Error(
      "production schema probe requires a secure service-role key"
    );
  }

  const expectedOrigin = `https://${expectedProjectRef}.supabase.co`;
  let origin;
  try {
    const url = new URL(supabaseUrl);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/"
    ) {
      throw new Error();
    }
    origin = url.origin;
  } catch {
    throw new Error(
      "production schema probe requires a credential-free HTTPS Supabase URL"
    );
  }
  if (origin !== expectedOrigin) {
    throw new Error(
      "production schema probe URL does not match the verified Supabase project"
    );
  }

  const endpoint =
    `${origin}/rest/v1/rpc/get_phase2_billing_schema_readiness`;
  const response = await fetchImpl(endpoint, {
    body: "{}",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json"
    },
    method: "POST",
    redirect: "error"
  });
  if (!response || response.status !== 200) {
    throw new Error("production schema readiness RPC must return HTTP 200");
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error("production schema readiness RPC returned invalid JSON");
  }
  if (!Array.isArray(payload) || payload.length !== 1) {
    throw new Error(
      "production schema readiness RPC must return exactly one row"
    );
  }

  return normalizeSchemaReadiness(payload[0]);
}

function getDeploymentCommit(parsed) {
  const metadataCandidates = [
    parsed.meta,
    parsed.metadata,
    parsed.git,
    parsed.github
  ].filter(isPlainObject);
  const directCandidates = [
    parsed.commit,
    parsed.commitSha,
    parsed.gitCommitSha,
    parsed.githubCommitSha
  ];
  for (const metadata of metadataCandidates) {
    directCandidates.push(
      metadata.githubCommitSha,
      metadata.gitCommitSha,
      metadata.commitSha,
      metadata.commit
    );
  }
  return directCandidates.find(
    (candidate) =>
      typeof candidate === "string" &&
      /^[a-f0-9]{40}$/i.test(candidate)
  );
}

function normalizeAliases(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => {
    const raw = typeof item === "string" ? item : item?.alias ?? item?.url;
    if (typeof raw !== "string") {
      throw new Error("deployment inspection contains a malformed alias");
    }
    return normalizeHttpsUrl(raw, "deployment alias");
  });
}

export function parseDeploymentInspection(source) {
  let parsed;
  try {
    parsed = JSON.parse(source);
  } catch {
    throw new Error("deployment inspection is not valid JSON");
  }
  if (!isPlainObject(parsed)) {
    throw new Error("deployment inspection must be one JSON object");
  }

  const project =
    parsed.projectName ??
    parsed.name ??
    (isPlainObject(parsed.project) ? parsed.project.name : undefined);
  const state =
    parsed.status ?? parsed.state ?? parsed.readyState ?? parsed.readyStateReason;
  const target =
    parsed.target ??
    parsed.environment ??
    (parsed.production === true ? "production" : undefined);
  const deploymentId = parsed.id ?? parsed.deploymentId ?? parsed.uid;
  const rawDeploymentUrl = parsed.url ?? parsed.deploymentUrl;
  const aliases = normalizeAliases(
    parsed.aliases ?? parsed.alias ?? parsed.customDomains ?? []
  );
  const commit = getDeploymentCommit(parsed);

  if (typeof project !== "string" || !project) {
    throw new Error("deployment inspection is missing project identity");
  }
  if (typeof state !== "string" || !state) {
    throw new Error("deployment inspection is missing deployment state");
  }
  if (typeof target !== "string" || !target) {
    throw new Error("deployment inspection is missing deployment target");
  }
  if (
    typeof deploymentId !== "string" ||
    !/^dpl_[A-Za-z0-9]+$/.test(deploymentId)
  ) {
    throw new Error("deployment inspection is missing a public deployment ID");
  }
  if (typeof rawDeploymentUrl !== "string") {
    throw new Error("deployment inspection is missing deployment URL");
  }
  const deploymentUrl = normalizeHttpsUrl(
    rawDeploymentUrl,
    "deployment URL"
  );
  const deployment = new URL(deploymentUrl);
  if (
    !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.vercel\.app$/i.test(
      deployment.hostname
    ) ||
    deployment.port ||
    deployment.pathname !== "/"
  ) {
    throw new Error("deployment URL must be a root Vercel HTTPS URL");
  }
  if (!commit) {
    throw new Error("deployment inspection is missing a full commit SHA");
  }

  return {
    aliases,
    commit,
    deploymentId,
    deploymentUrl,
    project,
    state: state.toUpperCase(),
    target: target.toLowerCase()
  };
}

export function validateDeployment({
  expectedAlias,
  expectedCommit,
  source
}) {
  if (!/^[a-f0-9]{40}$/i.test(expectedCommit ?? "")) {
    throw new Error("deployment expected commit must be a full public SHA");
  }
  const canonicalAlias = normalizeHttpsUrl(
    expectedAlias,
    "deployment expected alias"
  );
  const result = parseDeploymentInspection(source);

  if (result.commit.toLowerCase() !== expectedCommit.toLowerCase()) {
    throw new Error("deployment commit does not match the verified release");
  }
  if (result.project !== "soji-web") {
    throw new Error("deployment project must be exactly soji-web");
  }
  if (result.target !== "production") {
    throw new Error("deployment target must be production");
  }
  if (result.state !== "READY") {
    throw new Error("deployment state must be READY");
  }
  if (!result.aliases.includes(canonicalAlias)) {
    throw new Error("deployment aliases do not include the canonical alias");
  }

  return result;
}

async function readJsonResponse(response, label) {
  if (!response || response.status !== 200) {
    throw new Error(`${label} must return HTTP 200`);
  }
  try {
    return await response.json();
  } catch {
    throw new Error(`${label} returned invalid JSON`);
  }
}

export async function probeCanonicalReadiness({
  fetchImpl = globalThis.fetch,
  origin,
  stripeSecretKey = process.env.STRIPE_SECRET_KEY
}) {
  if (typeof fetchImpl !== "function") {
    throw new Error("canonical readiness probe requires fetch");
  }
  const normalizedOrigin = normalizeHttpsUrl(
    origin,
    "canonical readiness origin"
  );
  if (normalizedOrigin !== CANONICAL_ORIGIN) {
    throw new Error(
      `canonical readiness origin must be ${CANONICAL_ORIGIN}`
    );
  }
  if (
    !stripeSecretKey ||
    !/^sk_test_[A-Za-z0-9_-]+$/.test(stripeSecretKey)
  ) {
    throw new Error(
      "canonical readiness requires a Stripe test-mode secret in the secure process environment"
    );
  }

  const [healthResponse, meResponse] = await Promise.all([
    fetchImpl(`${normalizedOrigin}/api/health/ready`, {
      headers: { accept: "application/json" }
    }),
    fetchImpl(`${normalizedOrigin}/api/me`, {
      headers: { accept: "application/json" }
    })
  ]);
  const health = await readJsonResponse(
    healthResponse,
    "canonical readiness endpoint"
  );
  const me = await readJsonResponse(meResponse, "canonical /api/me endpoint");

  if (
    !isPlainObject(health) ||
    health.ok !== true ||
    health.status !== "ready" ||
    !isPlainObject(health.checks)
  ) {
    throw new Error("canonical readiness payload must report ready");
  }
  const checks = {};
  for (const name of REQUIRED_READINESS_CHECKS) {
    if (health.checks[name] !== true) {
      throw new Error(`canonical readiness ${name} must be true`);
    }
    checks[name] = true;
  }
  if (!isPlainObject(me) || me.source !== "supabase") {
    throw new Error("canonical /api/me source must be supabase");
  }

  return { checks, source: "supabase" };
}

const requiredReleaseFiles = [
  ".vercelignore",
  "apps/web/.env.example",
  "apps/web/next.config.ts",
  "apps/web/package.json",
  "apps/web/vercel.json",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "turbo.json"
];

function runGit(cwd, args, options = {}) {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      ...options
    });
  } catch {
    throw new Error(`release-input git ${args[0]} check failed`);
  }
}

function isBuildInput(relativePath) {
  return (
    !/(?:^|\/)(?:tests?|e2e|playwright-report|test-results|coverage)(?:\/|$)/i.test(
      relativePath
    ) &&
    !/\.(?:test|spec)\.[cm]?[jt]sx?$/i.test(relativePath)
  );
}

function validateRequiredReleaseConfig(worktreePath) {
  let vercelConfig;
  let rootPackage;
  let webPackage;
  try {
    vercelConfig = JSON.parse(
      readFileSync(path.join(worktreePath, "apps/web/vercel.json"), "utf8")
    );
    rootPackage = JSON.parse(
      readFileSync(path.join(worktreePath, "package.json"), "utf8")
    );
    webPackage = JSON.parse(
      readFileSync(path.join(worktreePath, "apps/web/package.json"), "utf8")
    );
  } catch {
    throw new Error("release input is missing valid JSON release config");
  }
  if (vercelConfig.framework !== "nextjs") {
    throw new Error("release config must select the Next.js Vercel framework");
  }
  if (
    typeof rootPackage.packageManager !== "string" ||
    !rootPackage.packageManager.startsWith("pnpm@")
  ) {
    throw new Error("release config must pin the pnpm package manager");
  }
  if (
    !isPlainObject(webPackage.scripts) ||
    typeof webPackage.scripts.build !== "string"
  ) {
    throw new Error("release config must define the Web build script");
  }

  const nextConfig = readFileSync(
    path.join(worktreePath, "apps/web/next.config.ts"),
    "utf8"
  );
  if (!/\boutput\s*:\s*["']standalone["']/.test(nextConfig)) {
    throw new Error("release config must enable standalone Next.js output");
  }
  const vercelIgnore = readFileSync(
    path.join(worktreePath, ".vercelignore"),
    "utf8"
  );
  if (!/(?:^|\n)\.env(?:\n|$)/.test(vercelIgnore)) {
    throw new Error("release config must exclude .env");
  }
  if (!/(?:^|\n)\.vercel(?:\n|$)/.test(vercelIgnore)) {
    throw new Error("release config must exclude .vercel");
  }
}

export function validateReleaseInputs({ expectedCommit, worktreePath }) {
  if (!/^[a-f0-9]{40}$/i.test(expectedCommit ?? "")) {
    throw new Error("release-input expected commit must be a full SHA");
  }
  if (!worktreePath || worktreePath.includes("\0")) {
    throw new Error("release-input worktree path is required");
  }

  let canonicalWorktree;
  try {
    canonicalWorktree = realpathSync(worktreePath);
  } catch {
    throw new Error("release-input worktree does not exist");
  }
  const topLevel = realpathSync(
    runGit(canonicalWorktree, ["rev-parse", "--show-toplevel"]).trim()
  );
  if (topLevel !== canonicalWorktree) {
    throw new Error("release-input path must be the exact worktree root");
  }
  const actualCommit = runGit(canonicalWorktree, [
    "rev-parse",
    "HEAD"
  ]).trim();
  if (actualCommit.toLowerCase() !== expectedCommit.toLowerCase()) {
    throw new Error("release-input worktree commit does not match expected commit");
  }

  let detached = false;
  try {
    execFileSync("git", ["symbolic-ref", "--quiet", "HEAD"], {
      cwd: canonicalWorktree,
      stdio: "ignore"
    });
  } catch {
    detached = true;
  }
  if (!detached) {
    throw new Error("release-input worktree must be detached");
  }

  const releasePathspecs = [
    "package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "turbo.json",
    ".vercelignore",
    "apps/web",
    "packages"
  ];
  const tracked = runGit(canonicalWorktree, [
    "ls-files",
    "-z",
    "--",
    ...releasePathspecs
  ])
    .split("\0")
    .filter(Boolean);
  const trackedSet = new Set(tracked);
  for (const file of requiredReleaseFiles) {
    if (!trackedSet.has(file)) {
      throw new Error(`release input is missing tracked required config ${file}`);
    }
  }
  if (!tracked.some((file) => file.startsWith("packages/"))) {
    throw new Error("release input must include tracked shared packages");
  }

  const dirty = runGit(canonicalWorktree, [
    "status",
    "--porcelain=v1",
    "-z",
    "--untracked-files=all",
    "--",
    ...releasePathspecs
  ]);
  if (dirty) {
    throw new Error("dirty release input detected");
  }

  for (const relativePath of tracked.filter(isBuildInput)) {
    const absolutePath = path.join(canonicalWorktree, relativePath);
    const stats = lstatSync(absolutePath);
    if (stats.isSymbolicLink()) {
      throw new Error(`release input may not use tracked symlink ${relativePath}`);
    }
    if (!stats.isFile() || stats.size > 5_000_000) {
      continue;
    }
    const source = readFileSync(absolutePath, "utf8");
    if (source.includes("\0")) {
      continue;
    }
    for (const rule of trackedSecretRules) {
      if (rule.pattern.test(source)) {
        throw new Error(
          `secret-like tracked value detected in ${relativePath} (${rule.name})`
        );
      }
    }
  }

  validateRequiredReleaseConfig(canonicalWorktree);
  return {
    commit: actualCommit,
    detached,
    trackedFiles: tracked.length
  };
}

function optionValue(args, name) {
  const indexes = args.flatMap((value, index) =>
    value === name ? [index] : []
  );
  if (indexes.length > 1) {
    throw new Error(`${name} may be supplied only once`);
  }
  if (indexes.length === 0) {
    return undefined;
  }
  const value = args[indexes[0] + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value`);
  }
  return value;
}

function positionalArguments(args, valueOptions) {
  const positional = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (valueOptions.has(arg)) {
      index += 1;
      continue;
    }
    if (arg.startsWith("--")) {
      continue;
    }
    positional.push(arg);
  }
  return positional;
}

function assertExactOptions(args, { booleanOptions = [], valueOptions = [] }) {
  const booleans = new Set(booleanOptions);
  const values = new Set(valueOptions);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (booleans.has(arg)) {
      continue;
    }
    if (values.has(arg)) {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${arg} requires a value`);
      }
      index += 1;
      continue;
    }
    throw new Error(`unexpected option or argument ${arg}`);
  }
}

async function runEvidenceMode(args) {
  const valueOptions = new Set([
    "--require-all-status",
    "--require-pass"
  ]);
  const allowedFlags = new Set([
    "--ready",
    ...valueOptions
  ]);
  for (const arg of args.filter((value) => value.startsWith("--"))) {
    if (!allowedFlags.has(arg)) {
      throw new Error(`unknown evidence option ${arg}`);
    }
  }
  const positional = positionalArguments(args, valueOptions);
  if (positional.length > 1) {
    throw new Error("evidence mode accepts at most one evidence file");
  }

  const evidencePath = path.resolve(
    process.cwd(),
    positional[0] ?? DEFAULT_EVIDENCE_PATH
  );
  const source = await readFile(evidencePath, "utf8");
  const requireAllStatus = optionValue(args, "--require-all-status");
  const rawRequiredPass = optionValue(args, "--require-pass");
  const requirePass = rawRequiredPass
    ? rawRequiredPass
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : [];
  const result = validateEvidence(source, {
    ready: args.includes("--ready"),
    requireAllStatus,
    requirePass
  });
  if (!result.valid) {
    const mode = args.includes("--ready")
      ? "ready"
      : requireAllStatus
        ? `all-${requireAllStatus}`
        : requirePass.length
          ? "required-PASS"
          : "structure/safety";
    console.error(`Phase 2 UAT evidence failed ${mode} validation:`);
    for (const error of result.errors) {
      console.error(`  - ${error}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log(
    `Phase 2 UAT evidence passed validation (${result.scenarios.length} fixed scenarios).`
  );
}

async function main() {
  const args = process.argv.slice(2);
  const productionModes = [
    "--prepush",
    "--postpush",
    "--production-schema",
    "--deployment",
    "--canonical-readiness",
    "--release-inputs"
  ].filter((mode) => args.includes(mode));
  if (productionModes.length > 1) {
    throw new Error("choose exactly one production preflight mode");
  }
  if (productionModes.length === 0) {
    await runEvidenceMode(args);
    return;
  }

  const mode = productionModes[0];
  if (mode === "--prepush" || mode === "--postpush") {
    assertExactOptions(args, {
      booleanOptions: [mode],
      valueOptions:
        mode === "--prepush"
          ? ["--migration-list", "--dry-run", "--expected-pending"]
          : ["--migration-list", "--dry-run"]
    });
    const migrationListPath = optionValue(args, "--migration-list");
    const dryRunPath = optionValue(args, "--dry-run");
    if (!migrationListPath || !dryRunPath) {
      throw new Error(
        `${mode} requires --migration-list FILE and --dry-run FILE`
      );
    }
    const migrationListSource = await readFile(migrationListPath, "utf8");
    const dryRunSource = await readFile(dryRunPath, "utf8");
    if (mode === "--prepush") {
      const expectedPending = optionValue(args, "--expected-pending");
      const result = validatePrepush({
        dryRunSource,
        expectedPending,
        migrationListSource
      });
      console.log(
        `Phase 2 prepush gate passed (pending ${result.pendingVersions[0]} only).`
      );
    } else {
      const result = validatePostpush({
        dryRunSource,
        migrationListSource
      });
      console.log(
        `Phase 2 postpush gate passed (${result.localVersions.length} versions in parity; 0 pending).`
      );
    }
    return;
  }

  if (mode === "--production-schema") {
    assertExactOptions(args, {
      booleanOptions: ["--production-schema"]
    });
    const checks = await probeProductionSchema();
    console.log(
      `Phase 2 production schema gate passed (${Object.keys(checks).length} named booleans true).`
    );
    return;
  }

  if (mode === "--deployment") {
    assertExactOptions(args, {
      valueOptions: [
        "--deployment",
        "--expected-commit-file",
        "--expected-alias"
      ]
    });
    const inspectionPath = optionValue(args, "--deployment");
    const expectedCommitPath = optionValue(args, "--expected-commit-file");
    const expectedAlias = optionValue(args, "--expected-alias");
    if (!inspectionPath || !expectedCommitPath || !expectedAlias) {
      throw new Error(
        "--deployment requires FILE, --expected-commit-file FILE, and --expected-alias URL"
      );
    }
    const [source, expectedCommitSource] = await Promise.all([
      readFile(inspectionPath, "utf8"),
      readFile(expectedCommitPath, "utf8")
    ]);
    const result = validateDeployment({
      expectedAlias,
      expectedCommit: expectedCommitSource.trim(),
      source
    });
    console.log(
      `Phase 2 deployment gate passed (${result.deploymentId}; ${result.project}; ${result.state}).`
    );
    return;
  }

  if (mode === "--canonical-readiness") {
    assertExactOptions(args, {
      valueOptions: ["--canonical-readiness"]
    });
    const origin = optionValue(args, "--canonical-readiness");
    if (!origin) {
      throw new Error("--canonical-readiness requires URL");
    }
    const result = await probeCanonicalReadiness({ origin });
    console.log(
      `Phase 2 canonical readiness passed (${Object.keys(result.checks).length} named booleans true; source ${result.source}).`
    );
    return;
  }

  if (mode === "--release-inputs") {
    assertExactOptions(args, {
      booleanOptions: ["--release-inputs"],
      valueOptions: ["--worktree-file", "--commit-file"]
    });
    const worktreeFile = optionValue(args, "--worktree-file");
    const commitFile = optionValue(args, "--commit-file");
    if (!worktreeFile || !commitFile) {
      throw new Error(
        "--release-inputs requires --worktree-file FILE and --commit-file FILE"
      );
    }
    const [worktreeSource, commitSource] = await Promise.all([
      readFile(worktreeFile, "utf8"),
      readFile(commitFile, "utf8")
    ]);
    const result = validateReleaseInputs({
      expectedCommit: commitSource.trim(),
      worktreePath: worktreeSource.trim()
    });
    console.log(
      `Phase 2 release-input gate passed (${result.commit}; ${result.trackedFiles} tracked inputs).`
    );
  }
}

const isEntryPoint =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntryPoint) {
  try {
    await main();
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error(`Phase 2 UAT validator failed: ${message}`);
    process.exitCode = 1;
  }
}
