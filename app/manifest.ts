import type { MetadataRoute } from "next";
import config from "@/business.config";

/** Makes the app installable from the browser ("Add to Home Screen"), no app store needed. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `Book with ${config.business.name}`,
    short_name: config.business.shortName,
    start_url: "/",
    display: "standalone",
    background_color: config.brand.colours.paper,
    theme_color: config.brand.colours.paper,
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
