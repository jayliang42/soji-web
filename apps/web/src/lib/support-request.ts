export const supportIssueOptions = [
  { id: "account", label: "Account access" },
  { id: "membership", label: "Membership or billing" },
  { id: "purchase", label: "Purchase or download" },
  { id: "refund", label: "Refund review" },
  { id: "reading", label: "Reading or accessibility" },
  { id: "office-hours", label: "Office Hours" },
  { id: "other", label: "Something else" }
] as const;

export type SupportIssueId = (typeof supportIssueOptions)[number]["id"];

export type SupportRequestDraft = {
  context: string;
  details: string;
  issue: SupportIssueId;
};

function normalizeMultiline(value: string) {
  return value.replace(/\r\n?/gu, "\n").trim();
}

export function getSupportIssueLabel(issue: SupportIssueId) {
  return (
    supportIssueOptions.find((option) => option.id === issue)?.label ??
    "Something else"
  );
}

export function buildSupportRequest(draft: SupportRequestDraft) {
  const details = normalizeMultiline(draft.details);
  const context = normalizeMultiline(draft.context);
  const lines = [
    "Soji support request",
    "",
    `Issue type: ${getSupportIssueLabel(draft.issue)}`,
    "",
    "What I was trying to do and what happened:",
    details
  ];

  if (context) {
    lines.push(
      "",
      "Account, product, page, or timing context:",
      context
    );
  }

  lines.push(
    "",
    "—",
    "Prepared on Soji Support. This message was not saved by Soji."
  );

  return lines.join("\n");
}

export function buildSupportMailto(
  destination: string,
  draft: SupportRequestDraft
) {
  let mailto: URL;
  try {
    mailto = new URL(destination);
  } catch {
    return null;
  }

  if (mailto.protocol !== "mailto:" || mailto.search || mailto.hash) {
    return null;
  }

  mailto.searchParams.set(
    "subject",
    `Soji support — ${getSupportIssueLabel(draft.issue)}`
  );
  mailto.searchParams.set("body", buildSupportRequest(draft));
  return mailto.toString();
}

interface ClipboardWriter {
  writeText(value: string): Promise<void>;
}

export async function copySupportRequest(
  request: string,
  clipboard: ClipboardWriter | undefined
) {
  if (!clipboard) {
    return false;
  }

  try {
    await clipboard.writeText(request);
    return true;
  } catch {
    return false;
  }
}
