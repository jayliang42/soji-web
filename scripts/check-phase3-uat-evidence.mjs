import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export const DEFAULT_EVIDENCE_PATH =
  ".planning/phases/03-launch-content-and-customer-policy/03-UAT-EVIDENCE.md";

export const CANONICAL_ORIGIN = "https://soji-web.vercel.app";

export const AUTOMATED_SCENARIOS = [
  "PH3-SCHEMA-TYPE-PARITY",
  "PH3-FLAGSHIP-ASSET",
  "PH3-CONTENT-PUBLIC",
  "PH3-CONTENT-PREVIEW",
  "PH3-CONTENT-LOCKED",
  "PH3-CONTENT-FULL",
  "PH3-CONTENT-UNAVAILABLE",
  "PH3-CONTENT-NONLEAK",
  "PH3-OFFICE-VALIDATION",
  "PH3-OFFICE-GUEST-DENIAL",
  "PH3-OFFICE-MISSING-REPLAY",
  "PH3-OFFICE-FAILURE",
  "PH3-POLICY-ROUTES",
  "PH3-POLICY-FOOTER",
  "PH3-POLICY-PRICING",
  "PH3-POLICY-SHOP",
  "PH3-CHECKOUT-TERMS-CONTRACT",
  "PH3-READINESS-CONTRACT",
  "PH3-RESPONSIVE",
  "PH3-ACCESSIBILITY"
];

export const OWNER_SCENARIOS = [
  "PH3-OFFICE-MEMBER-SIGNUP",
  "PH3-OFFICE-MEMBER-REPLAY",
  "PH3-SUPPORT-RESPONSE",
  "PH3-POLICY-OWNER-APPROVAL",
  "PH3-STRIPE-TERMS-LIVE",
  "PH3-CANONICAL-CONTENT-STATES"
];

export const REQUIRED_SCENARIOS = [
  ...AUTOMATED_SCENARIOS,
  ...OWNER_SCENARIOS
];

const allowedStatuses = new Set(["BLOCKED", "FAIL", "PASS", "PENDING"]);
const allowedEvidenceClasses = new Set(["automated", "live", "owner"]);
const scenarioPattern = /^PH3-[A-Z0-9-]+$/u;
const utcTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/u;
const commitPattern = /\bcommit:\s*[a-f0-9]{7,40}\b/iu;
const commandPattern = /\bcommand:\s*[^\s].+/iu;
const fabricationPattern =
  /\b(?:mock(?:ed)?|fixture|repository\s+tests?|unit\s+tests?|contract[- ]only|configuration[- ]only|configured\s+only|config[- ]only|dry[- ]run)\b/iu;

const prohibitedRules = [
  {
    name: "email address",
    pattern:
      /\b[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+\b/iu
  },
  {
    name: "server secret assignment",
    pattern:
      /\b(?:SUPABASE_SERVICE_ROLE_KEY|STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET|CRON_SECRET)\s*=\s*\S+/iu
  },
  {
    name: "provider key",
    pattern: /\b(?:sk|rk|pk)_(?:live|test)_[a-z0-9_-]+/iu
  },
  {
    name: "Stripe webhook secret",
    pattern: /\bwhsec_[a-z0-9_-]+/iu
  },
  {
    name: "cookie header",
    pattern: /\bcookie\s*:\s*\S+/iu
  },
  {
    name: "authorization header",
    pattern: /\bauthorization\s*:\s*\S+/iu
  },
  {
    name: "token assignment",
    pattern:
      /\b(?:access|refresh|id|oauth|session)[_-]?token\s*[:=]\s*\S+/iu
  },
  {
    name: "URI credentials",
    pattern: /\bhttps?:\/\/[^\s/:@]+:[^\s/@]+@[^\s/]+/iu
  },
  {
    name: "full provider identifier",
    pattern:
      /\b(?:evt|pi|ch|sub|cus|in|price|prod|cs_(?:test|live))_[a-z0-9]{9,}\b/iu
  },
  {
    name: "raw provider payload",
    pattern: /\braw\s+(?:stripe|provider|event)?\s*payload\b/iu
  }
];

function splitEvidenceRow(line, lineNumber) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) {
    throw new Error(`malformed evidence row at line ${lineNumber}`);
  }

  const cells = trimmed
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());
  if (cells.length !== 9) {
    throw new Error(
      `malformed evidence row at line ${lineNumber}: expected 9 columns`
    );
  }

  return {
    canonicalOrigin: cells[4],
    evidenceClass: cells[2],
    expected: cells[5],
    lineNumber,
    notes: cells[8],
    observed: cells[6],
    proof: cells[7],
    scenarioId: cells[0],
    status: cells[1],
    utcObserved: cells[3]
  };
}

export function parseEvidence(source) {
  if (typeof source !== "string") {
    throw new TypeError("evidence source must be text");
  }

  const rows = [];
  for (const [index, line] of source.split(/\r?\n/u).entries()) {
    if (!/^\s*\|\s*PH3-/iu.test(line)) {
      continue;
    }

    const row = splitEvidenceRow(line, index + 1);
    if (!scenarioPattern.test(row.scenarioId)) {
      throw new Error(
        `malformed Phase 3 scenario ID ${row.scenarioId || "(empty)"} at line ${index + 1}`
      );
    }
    rows.push(row);
  }

  return rows;
}

