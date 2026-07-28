import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  CANONICAL_ORIGIN,
  parseDeploymentInspection,
  validateReleaseInputs
} from "./check-phase2-uat-evidence.mjs";

export const LIFECYCLE_STATES = Object.freeze([
  "staged",
  "current",
  "rolled_back",
  "repromoted"
]);

export const PUBLIC_SMOKE_ROUTES = Object.freeze([
  "/api/health",
  "/api/health/ready",
  "/",
  "/pricing",
  "/products",
  "/library",
  "/office-hours",
  "/support",
  "/privacy",
  "/terms",
  "/refund-policy",
  "/financial-disclaimer"
]);

const SECURITY_HEADERS = Object.freeze([
  "content-security-policy",
  "strict-transport-security",
  "referrer-policy",
  "x-content-type-options",
  "x-frame-options"
]);

const READINESS_CHECKS = Object.freeze([
  "demoModeDisabled",
  "launchContentOperational",
  "officeHoursOperational",
  "policiesApproved",
  "siteUrl",
  "stripe",
  "stripeMembershipPrices",
  "stripeTermsAcceptanceReady",
  "stripeWebhook",
  "supabase",
  "supabaseAdmin",
  "supabasePublicOperational",
  "supabaseServiceRoleOperational",
  "supportContactConfigured"
]);

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireFullCommit(value, label) {
  if (typeof value !== "string" || !/^[a-f0-9]{40}$/i.test(value)) {
    throw new Error(`${label} must be a full public commit SHA`);
  }
  return value.toLowerCase();
}

export function validateDeploymentLifecycle({
  expectedCommit,
  lifecycleState,
  source
}) {
  if (!LIFECYCLE_STATES.includes(lifecycleState)) {
    throw new Error("deployment lifecycle state is not recognized");
  }
  const normalizedCommit = requireFullCommit(
    expectedCommit,
    "deployment expected commit"
  );
  const parsed = parseDeploymentInspection(source);
  if (parsed.commit.toLowerCase() !== normalizedCommit) {
    throw new Error("deployment commit does not match the verified release");
  }
  if (parsed.project !== "soji-web") {
    throw new Error("deployment project must be exactly soji-web");
  }
  if (parsed.target !== "production") {
    throw new Error("deployment target must be production");
  }
  if (parsed.state !== "READY") {
    throw new Error("deployment state must be READY");
  }

  const hasCanonicalAlias = parsed.aliases.includes(CANONICAL_ORIGIN);
  if (lifecycleState === "staged") {
    if (hasCanonicalAlias) {
      throw new Error("staged deployment must not include the canonical alias");
    }
    if (parsed.deploymentUrl === CANONICAL_ORIGIN) {
      throw new Error("staged deployment URL must be a generated Vercel origin");
    }
  } else if (!hasCanonicalAlias) {
    throw new Error(
      `${lifecycleState} deployment must include the canonical alias`
    );
  }

  return {
    commit: normalizedCommit,
    deploymentSuffix: parsed.deploymentId.slice(-8),
    lifecycleState
  };
}

export function validateLifecycleSequence(states) {
  if (!Array.isArray(states) || states.length !== 5) {
    throw new Error("release must contain the complete ordered lifecycle");
  }
  const expectedStates = [
    "current",
    "staged",
    "current",
    "rolled_back",
    "repromoted"
  ];
  for (const [index, state] of states.entries()) {
    if (
      !isPlainObject(state) ||
      state.lifecycleState !== expectedStates[index]
    ) {
      throw new Error("release does not match the ordered lifecycle");
    }
    requireFullCommit(state.commit, "lifecycle commit");
    if (!/^[A-Za-z0-9]{8}$/.test(state.deploymentSuffix ?? "")) {
      throw new Error("lifecycle deployment suffix is malformed");
    }
  }

  const [priorCurrent, candidateStaged, candidateCurrent, priorRolledBack, candidateRepromoted] =
    states;
  const priorIdentity = `${priorCurrent.commit}:${priorCurrent.deploymentSuffix}`;
  const candidateIdentity = `${candidateStaged.commit}:${candidateStaged.deploymentSuffix}`;
  if (priorIdentity === candidateIdentity) {
    throw new Error("prior and candidate deployments must be distinct");
  }
  if (
    priorRolledBack.commit !== priorCurrent.commit ||
    priorRolledBack.deploymentSuffix !== priorCurrent.deploymentSuffix
  ) {
    throw new Error("rollback must restore the exact prior deployment");
  }
  for (const state of [candidateCurrent, candidateRepromoted]) {
    if (
      state.commit !== candidateStaged.commit ||
      state.deploymentSuffix !== candidateStaged.deploymentSuffix
    ) {
      throw new Error("promotion must retain the exact candidate deployment");
    }
  }

  return {
    candidateDeploymentSuffix: candidateStaged.deploymentSuffix,
    priorDeploymentSuffix: priorCurrent.deploymentSuffix,
    transitions: 4
  };
}

export function validateReleaseOrigin(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("release origin must be a permitted HTTPS Vercel origin");
  }
  const isGeneratedVercel =
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.vercel\.app$/i.test(
      parsed.hostname
    );
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.port ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash ||
    (parsed.origin !== CANONICAL_ORIGIN && !isGeneratedVercel)
  ) {
    throw new Error("release origin must be a permitted HTTPS Vercel origin");
  }
  return parsed.origin;
}

