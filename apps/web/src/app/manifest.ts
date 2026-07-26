import type { MetadataRoute } from "next";
import { brandTheme } from "@soji/ui";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Well Endowed by Soji",
    short_name: "Soji",
    description:
      "Practical guidance for strategic spending, family financial foundations, and lasting wealth.",
    start_url: "/",
    display: "standalone",
    background_color: brandTheme.colors.surface,
    theme_color: brandTheme.colors.foreground
  };
}
