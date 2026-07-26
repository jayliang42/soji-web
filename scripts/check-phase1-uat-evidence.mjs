import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_EVIDENCE_PATH =
  ".planning/phases/01-production-identity-and-admin/01-UAT-EVIDENCE.md";

export const REQUIRED_SCENARIOS = [
  "INFRA-01-MIGRATIONS",
  "INFRA-01-READINESS",
  "AUTH-01-SIGNUP",
  "AUTH-01-RECOVERY",
  "AUTH-02-GOOGLE",
  "ADMIN-01-BOOTSTRAP",
  "ADMIN-01-ROLE-TRANSITION",
  "ADMIN-01-WORKSPACES"
];

export const ALLOWED_STATUSES = ["PENDING", "PASS", "FAIL", "BLOCKED"];

const secretRules = [
  {
    name: "bearer/JWT value",
    pattern: /\bbearer\s+[a-z0-9_-]{12,}\.[a-z0-9_-]{12,}(?:\.[a-z0-9_-]{8,})?/i
  },
  { name: "service-role marker", pattern: /\bservice_role\b/i },
  {
    name: "service-role key assignment",
    pattern: /\bSUPABASE_SERVICE_ROLE_KEY\s*=/i
  },
  { name: "Stripe webhook secret", pattern: /\bwhsec_[a-z0-9_-]+/i },
  { name: "Stripe live secret", pattern: /\bsk_live_[a-z0-9_-]+/i },
  { name: "password assignment", pattern: /\bpassword\s*=\s*\S+/i },
  { name: "cookie header", pattern: /\bcookie\s*:\s*\S+/i },
  { name: "authorization header", pattern: /\bauthorization\s*:\s*\S+/i },
  {
    name: "token assignment",
    pattern: /\b(?:access|refresh|id|oauth)[_-]?token\s*[:=]\s*\S+/i
  },
  {
    name: "URI credentials",
    pattern: /\bhttps?:\/\/[^\s/:@]+:[^\s/@]+@[^\s/]+/i
  },
  {
    name: "email address",
    pattern: /\b[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+\b/i
  }
];

export function parseEvidence(source) {
  const scenarioPattern = /^(?:INFRA|AUTH|ADMIN)-\d{2}-[A-Z0-9-]+$/;

  return source
    .split(/\r?\n/)
    .filter((line) => line.trim().startsWith("|"))
    .map((line) =>
      line
        .trim()
        .slice(1, -1)
        .split("|")
        .map((cell) => cell.trim())
    )
    .filter((cells) => cells.length >= 2 && scenarioPattern.test(cells[0]))
    .map((cells) => ({
      scenarioId: cells[0],
      status: cells[1]
    }));
}

export function validateEvidence(source, { ready = false } = {}) {
  const errors = [];
  const scenarios = parseEvidence(source);
  const counts = new Map();

  for (const scenario of scenarios) {
    counts.set(scenario.scenarioId, (counts.get(scenario.scenarioId) ?? 0) + 1);
    if (!ALLOWED_STATUSES.includes(scenario.status)) {
      errors.push(
        `${scenario.scenarioId} uses invalid status ${scenario.status || "(empty)"}`
      );
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

  for (const scenarioId of counts.keys()) {
    if (!REQUIRED_SCENARIOS.includes(scenarioId)) {
      errors.push(`${scenarioId} is not a recognized Phase 1 scenario`);
    }
  }

  for (const rule of secretRules) {
    if (rule.pattern.test(source)) {
      errors.push(`evidence contains a prohibited ${rule.name}`);
    }
  }

  if (ready) {
    for (const scenarioId of REQUIRED_SCENARIOS) {
      const scenario = scenarios.find(
        (candidate) => candidate.scenarioId === scenarioId
      );
      if (scenario?.status !== "PASS") {
        errors.push(`${scenarioId} must be PASS in ready mode`);
      }
    }
  }

  return {
    errors,
    scenarios,
    valid: errors.length === 0
  };
}

async function main() {
  const args = process.argv.slice(2);
  const ready = args.includes("--ready");
  const positional = args.filter((arg) => arg !== "--ready");
  const evidencePath = path.resolve(
    process.cwd(),
    positional[0] ?? DEFAULT_EVIDENCE_PATH
  );
  const source = await readFile(evidencePath, "utf8");
  const result = validateEvidence(source, { ready });

  if (!result.valid) {
    console.error(
      `Phase 1 UAT evidence failed ${ready ? "ready" : "structure/safety"} validation:`
    );
    for (const error of result.errors) {
      console.error(`  - ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `Phase 1 UAT evidence passed ${ready ? "ready" : "structure/safety"} validation (${result.scenarios.length} scenarios).`
  );
}

const isEntryPoint =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntryPoint) {
  await main();
}
