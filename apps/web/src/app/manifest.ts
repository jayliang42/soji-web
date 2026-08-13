import type { MetadataRoute } from "next";
import { brandTheme } from "@soji/ui";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BayArea珊瑚海 by GS学院",
    short_name: "GS学院",
    description:
      "Practical guidance for strategic spending, family financial foundations, and lasting wealth.",
    start_url: "/",
    display: "standalone",
    background_color: brandTheme.colors.surface,
    theme_color: brandTheme.colors.foreground
  };
}
