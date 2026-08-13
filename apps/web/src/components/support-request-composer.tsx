"use client";

import {
  type FormEvent,
  useEffect,
  useId,
  useRef,
  useState
} from "react";
import {
  buildSupportMailto,
  buildSupportRequest,
  copySupportRequest,
  type SupportIssueId,
  supportIssueOptions
} from "@/lib/support-request";

const minimumDetailsLength = 10;
const maximumDetailsLength = 1_200;
const maximumContextLength = 300;

type CopyStatus = "copied" | "idle" | "manual";

export function SupportRequestComposer({
  destination
}: {
  destination: string | null;
}) {
  const detailsId = useId();
  const contextId = useId();
  const issueId = useId();
  const manualCopyId = useId();
  const manualCopyRef = useRef<HTMLTextAreaElement>(null);
  const [issue, setIssue] = useState<SupportIssueId>("account");
  const [details, setDetails] = useState("");
  const [context, setContext] = useState("");
  const [prepared, setPrepared] = useState(false);
  const [error, setError] = useState("");
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");

  const draft = { context, details, issue };
  const request = buildSupportRequest(draft);
  const emailHref = destination
    ? buildSupportMailto(destination, draft)
    : null;
  const webDestination =
    destination && !emailHref ? destination : null;

  useEffect(() => {
    if (copyStatus === "manual") {
      manualCopyRef.current?.focus();
      manualCopyRef.current?.select();
    }
  }, [copyStatus]);

  function markChanged(nextDetails = details) {
    setCopyStatus("idle");
    if (error && nextDetails.trim().length >= minimumDetailsLength) {
      setError("");
    }
  }

  function handlePrepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (details.trim().length < minimumDetailsLength) {
      setPrepared(false);
      setError(
        `Describe what happened using at least ${minimumDetailsLength} characters.`
      );
      document.getElementById(detailsId)?.focus();
      return;
    }

    setError("");
    setPrepared(true);
    setCopyStatus("idle");
  }

  async function handleCopy() {
    const copied = await copySupportRequest(
      request,
      typeof navigator.clipboard?.writeText === "function"
        ? navigator.clipboard
        : undefined
    );
    setCopyStatus(copied ? "copied" : "manual");
  }

  const actionStatus =
    copyStatus === "copied"
      ? "Request copied. Paste it into your support message."
      : copyStatus === "manual"
        ? "Automatic copying is unavailable. The full request is selected below."
        : prepared
          ? "Request ready. Review it before opening or copying it."
          : "Your prepared request will appear here.";

  return (
    <div className="border-t border-dune bg-white px-6 py-8 sm:px-8 sm:py-10">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.02fr)_minmax(20rem,0.98fr)] lg:gap-10">
        <form className="min-w-0" noValidate onSubmit={handlePrepare}>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-clay">
            Request builder
          </p>
          <h3 className="mt-3 font-display text-2xl font-semibold leading-tight text-cocoa md:text-3xl">
            Prepare the details.
          </h3>
          <p className="mt-3 max-w-xl text-sm leading-6 text-cocoa/68">
            Nothing is sent or saved here. You choose how to share the finished
            request.
          </p>

          <div className="mt-7">
            <label
              className="block text-sm font-bold text-cocoa"
              htmlFor={issueId}
            >
              What do you need help with?
            </label>
            <select
              className="mt-2 min-h-12 w-full rounded-md border border-cocoa/30 bg-white px-3 py-2 text-base text-cocoa outline-none transition-colors focus:border-clay focus:ring-2 focus:ring-clay/25"
              id={issueId}
              onChange={(event) => {
                setIssue(event.target.value as SupportIssueId);
                markChanged();
              }}
              value={issue}
            >
              {supportIssueOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-6">
            <label
              className="block text-sm font-bold text-cocoa"
              htmlFor={detailsId}
            >
              What were you trying to do, and what happened instead?
            </label>
            <p
              className="mt-1 text-sm leading-6 text-cocoa/62"
              id={`${detailsId}-hint`}
            >
              Include the result you expected. Do not include passwords, card
              numbers, or authentication codes.
            </p>
            {error ? (
              <p
                className="mt-2 border-l-4 border-clay pl-3 text-sm font-bold text-clay"
                id={`${detailsId}-error`}
                role="alert"
              >
                {error}
              </p>
            ) : null}
            <textarea
              aria-describedby={`${detailsId}-hint${
                error ? ` ${detailsId}-error` : ""
              }`}
              aria-invalid={error ? "true" : undefined}
              className={`mt-2 min-h-36 w-full resize-y rounded-md border bg-white px-3 py-3 text-base leading-6 text-cocoa outline-none transition-colors focus:border-clay focus:ring-2 focus:ring-clay/25 ${
                error ? "border-clay" : "border-cocoa/30"
              }`}
              id={detailsId}
              maxLength={maximumDetailsLength}
              minLength={minimumDetailsLength}
              onChange={(event) => {
                setDetails(event.target.value);
                markChanged(event.target.value);
              }}
              required
              value={details}
            />
            <p className="mt-1 text-right text-xs text-cocoa/68">
              {details.length.toLocaleString()} /{" "}
              {maximumDetailsLength.toLocaleString()} characters
            </p>
          </div>

          <div className="mt-6">
            <label
              className="block text-sm font-bold text-cocoa"
              htmlFor={contextId}
            >
              Account, product, page, or timing context{" "}
              <span className="font-medium text-cocoa/58">(optional)</span>
            </label>
            <p
              className="mt-1 text-sm leading-6 text-cocoa/62"
              id={`${contextId}-hint`}
            >
              Add only what will help Support identify the issue.
            </p>
            <textarea
              aria-describedby={`${contextId}-hint`}
              className="mt-2 min-h-24 w-full resize-y rounded-md border border-cocoa/30 bg-white px-3 py-3 text-base leading-6 text-cocoa outline-none transition-colors focus:border-clay focus:ring-2 focus:ring-clay/25"
              id={contextId}
              maxLength={maximumContextLength}
              onChange={(event) => {
                setContext(event.target.value);
                markChanged();
              }}
              value={context}
            />
          </div>

          <button
            className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-md bg-cocoa px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-cocoa/90 sm:w-auto"
            type="submit"
          >
            Prepare my request
          </button>
        </form>

        <aside
          aria-labelledby="support-request-preview-heading"
          className="min-w-0 self-start rounded-xl border border-dune bg-shell p-5 sm:p-6 lg:sticky lg:top-24"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-cocoa/68">
                Preview
              </p>
              <h3
                className="mt-2 font-display text-2xl font-semibold text-cocoa"
                id="support-request-preview-heading"
              >
                Your support request
              </h3>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                prepared
                  ? "bg-accent-muted text-clay"
                  : "bg-dune/70 text-cocoa/62"
              }`}
            >
              {prepared ? "Ready" : "Draft"}
            </span>
          </div>

          <p
            aria-live="polite"
            className="mt-4 text-sm font-medium leading-6 text-cocoa/68"
          >
            {actionStatus}
          </p>

          {prepared ? (
            <>
              <pre
                aria-label="Prepared support request"
                className="mt-5 max-h-[26rem] overflow-auto whitespace-pre-wrap break-words rounded-md border border-dune bg-white p-4 font-sans text-sm leading-6 text-cocoa/76 outline-none focus:border-clay focus:ring-2 focus:ring-clay/25"
                tabIndex={0}
              >
                {request}
              </pre>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {emailHref ? (
                  <a
                    className="inline-flex min-h-12 items-center justify-center rounded-md bg-clay px-5 py-3 text-center text-sm font-bold text-white transition-colors hover:bg-clay/90"
                    href={emailHref}
                  >
                    Open email draft
                  </a>
                ) : null}
                <button
                  className={`inline-flex min-h-12 items-center justify-center rounded-md border px-5 py-3 text-sm font-bold transition-colors ${
                    emailHref
                      ? "border-cocoa/30 text-cocoa hover:border-cocoa hover:bg-white"
                      : "border-clay bg-clay text-white hover:bg-clay/90"
                  }`}
                  onClick={handleCopy}
                  type="button"
                >
                  {copyStatus === "copied" ? "Request copied" : "Copy request"}
                </button>
              </div>

              {webDestination ? (
                <a
                  className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-clay underline decoration-clay/35 underline-offset-4 hover:decoration-clay"
                  href={webDestination}
                  rel="noreferrer"
                  target="_blank"
                >
                  Open the GS学院 support channel
                  <span className="sr-only"> in a new tab</span>
                </a>
              ) : null}

              {!destination ? (
                <p className="mt-4 border-l-4 border-clay bg-accent-muted px-4 py-3 text-sm leading-6 text-cocoa/72">
                  The support channel is still being configured. Copy your
                  request now and return here before purchasing.
                </p>
              ) : null}

              {copyStatus === "manual" ? (
                <div
                  className="mt-4 rounded-md border border-clay/35 bg-accent-muted p-3"
                  role="status"
                >
                  <label
                    className="block text-xs font-bold text-cocoa"
                    htmlFor={manualCopyId}
                  >
                    Copy this request manually
                  </label>
                  <textarea
                    className="mt-2 min-h-40 w-full resize-y rounded-md border border-cocoa/30 bg-white px-3 py-3 text-sm leading-6 text-cocoa outline-none focus:border-clay focus:ring-2 focus:ring-clay/25"
                    id={manualCopyId}
                    onFocus={(event) => event.currentTarget.select()}
                    readOnly
                    ref={manualCopyRef}
                    value={request}
                  />
                  <p className="mt-2 text-xs leading-5 text-cocoa/65">
                    Your browser blocked automatic copying. The full request is
                    selected and ready to copy.
                  </p>
                </div>
              ) : null}
            </>
          ) : (
            <div className="mt-5 rounded-md border border-dashed border-cocoa/25 bg-white/70 px-5 py-12 text-center">
              <svg
                aria-hidden="true"
                className="mx-auto h-8 w-8 text-clay/60"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  d="M7 3.75h7l3 3V20.25H7V3.75Z"
                  stroke="currentColor"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                />
                <path
                  d="M14 3.75v3h3M9.5 11h5M9.5 14.5h5"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.5"
                />
              </svg>
              <p className="mt-3 text-sm font-semibold leading-6 text-cocoa/62">
                Add a short description, then prepare your request to review
                the exact message.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
