import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  downloadOfficeHourCalendar,
  OfficeHourCalendarButton
} from "@/components/office-hour-calendar-button";
import { buildOfficeHourCalendarFile } from "@/lib/office-hour-calendar";

const calendarInput = {
  id: "office-hour-1",
  startsAt: "2026-07-30T18:00:00.000Z",
  title: "Family decision office hour"
};

describe("Office Hours calendar download", () => {
  it("builds a deterministic UTC iCalendar event without inventing a duration", () => {
    const file = buildOfficeHourCalendarFile(
      calendarInput,
      new Date("2026-07-28T12:34:56.000Z")
    );

    expect(file).toEqual({
      content: [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Soji//Office Hours//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        "UID:office-hour-1@office-hours.soji",
        "DTSTAMP:20260728T123456Z",
        "DTSTART:20260730T180000Z",
        "SUMMARY:Family decision office hour",
        "DESCRIPTION:Review current access and reservation details on the Soji Offic",
        " e Hours page.",
        "LOCATION:Online",
        "STATUS:CONFIRMED",
        "END:VEVENT",
        "END:VCALENDAR",
        ""
      ].join("\r\n"),
      filename: "soji-office-hours-family-decision-office-hour.ics"
    });
    expect(file?.content).not.toContain("DTEND");
    expect(file?.content).not.toContain("DURATION");
    expect(file?.content).not.toContain("signup");
    expect(file?.content).not.toContain("replay");
  });

  it("escapes content and folds every physical line to 75 UTF-8 bytes", () => {
    const file = buildOfficeHourCalendarFile(
      {
        ...calendarInput,
        title:
          "Family, money; decisions\nA very long discussion with café context and shared tradeoffs"
      },
      new Date("2026-07-28T12:34:56.000Z")
    );
    const encoder = new TextEncoder();

    expect(file?.content).toContain(
      "SUMMARY:Family\\, money\\; decisions\\nA very long discussion"
    );
    for (const line of file?.content.split("\r\n") ?? []) {
      expect(encoder.encode(line).length).toBeLessThanOrEqual(75);
    }
  });

  it("rejects incomplete or invalid calendar inputs", () => {
    expect(
      buildOfficeHourCalendarFile({ ...calendarInput, startsAt: "not-a-date" })
    ).toBeNull();
    expect(
      buildOfficeHourCalendarFile({ ...calendarInput, title: " " })
    ).toBeNull();
    expect(
      buildOfficeHourCalendarFile(
        calendarInput,
        new Date("invalid-generated-at")
      )
    ).toBeNull();
  });

  it("downloads the exact file and cleans up the temporary browser URL", async () => {
    const file = buildOfficeHourCalendarFile(calendarInput);
    expect(file).not.toBeNull();

    let capturedBlob: Blob | undefined;
    const link = {
      click: vi.fn(),
      download: "",
      href: "",
      remove: vi.fn()
    };
    const appendLink = vi.fn();
    const revokeObjectUrl = vi.fn();

    expect(
      downloadOfficeHourCalendar(file!, {
        appendLink,
        createLink: () => link,
        createObjectUrl: (blob) => {
          capturedBlob = blob;
          return "blob:soji-calendar";
        },
        revokeObjectUrl
      })
    ).toBe(true);
    expect(link.download).toBe(file?.filename);
    expect(link.href).toBe("blob:soji-calendar");
    expect(link.click).toHaveBeenCalledOnce();
    expect(appendLink).toHaveBeenCalledWith(link);
    expect(link.remove).toHaveBeenCalledOnce();
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:soji-calendar");
    expect(await capturedBlob?.text()).toBe(file?.content);
  });

  it("reports a blocked browser download without throwing", () => {
    const file = buildOfficeHourCalendarFile(calendarInput);
    expect(file).not.toBeNull();

    expect(
      downloadOfficeHourCalendar(file!, {
        appendLink: vi.fn(),
        createLink: () => {
          throw new Error("blocked");
        },
        createObjectUrl: () => "blob:soji-calendar",
        revokeObjectUrl: vi.fn()
      })
    ).toBe(false);
  });

  it("renders a title-specific accessible action before hydration", () => {
    const html = renderToStaticMarkup(
      <OfficeHourCalendarButton {...calendarInput} />
    );

    expect(html).toContain(
      'aria-label="Add Family decision office hour to calendar"'
    );
    expect(html).toContain("Add to calendar");
    expect(html).toContain("min-h-11");
    expect(html).toContain('aria-live="polite"');
  });
});
