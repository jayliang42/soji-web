const CRLF = "\r\n";
const MAX_FILE_PART_LENGTH = 48;
const textEncoder = new TextEncoder();

export interface OfficeHourCalendarFile {
  content: string;
  filename: string;
}

export interface OfficeHourCalendarInput {
  id: string;
  startsAt: string;
  title: string;
}

function escapeIcsText(value: string) {
  return value
    .replace(/\\/gu, "\\\\")
    .replace(/\r\n|\r|\n/gu, "\\n")
    .replace(/,/gu, "\\,")
    .replace(/;/gu, "\\;");
}

function foldIcsLine(line: string) {
  const segments: string[] = [];
  let current = "";
  let currentBytes = 0;

  for (const character of line) {
    const characterBytes = textEncoder.encode(character).length;
    const limit = segments.length === 0 ? 75 : 74;

    if (current && currentBytes + characterBytes > limit) {
      segments.push(current);
      current = character;
      currentBytes = characterBytes;
    } else {
      current += character;
      currentBytes += characterBytes;
    }
  }

  if (current || segments.length === 0) {
    segments.push(current);
  }

  return segments
    .map((segment, index) => (index === 0 ? segment : ` ${segment}`))
    .join(CRLF);
}

function formatUtcDate(date: Date) {
  return date
    .toISOString()
    .replace(/[-:]/gu, "")
    .replace(/\.\d{3}Z$/u, "Z");
}

function getFilenamePart(value: string) {
  const part = value
    .normalize("NFKD")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, MAX_FILE_PART_LENGTH)
    .replace(/-+$/u, "");

  return part || "session";
}

export function buildOfficeHourCalendarFile(
  input: OfficeHourCalendarInput,
  generatedAt = new Date()
): OfficeHourCalendarFile | null {
  const title = input.title.trim();
  const id = input.id.trim();
  const startsAt = new Date(input.startsAt);

  if (
    !title ||
    !id ||
    Number.isNaN(startsAt.getTime()) ||
    Number.isNaN(generatedAt.getTime())
  ) {
    return null;
  }

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GS学院//Office Hours//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(id)}@office-hours.soji`,
    `DTSTAMP:${formatUtcDate(generatedAt)}`,
    `DTSTART:${formatUtcDate(startsAt)}`,
    `SUMMARY:${escapeIcsText(title)}`,
    "DESCRIPTION:请在 GS学院线上答疑页面查看当前访问权限和预约详情。",
    "LOCATION:线上",
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR"
  ];

  return {
    content: `${lines.map(foldIcsLine).join(CRLF)}${CRLF}`,
    filename: `soji-office-hours-${getFilenamePart(title)}.ics`
  };
}
