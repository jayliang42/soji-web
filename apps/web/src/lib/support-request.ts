export const supportIssueOptions = [
  { id: "account", label: "账号登录" },
  { id: "membership", label: "会员或账单" },
  { id: "purchase", label: "购买或下载" },
  { id: "refund", label: "退款审核" },
  { id: "reading", label: "阅读或无障碍访问" },
  { id: "office-hours", label: "线上答疑" },
  { id: "other", label: "其他问题" }
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
    "其他问题"
  );
}

export function buildSupportRequest(draft: SupportRequestDraft) {
  const details = normalizeMultiline(draft.details);
  const context = normalizeMultiline(draft.context);
  const lines = [
    "GS学院帮助请求",
    "",
    `问题类型：${getSupportIssueLabel(draft.issue)}`,
    "",
    "我原本想做什么，以及实际发生了什么：",
    details
  ];

  if (context) {
    lines.push(
      "",
      "相关账号、产品、页面或时间信息：",
      context
    );
  }

  lines.push(
    "",
    "—",
    "此内容由 GS学院帮助中心整理，GS学院不会在此页面保存这条消息。"
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
    `GS学院帮助请求 — ${getSupportIssueLabel(draft.issue)}`
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
