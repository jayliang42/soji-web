export interface MarkdownOutlineItem {
  id: string;
  label: string;
  level: number;
  line: number;
}

function getPlainHeadingLabel(value: string) {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/gu, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/gu, "$1")
    .replace(/\[([^\]]+)\]\[[^\]]*\]/gu, "$1")
    .replace(/`+([^`]+)`+/gu, "$1")
    .replace(/<[^>]+>/gu, "")
    .replace(/[\\*_~]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function getHeadingId(label: string, count: number) {
  const base =
    label
      .normalize("NFKD")
      .toLocaleLowerCase("en-US")
      .replace(/\p{Mark}+/gu, "")
      .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
      .replace(/^-+|-+$/gu, "") || "section";

  return count === 1 ? base : `${base}-${count}`;
}

export function getMarkdownOutline(
  content: string | null | undefined
): MarkdownOutlineItem[] {
  if (!content?.trim()) {
    return [];
  }

  const headings: MarkdownOutlineItem[] = [];
  const idCounts = new Map<string, number>();
  const lines = content.split(/\r?\n/u);
  let fence: { character: "`" | "~"; length: number } | null = null;

  const addHeading = ({
    label: rawLabel,
    level,
    line
  }: {
    label: string;
    level: number;
    line: number;
  }) => {
    const label = getPlainHeadingLabel(rawLabel);
    if (!label) {
      return;
    }

    const idBase = getHeadingId(label, 1);
    const count = (idCounts.get(idBase) ?? 0) + 1;
    idCounts.set(idBase, count);
    headings.push({
      id: getHeadingId(label, count),
      label,
      level,
      line
    });
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const fenceMatch = line.match(/^[ \t]{0,3}(`{3,}|~{3,})/u);

    if (fenceMatch?.[1]) {
      const marker = fenceMatch[1];
      const character = marker[0] as "`" | "~";
      if (!fence) {
        fence = { character, length: marker.length };
      } else if (
        fence.character === character &&
        marker.length >= fence.length
      ) {
        fence = null;
      }
      continue;
    }

    if (fence) {
      continue;
    }

    const atxHeading = line.match(
      /^[ \t]{0,3}(#{1,4})[ \t]+(.+?)[ \t]*$/u
    );
    if (atxHeading?.[1] && atxHeading[2]) {
      addHeading({
        label: atxHeading[2].replace(/[ \t]+#+[ \t]*$/u, ""),
        level: atxHeading[1].length,
        line: index + 1
      });
      continue;
    }

    const setextUnderline = lines[index + 1]?.match(
      /^[ \t]{0,3}(=+|-+)[ \t]*$/u
    );
    if (line.trim() && setextUnderline?.[1]) {
      addHeading({
        label: line.trim(),
        level: setextUnderline[1][0] === "=" ? 1 : 2,
        line: index + 1
      });
      index += 1;
    }
  }

  return headings;
}
