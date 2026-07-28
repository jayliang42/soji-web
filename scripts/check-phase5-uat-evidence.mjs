import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  CANONICAL_ORIGIN,
  OWNER_SCENARIOS as PHASE4_OWNER_SCENARIOS
} from "./check-phase4-uat-evidence.mjs";

export { CANONICAL_ORIGIN };

export const DEFAULT_EVIDENCE_PATH =
  ".planning/phases/05-production-deployment-and-rollback/05-UAT-EVIDENCE.md";

export const AUTOMATED_SCENARIOS = Object.freeze([
  "PH5-EXACT-RELEASE-INPUT",
  "PH5-DEPLOYMENT-PARSER",
  "PH5-LIFECYCLE-TRANSITIONS",
  "PH5-BODY-FREE-SMOKE",
  "PH5-STANDALONE-ARTIFACT",
  "PH5-NONROOT-IMAGE",
  "PH5-LOCAL-ROLLBACK-DRILL",
  "PH5-RELEASE-REGRESSION",
  "PH5-DOCS",
  "PH5-PRIVACY-VALIDATION"
]);

export const PHASE5_OWNER_SCENARIOS = Object.freeze([
  "PH5-ENV-READINESS",
  "PH5-STAGED-DEPLOYMENT",
  "PH5-STAGED-SMOKE",
  "PH5-CANONICAL-PROMOTION",
  "PH5-CANONICAL-SMOKE",
  "PH5-ROLLBACK",
  "PH5-PRIOR-SMOKE",
  "PH5-REPROMOTE-SMOKE"
]);

export const DEPLOYMENT_OWNER_SCENARIOS = Object.freeze(
  PHASE5_OWNER_SCENARIOS.filter(
    (scenarioId) => scenarioId !== "PH5-ENV-READINESS"
  )
);

export const OWNER_SCENARIOS = Object.freeze([
  ...PHASE4_OWNER_SCENARIOS,
  ...PHASE5_OWNER_SCENARIOS
]);

export const REQUIRED_SCENARIOS = Object.freeze([
  ...AUTOMATED_SCENARIOS,
  ...OWNER_SCENARIOS
]);

const allowedStatuses = new Set(["BLOCKED", "FAIL", "PASS", "PENDING"]);
const allowedEvidenceClasses = new Set(["automated", "live", "owner"]);
const scenarioPattern =
  /^(?:(?:INFRA|AUTH|ADMIN)-\d{2}|BILL|PH[345])-[A-Z0-9-]+$/u;
const utcTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/u;
const commandPattern = /\bcommand:\s*[^\s].+/iu;
const commitPattern = /\bcommit:\s*[a-f0-9]{7,40}\b/iu;
const deploymentSuffixPattern =
  /\bdeployment suffix:\s*[A-Za-z0-9]{8}\b/iu;
const fabricationPattern =
  /\b(?:mock(?:ed)?|fixture|repository\s+tests?|unit\s+tests?|contract[- ]only|configuration[- ]only|configured\s+only|config[- ]only|dry[- ]run)\b/iu;