function isValidUtcTimestamp(value) {
  return (
    utcTimestampPattern.test(value) &&
    !Number.isNaN(new Date(value).valueOf())
  );
}

function addPrivacyErrors(source, errors) {
  for (const rule of prohibitedRules) {
    if (rule.pattern.test(source)) {
      errors.push(`evidence contains a prohibited ${rule.name}`);
    }
  }

  const withoutCanonicalOrigin = source
    .split(CANONICAL_ORIGIN)
    .join("[canonical-origin]");
  if (/\bhttps?:\/\/[^\s|)`]+/iu.test(withoutCanonicalOrigin)) {
    errors.push("evidence contains a prohibited URL");
  }
}

function validateAutomatedRow(row, errors) {
  if (row.evidenceClass !== "automated") {
    errors.push(
      `${row.scenarioId} automated evidence class must be automated`
    );
  }
  if (row.canonicalOrigin !== "local-repository") {
    errors.push(
      `${row.scenarioId} automated proof must use local-repository`
    );
  }

  if (row.status === "PASS") {
    if (!isValidUtcTimestamp(row.utcObserved)) {
      errors.push(`${row.scenarioId} PASS requires a valid UTC timestamp`);
    }
    if (!commandPattern.test(row.proof) || !commitPattern.test(row.proof)) {
      errors.push(
        `${row.scenarioId} automated PASS requires named command and commit evidence`
      );
    }
  }
}

function validateOwnerRow(row, errors) {
  if (row.status === "PENDING") {
    if (
      row.evidenceClass !== "owner" ||
      row.utcObserved !== "—" ||
      row.canonicalOrigin !== "—"
    ) {
      errors.push(
        `${row.scenarioId} PENDING owner evidence must contain no fabricated observation`
      );
    }
    return;
  }

  if (row.status !== "PASS") {
    return;
  }

  if (
    row.evidenceClass !== "live" ||
    row.canonicalOrigin !== CANONICAL_ORIGIN ||
    !isValidUtcTimestamp(row.utcObserved) ||
    !/\bredacted live observation\b/iu.test(row.observed)
  ) {
    errors.push(
      `${row.scenarioId} owner PASS requires a UTC canonical redacted live observation`
    );
  }
  if (fabricationPattern.test(`${row.observed} ${row.proof} ${row.notes}`)) {
    errors.push(
      `${row.scenarioId} contains fabricated or non-live observation evidence`
    );
  }
}

export function validateEvidence(source, { ready = false } = {}) {
  const errors = [];
  addPrivacyErrors(source, errors);

  let rows = [];
  try {
    rows = parseEvidence(source);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    return { errors, valid: false };
  }

  const recognized = new Set(REQUIRED_SCENARIOS);
  const counts = new Map();
  for (const row of rows) {
    counts.set(row.scenarioId, (counts.get(row.scenarioId) ?? 0) + 1);

    if (!recognized.has(row.scenarioId)) {
      errors.push(
        `${row.scenarioId} is not a recognized Phase 3 scenario`
      );
      continue;
    }
    if (!allowedStatuses.has(row.status)) {
      errors.push(`${row.scenarioId} has invalid status ${row.status}`);
    }
    if (!allowedEvidenceClasses.has(row.evidenceClass)) {
      errors.push(
        `${row.scenarioId} has invalid evidence class ${row.evidenceClass}`
      );
    }
    if (!row.expected || !row.observed || !row.proof || !row.notes) {
      errors.push(`${row.scenarioId} has an empty required field`);
    }

    if (AUTOMATED_SCENARIOS.includes(row.scenarioId)) {
      validateAutomatedRow(row, errors);
    } else {
      validateOwnerRow(row, errors);
    }

    if (ready && row.status !== "PASS") {
      errors.push(`${row.scenarioId} must be PASS for ready mode`);
    }
  }

  for (const scenarioId of REQUIRED_SCENARIOS) {
    const count = counts.get(scenarioId) ?? 0;
    if (count === 0) {
      errors.push(`${scenarioId} is missing`);
    } else if (count > 1) {
      errors.push(`${scenarioId} appears ${count} times`);
    }
  }

  return {
    errors,
    valid: errors.length === 0
  };
}

function parseCliArgs(args) {
  let evidencePath = DEFAULT_EVIDENCE_PATH;
  let ready = false;

  for (const argument of args) {
    if (argument === "--ready") {
      ready = true;
    } else if (argument.startsWith("--")) {
      throw new Error(`unknown option ${argument}`);
    } else {
      evidencePath = argument;
    }
  }

  return { evidencePath, ready };
}

async function runCli() {
  const { evidencePath, ready } = parseCliArgs(process.argv.slice(2));
  const source = await readFile(evidencePath, "utf8");
  const result = validateEvidence(source, { ready });

  if (!result.valid) {
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    ready
      ? `Phase 3 evidence is ready (${REQUIRED_SCENARIOS.length}/${REQUIRED_SCENARIOS.length} PASS).`
      : `Phase 3 evidence structure is valid (${REQUIRED_SCENARIOS.length} fixed rows).`
  );
}

const isDirectExecution =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
