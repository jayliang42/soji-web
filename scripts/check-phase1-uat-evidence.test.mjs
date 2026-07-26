import assert from "node:assert/strict";
import test from "node:test";
import {
  REQUIRED_SCENARIOS,
  parseEvidence,
  validateEvidence
} from "./check-phase1-uat-evidence.mjs";

function artifact(status = "PENDING") {
  const rows = REQUIRED_SCENARIOS.map(
    (scenarioId) =>
      `| ${scenarioId} | ${status} | — | production | redacted-label | pending observation |`
  ).join("\n");

  return `# Phase 1 evidence

| Scenario ID | Status | UTC date | Environment | Subject | Observation |
|---|---|---|---|---|---|
${rows}
`;
}

test("parses and accepts a complete pending artifact in safety mode", () => {
  const source = artifact();
  assert.equal(parseEvidence(source).length, 8);
  assert.equal(validateEvidence(source).valid, true);
});

test("accepts only an all-PASS artifact in ready mode", () => {
  assert.equal(validateEvidence(artifact("PASS"), { ready: true }).valid, true);

  for (const status of ["PENDING", "FAIL", "BLOCKED"]) {
    const result = validateEvidence(artifact(status), { ready: true });
    assert.equal(result.valid, false);
    assert.match(result.errors.join("\n"), /must be PASS/);
  }
});

test("rejects missing and duplicate required scenarios", () => {
  const missing = artifact().replace(
    /^\| INFRA-01-MIGRATIONS .*\n/m,
    ""
  );
  assert.match(
    validateEvidence(missing).errors.join("\n"),
    /INFRA-01-MIGRATIONS is missing/
  );

  const duplicateRow =
    "| INFRA-01-MIGRATIONS | PENDING | — | production | redacted-label | pending observation |";
  const duplicate = `${artifact()}\n${duplicateRow}\n`;
  assert.match(
    validateEvidence(duplicate).errors.join("\n"),
    /INFRA-01-MIGRATIONS appears 2 times/
  );
});

test("rejects invalid statuses", () => {
  const source = artifact().replace(
    "| AUTH-02-GOOGLE | PENDING |",
    "| AUTH-02-GOOGLE | COMPLETE |"
  );
  assert.match(
    validateEvidence(source).errors.join("\n"),
    /AUTH-02-GOOGLE uses invalid status COMPLETE/
  );
});

test("rejects likely secrets, credentials, and raw email addresses", () => {
  const prohibitedSamples = [
    "Bearer aaaaaaaaaaaa.bbbbbbbbbbbb.cccccccc",
    "service_role",
    "SUPABASE_SERVICE_ROLE_KEY=hidden",
    "whsec_hidden",
    "sk_live_hidden",
    "password=hidden",
    "Cookie: session=hidden",
    "Authorization: Basic hidden",
    "access_token: hidden",
    "https://user:secret@database.example",
    "uat-person@example.com"
  ];

  for (const sample of prohibitedSamples) {
    const result = validateEvidence(`${artifact()}\n${sample}\n`);
    assert.equal(result.valid, false, `expected rejection for ${sample}`);
  }
});
