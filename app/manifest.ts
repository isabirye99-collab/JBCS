import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/workspace/finance",
    name: "JBCS Finance",
    short_name: "JBCS",
    description: "Johden Business Consultancy Services finance workspace",
    start_url: "/workspace/finance",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#b91c1c",
    orientation: "portrait",
    icons: [
      {
        src: "/jbcs-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        // Next.js MetadataRoute.Manifest accepts these purpose values individually.
        purpose: "any"
      }
    ],
    categories: ["business", "finance", "productivity"]
  };
}
