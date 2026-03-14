import { officeHourSessions, sampleLibrary } from "@soji/domain";

export function getAllContent() {
  return sampleLibrary;
}

export function getContentBySlug(slug: string) {
  return sampleLibrary.find((item) => item.slug === slug) ?? null;
}

export function getOfficeHours() {
  return officeHourSessions;
}
