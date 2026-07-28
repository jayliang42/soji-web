import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import {
  LIFECYCLE_STATES,
  PUBLIC_SMOKE_ROUTES,
  probeReleaseTarget,
  validateDeploymentLifecycle,
  validateLifecycleSequence,
  validateReleaseOrigin
} from "./check-phase5-release.mjs";

const commit = "a".repeat(40);
const priorCommit = "b".repeat(40);
const candidateId = "dpl_Candidate12345678";
const priorId = "dpl_Previous87654321";
const canonicalOrigin = "https://soji-web.vercel.app";
const generatedOrigin = "https://soji-web-a1b2c3.vercel.app";

function inspection({
  aliases = [],
  commitSha = commit,
  id = candidateId,
  projectName = "soji-web",
  state = "READY",
  target = "production",
  url = generatedOrigin
} = {}) {
  return JSON.stringify({
    aliases,
    id,
    meta: { githubCommitSha: commitSha },
    projectName,
    state,
    target,
    url
  });
}

function lifecycle(lifecycleState, overrides = {}) {
  return validateDeploymentLifecycle({
    expectedCommit:
      overrides.commitSha ??
      (overrides.id === priorId ? priorCommit : commit),
    lifecycleState,
    source: inspection({
      aliases:
        lifecycleState === "staged" ? [] : [canonicalOrigin],
      commitSha:
        overrides.commitSha ??
        (overrides.id === priorId ? priorCommit : commit),
      ...overrides
    })
  });
}

test("exports only the four fixed lifecycle states", () => {
  assert.deepEqual(LIFECYCLE_STATES, [
    "staged",
    "current",
    "rolled_back",
    "repromoted"
  ]);
});

test("validates staged and current deployment identity without retaining provider URL or ID", () => {
  const staged = lifecycle("staged");
  assert.deepEqual(staged, {
    commit,
    deploymentSuffix: "12345678",
    lifecycleState: "staged"
  });
  assert.deepEqual(Object.keys(staged), [
    "commit",
    "deploymentSuffix",
    "lifecycleState"
  ]);
  assert.doesNotMatch(JSON.stringify(staged), /vercel\.app|dpl_/);

  const current = lifecycle("current", { aliases: [canonicalOrigin] });
  assert.equal(current.lifecycleState, "current");
});

test("fails closed for staged canonical alias and current missing alias", () => {
  assert.throws(
    () => lifecycle("staged", { aliases: [canonicalOrigin] }),
    /staged deployment must not include the canonical alias/
  );
  assert.throws(
    () => lifecycle("current", { aliases: [] }),
    /current deployment must include the canonical alias/
  );
});

test("rejects wrong deployment identity, malformed provider data, and unknown lifecycle", () => {
  const cases = [
    [{ projectName: "other" }, /project/],
    [{ target: "preview" }, /target/],
    [{ state: "BUILDING" }, /state/],
    [{ commitSha: "c".repeat(40) }, /commit/],
    [{ id: "candidate" }, /deployment ID/],
    [{ url: "http://soji-web-a1b2c3.vercel.app" }, /HTTPS/],
    [{ url: "https://a.b.vercel.app" }, /root Vercel/],
    [{ commitSha: undefined }, /commit/]
  ];

  for (const [overrides, message] of cases) {
    assert.throws(
      () =>
        validateDeploymentLifecycle({
          expectedCommit: commit,
          lifecycleState: "staged",
          source: inspection(overrides)
        }),
      message
    );
  }

  assert.throws(
    () =>
      validateDeploymentLifecycle({
        expectedCommit: commit,
        lifecycleState: "preview",
        source: inspection()
      }),
    /lifecycle/
  );
  assert.throws(
    () =>
      validateDeploymentLifecycle({
        expectedCommit: commit,
        lifecycleState: "staged",
        source: "{ hand edited"
      }),
    /valid JSON/
  );
});

test("accepts only prior current, candidate staged/current, prior rollback, candidate re-promotion", () => {
  const priorCurrent = lifecycle("current", {
    aliases: [canonicalOrigin],
    commitSha: priorCommit,
    id: priorId
  });
  const candidateStaged = lifecycle("staged");
  const candidateCurrent = lifecycle("current", {
    aliases: [canonicalOrigin]
  });
  const priorRolledBack = lifecycle("rolled_back", {
    aliases: [canonicalOrigin],
    commitSha: priorCommit,
    id: priorId
  });
  const candidateRepromoted = lifecycle("repromoted", {
    aliases: [canonicalOrigin]
  });

  assert.deepEqual(
    validateLifecycleSequence([
      priorCurrent,
      candidateStaged,
      candidateCurrent,
      priorRolledBack,
      candidateRepromoted
    ]),
    {
      candidateDeploymentSuffix: "12345678",
      priorDeploymentSuffix: "87654321",
      transitions: 4
    }
  );

  assert.throws(
    () =>
      validateLifecycleSequence([
        priorCurrent,
        candidateStaged,
        priorRolledBack,
        candidateRepromoted
      ]),
    /ordered lifecycle/
  );
  assert.throws(
    () =>
      validateLifecycleSequence([
        candidateCurrent,
        candidateStaged,
        candidateCurrent,
        candidateCurrent,
        candidateRepromoted
      ]),
    /prior and candidate/
  );
});