const prohibitedRules = [
  {
    name: "generated deployment URL",
    pattern:
      /\bhttps:\/\/[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.vercel\.app\b/iu
  },
  {
    name: "full deployment identifier",
    pattern: /\bdpl_[A-Za-z0-9]{9,}\b/u
  },
  {
    name: "email address",
    pattern:
      /\b[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+\b/iu
  },
  {
    name: "secret assignment",
    pattern:
      /\b(?:NEXT_PUBLIC_[A-Z0-9_]+|SUPABASE_[A-Z0-9_]+|STRIPE_[A-Z0-9_]+|CRON_SECRET|OPS_ALERT_WEBHOOK_URL)\s*=\s*\S+/u
  },
  {
    name: "provider key",
    pattern: /\b(?:sk|rk|pk)_(?:live|test)_[a-z0-9_-]+/iu
  },
  {
    name: "webhook secret",
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
    name: "private filesystem path",
    pattern: /(?:^|[\s(])\/(?:Users|home|private|var\/folders)\/\S+/imu
  },
  {
    name: "user identity",
    pattern: /\b(?:user|account|customer)\s+identity\s*:\s*\S+/iu
  },
  {
    name: "raw response or provider body",
    pattern: /\braw\s+(?:response|provider|deployment)\s+body\b/iu
  },
  {
    name: "raw logs",
    pattern: /\braw\s+(?:provider|deployment|application)?\s*logs?\b/iu
  },
  {
    name: "raw error",
    pattern: /\braw\s+error(?:\s+message)?\s*:\s*\S+/iu
  },
  {
    name: "full provider identifier",
    pattern:
      /\b(?:evt|pi|ch|sub|cus|in|price|prod|cs_(?:test|live))_[a-z0-9]{9,}\b/iu
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
    if (
      !/^\s*\|\s*(?:INFRA|AUTH|ADMIN|BILL|PH[345])-/iu.test(line)
    ) {
      continue;
    }
    const row = splitEvidenceRow(line, index + 1);
    if (!scenarioPattern.test(row.scenarioId)) {
      throw new Error(
        `malformed Phase 5 scenario ID ${row.scenarioId || "(empty)"} at line ${index + 1}`
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
  const withoutCanonicalOrigin = source
    .split(CANONICAL_ORIGIN)
    .join("[canonical-origin]");
  for (const rule of prohibitedRules) {
    if (rule.pattern.test(withoutCanonicalOrigin)) {
      errors.push(`evidence contains a prohibited ${rule.name}`);
    }
  }
  if (/\bhttps?:\/\/[^\s|)`]+/iu.test(withoutCanonicalOrigin)) {
    errors.push("evidence contains a prohibited URL");
  }
}

function validateAutomatedRow(row, errors) {
  if (row.evidenceClass !== "automated") {
    errors.push(`${row.scenarioId} automated evidence class must be automated`);
  }
  if (row.canonicalOrigin !== "local-repository") {
    errors.push(`${row.scenarioId} automated proof must use local-repository`);
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
  } else if (
    row.status === "PENDING" &&
    (row.utcObserved !== "—" ||
      row.observed !== "Pending repository regression." ||
      row.proof !== "pending repository command")
  ) {
    errors.push(
      `${row.scenarioId} automated PENDING must contain no fabricated observation`
    );
  }
}

function validateOwnerRow(row, errors) {
  if (row.status === "PENDING") {
    if (
      row.evidenceClass !== "owner" ||
      row.utcObserved !== "—" ||
      row.canonicalOrigin !== "—" ||
      row.observed !== "Pending owner observation." ||
      row.proof !== "pending owner observation"
    ) {
      errors.push(
        `${row.scenarioId} PENDING owner evidence must contain no observation`
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
  if (
    DEPLOYMENT_OWNER_SCENARIOS.includes(row.scenarioId) &&
    !deploymentSuffixPattern.test(`${row.observed} ${row.proof} ${row.notes}`)
  ) {
    errors.push(
      `${row.scenarioId} live proof requires one final-eight deployment suffix`
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
    return { errors, rows, valid: false };
  }

  const recognized = new Set(REQUIRED_SCENARIOS);
  const counts = new Map();
  for (const row of rows) {
    counts.set(row.scenarioId, (counts.get(row.scenarioId) ?? 0) + 1);
    if (!recognized.has(row.scenarioId)) {
      errors.push(`${row.scenarioId} is not a recognized Phase 5 scenario`);
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
  return { errors, rows, valid: errors.length === 0 };
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
      process.stderr.write(`- ${error}\n`);
    }
    process.exitCode = 1;
    return;
  }
  process.stdout.write(
    ready
      ? `Phase 5 evidence is ready (${REQUIRED_SCENARIOS.length}/${REQUIRED_SCENARIOS.length} PASS).\n`
      : `Phase 5 evidence structure is valid (${REQUIRED_SCENARIOS.length} fixed rows).\n`
  );
}

const isDirectExecution =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  runCli().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : "Phase 5 evidence validation failed"}\n`
    );
    process.exitCode = 1;
  });
}
