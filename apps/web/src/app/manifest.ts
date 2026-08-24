import type { MetadataRoute } from "next";
import { brandTheme } from "@soji/ui";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GS学院 · BayArea珊瑚海",
    short_name: "GS学院",
    description: "通过真实案例和实用工具，帮助你更清楚地规划申请与长期发展。",
    start_url: "/",
    display: "standalone",
    background_color: brandTheme.colors.surface,
    theme_color: brandTheme.colors.foreground
  };
}