test("validates only canonical or single-label generated HTTPS origins", () => {
  assert.equal(validateReleaseOrigin(canonicalOrigin), canonicalOrigin);
  assert.equal(validateReleaseOrigin(generatedOrigin), generatedOrigin);

  for (const value of [
    "http://soji-web.vercel.app",
    "https://a.b.vercel.app",
    "https://example.com",
    "https://user:pass@soji-web.vercel.app",
    "https://soji-web.vercel.app:444",
    "https://soji-web.vercel.app/path",
    "https://soji-web.vercel.app?x=1",
    "https://soji-web.vercel.app#x"
  ]) {
    assert.throws(() => validateReleaseOrigin(value), /release origin/);
  }
});

function response({
  body = "",
  headers = {},
  json,
  status = 200
} = {}) {
  return {
    headers: new Headers(headers),
    json: async () => json,
    status,
    text: async () => body
  };
}

function successfulFetch(records, options = {}) {
  return async (url, init) => {
    records.push({ init, url });
    const route = new URL(url).pathname;
    if (route === "/api/health") {
      return response({ json: { ok: true, status: "alive" } });
    }
    if (route === "/api/health/ready") {
      return response({
        json:
          options.readiness ?? {
            checks: {
              demoModeDisabled: true,
              policiesApproved: true,
              stripeMembershipPrices: true,
              stripeTermsAcceptanceReady: true,
              stripeWebhook: true,
              supportContactConfigured: true,
              supabase: true,
              supabaseServiceRoleOperational: true
            },
            ok: true,
            status: "ready"
          }
      });
    }
    return response({
      body: options.pageBody ?? "<html><h1>Soji</h1></html>",
      headers: {
        "content-security-policy": "default-src 'self'",
        "content-type": "text/html; charset=utf-8",
        "referrer-policy": "strict-origin-when-cross-origin",
        "strict-transport-security": "max-age=31536000",
        "x-content-type-options": "nosniff",
        "x-frame-options": "DENY",
        ...options.headers
      }
    });
  };
}

test("probes a fixed credential-free route set with bounded no-store requests", async () => {
  const records = [];
  const result = await probeReleaseTarget({
    fetchImpl: successfulFetch(records),
    origin: generatedOrigin
  });

  assert.equal(result.ok, true);
  assert.deepEqual(
    records.map(({ url }) => new URL(url).pathname),
    PUBLIC_SMOKE_ROUTES
  );
  for (const { init } of records) {
    assert.equal(init.cache, "no-store");
    assert.equal(init.credentials, "omit");
    assert.equal(init.method, "GET");
    assert.equal(init.redirect, "error");
    assert.ok(init.signal instanceof AbortSignal);
  }
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /vercel\.app|<html|default-src|private-sentinel/);
});

test("returns stable failure for response, readiness, header, demo, and fetch faults", async () => {
  const failures = [
    async () => response({ status: 503 }),
    successfulFetch([], {
      readiness: { checks: { demoModeDisabled: true }, ok: true, status: "ready" }
    }),
    successfulFetch([], { headers: { "x-frame-options": "" } }),
    successfulFetch([], { pageBody: "<html>Demo preview private-sentinel</html>" }),
    async () => {
      throw new Error("private-sentinel provider body");
    }
  ];

  for (const fetchImpl of failures) {
    const result = await probeReleaseTarget({
      fetchImpl,
      origin: generatedOrigin
    });
    assert.equal(result.ok, false);
    assert.match(result.reason, /^[a-z0-9_]+$/);
    assert.doesNotMatch(
      JSON.stringify(result),
      /private-sentinel|provider body|vercel\.app|<html/
    );
  }
});

test("CLI rejects permissive input files and import is silent", () => {
  const root = mkdtempSync(path.join(tmpdir(), "soji-phase5-release-"));
  const commitFile = path.join(root, "commit.txt");
  const worktreeFile = path.join(root, "worktree.txt");
  const inspectionFile = path.join(root, "inspection.json");
  writeFileSync(commitFile, `${commit}\n`);
  writeFileSync(worktreeFile, "/tmp/release-worktree\n");
  writeFileSync(inspectionFile, inspection());
  chmodSync(commitFile, 0o644);

  const cli = spawnSync(
    process.execPath,
    [
      "scripts/check-phase5-release.mjs",
      "--deployment",
      "--lifecycle",
      "staged",
      "--expected-commit-file",
      commitFile,
      "--inspection-file",
      inspectionFile,
      "--worktree-file",
      worktreeFile
    ],
    { cwd: process.cwd(), encoding: "utf8" }
  );
  assert.notEqual(cli.status, 0);
  assert.match(cli.stderr, /0600/);

  const imported = spawnSync(
    process.execPath,
    ["--input-type=module", "--eval", `import(${JSON.stringify(pathToFileURL(path.resolve("scripts/check-phase5-release.mjs")).href)})`],
    { cwd: process.cwd(), encoding: "utf8" }
  );
  assert.equal(imported.status, 0);
  assert.equal(imported.stdout, "");
  assert.equal(imported.stderr, "");
});
