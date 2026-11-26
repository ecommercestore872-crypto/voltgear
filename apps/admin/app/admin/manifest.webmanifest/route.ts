export const dynamic = "force-static";

export function GET() {
  return Response.json(
    {
      name: "Buy n Try Admin",
      short_name: "Admin",
      start_url: "/admin/orders",
      scope: "/admin",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#0E2419",
      icons: [
        { src: "/admin/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/admin/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json" } },
  );
}