function stableFailure(reason) {
  return { ok: false, reason };
}

function hasOnlyTrueNamedChecks(value) {
  if (!isPlainObject(value)) {
    return false;
  }
  const entries = Object.entries(value);
  return (
    entries.length === READINESS_CHECKS.length &&
    READINESS_CHECKS.every((name) => value[name] === true) &&
    entries.every(
      ([name, check]) => READINESS_CHECKS.includes(name) && check === true
    )
  );
}

export async function probeReleaseTarget({
  fetchImpl = globalThis.fetch,
  origin
}) {
  if (typeof fetchImpl !== "function") {
    return stableFailure("fetch_unavailable");
  }
  let validatedOrigin;
  try {
    validatedOrigin = validateReleaseOrigin(origin);
  } catch {
    return stableFailure("origin_rejected");
  }

  const routeResults = [];
  let readinessChecks;
  for (const route of PUBLIC_SMOKE_ROUTES) {
    let response;
    try {
      response = await fetchImpl(`${validatedOrigin}${route}`, {
        cache: "no-store",
        credentials: "omit",
        method: "GET",
        redirect: "error",
        signal: AbortSignal.timeout(10_000)
      });
    } catch {
      return stableFailure("request_failed");
    }
    if (!response || response.status !== 200) {
      return stableFailure("unexpected_status");
    }

    if (route === "/api/health") {
      let payload;
      try {
        payload = await response.json();
      } catch {
        return stableFailure("liveness_invalid");
      }
      if (
        !isPlainObject(payload) ||
        payload.ok !== true ||
        payload.status !== "alive"
      ) {
        return stableFailure("liveness_invalid");
      }
    } else if (route === "/api/health/ready") {
      let payload;
      try {
        payload = await response.json();
      } catch {
        return stableFailure("readiness_invalid");
      }
      if (
        !isPlainObject(payload) ||
        payload.ok !== true ||
        payload.status !== "ready" ||
        !hasOnlyTrueNamedChecks(payload.checks)
      ) {
        return stableFailure("readiness_invalid");
      }
      readinessChecks = Object.fromEntries(
        Object.keys(payload.checks)
          .sort()
          .map((name) => [name, true])
      );
    } else {
      const contentType = response.headers?.get?.("content-type") ?? "";
      if (!/^text\/html(?:;|$)/i.test(contentType)) {
        return stableFailure("content_type_invalid");
      }
      if (route === "/") {
        const missingHeader = SECURITY_HEADERS.some(
          (name) => !(response.headers?.get?.(name) ?? "").trim()
        );
        if (missingHeader) {
          return stableFailure("security_headers_missing");
        }
      }
      let body;
      try {
        body = await response.text();
      } catch {
        return stableFailure("page_unreadable");
      }
      if (/(?:Demo preview|Preview data)/i.test(body)) {
        return stableFailure("demo_marker_present");
      }
    }
    routeResults.push({ route, status: response.status });
  }

  return {
    checks: readinessChecks,
    ok: true,
    routes: routeResults
  };
}

function readPrivateFile(filePath, label) {
  const mode = statSync(filePath).mode & 0o777;
  if (mode !== 0o600) {
    throw new Error(`${label} must use mode 0600`);
  }
  return readFileSync(filePath, "utf8").trim();
}

function optionValue(args, option) {
  const index = args.indexOf(option);
  if (index === -1 || !args[index + 1] || args[index + 1].startsWith("--")) {
    throw new Error(`${option} requires a value`);
  }
  if (args.indexOf(option, index + 1) !== -1) {
    throw new Error(`${option} may appear only once`);
  }
  return args[index + 1];
}

async function runCli(args) {
  if (args[0] === "--deployment") {
    const lifecycleState = optionValue(args, "--lifecycle");
    const commitFile = optionValue(args, "--expected-commit-file");
    const inspectionFile = optionValue(args, "--inspection-file");
    const worktreeFile = optionValue(args, "--worktree-file");
    const expectedCommit = readPrivateFile(
      commitFile,
      "expected commit file"
    );
    const worktreePath = readPrivateFile(worktreeFile, "worktree file");
    const source = readPrivateFile(inspectionFile, "inspection file");
    validateReleaseInputs({ expectedCommit, worktreePath });
    const result = validateDeploymentLifecycle({
      expectedCommit,
      lifecycleState,
      source
    });
    process.stdout.write(
      `Phase 5 deployment gate passed (${result.lifecycleState}; ${result.deploymentSuffix}).\n`
    );
    return;
  }

  if (args[0] === "--smoke") {
    const originFile = optionValue(args, "--origin-file");
    const origin = readPrivateFile(originFile, "release origin file");
    const result = await probeReleaseTarget({ origin });
    if (!result.ok) {
      throw new Error(`Phase 5 smoke gate failed (${result.reason})`);
    }
    process.stdout.write(
      `Phase 5 smoke gate passed (${result.routes.length} routes; ${Object.keys(result.checks).length} checks).\n`
    );
    return;
  }

  throw new Error("usage: --deployment ... or --smoke --origin-file FILE");
}

const isDirectExecution =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  runCli(process.argv.slice(2)).catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : "Phase 5 release gate failed"}\n`
    );
    process.exitCode = 1;
  });
}
