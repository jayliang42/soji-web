export const SUPABASE_REQUEST_TIMEOUT_MS = 10_000;

function getInputSignal(input: RequestInfo | URL, init?: RequestInit) {
  if (init?.signal) {
    return init.signal;
  }

  return typeof Request !== "undefined" && input instanceof Request
    ? input.signal
    : undefined;
}

export async function fetchSupabase(
  input: RequestInfo | URL,
  init?: RequestInit
) {
  const controller = new AbortController();
  const inputSignal = getInputSignal(input, init);
  const abortFromInput = () => controller.abort(inputSignal?.reason);
  const timeout = setTimeout(
    () => controller.abort(new DOMException("Supabase request timed out", "TimeoutError")),
    SUPABASE_REQUEST_TIMEOUT_MS
  );

  if (inputSignal?.aborted) {
    abortFromInput();
  } else {
    inputSignal?.addEventListener("abort", abortFromInput, { once: true });
  }

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
    inputSignal?.removeEventListener("abort", abortFromInput);
  }
}
