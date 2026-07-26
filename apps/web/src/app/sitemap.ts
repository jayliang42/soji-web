import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/env";

const publicRoutes = [
  { path: "", changeFrequency: "weekly", priority: 1 },
  { path: "/library", changeFrequency: "weekly", priority: 0.9 },
  { path: "/pricing", changeFrequency: "monthly", priority: 0.8 },
  { path: "/products", changeFrequency: "weekly", priority: 0.8 },
  { path: "/office-hours", changeFrequency: "weekly", priority: 0.7 }
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  if (!siteUrl) {
    return [];
  }

  return publicRoutes.map(({ path, changeFrequency, priority }) => ({
    url: `${siteUrl}${path}`,
    changeFrequency,
    priority
  }));
}
