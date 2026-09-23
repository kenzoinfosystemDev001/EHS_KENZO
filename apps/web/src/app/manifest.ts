import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kenzo EHS — Enterprise Safety Platform",
    short_name: "Kenzo EHS",
    description: "Enterprise Environment, Health & Safety Management Platform",
    start_url: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#059669",
    orientation: "any",
    icons: [
      {
        src: "/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
