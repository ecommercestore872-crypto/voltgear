/** Local PostgREST fixture. No upstream connection; every mutation is rejected. */
import http from "node:http";

export const fixtureProduct = {
  id: "00000000-0000-4000-8000-000000000001", name: "Tracking QA product", slug: "tracking-qa-product",
  category: "accessories", price: 1999, sku: "QA-PRODUCT", status: "published", stock_status: "in-stock",
  quantity: 20, is_demo: false, short_description: "Isolated tracking regression fixture",
  product_images: [{ url: "/gadget/products/stylus-universal-active.webp", sort_order: 0 }],
  product_variants: [], product_reviews: [], cloudinary_images: [],
};

const server = http.createServer((request, response) => {
  const url = new URL(request.url, "http://127.0.0.1");
  response.setHeader("Content-Type", "application/json");
  if (!["GET", "HEAD"].includes(request.method)) {
    response.writeHead(403);
    response.end(JSON.stringify({ code: "QA_MUTATIONS_BLOCKED", message: "Fixture rejects all writes" }));
    return;
  }
  const table = url.pathname.split("/").at(-1);
  let data = [];
  if (table === "products") {
    const slug = url.searchParams.get("slug");
    data = !slug || slug === "eq.tracking-qa-product" ? [fixtureProduct] : [];
  }
  if (table === "categories") data = [{ id: "qa-category", slug: "accessories", name: "Accessories", active: true, sort_order: 0 }];
  if (String(request.headers.accept).includes("application/vnd.pgrst.object+json")) data = data[0] ?? null;
  response.setHeader("Content-Range", `0-${Math.max(0, (Array.isArray(data) ? data.length : 1) - 1)}/${Array.isArray(data) ? data.length : 1}`);
  response.end(JSON.stringify(data));
});
server.listen(4589, "127.0.0.1", () => console.log("Isolated read-only fixture listening on 127.0.0.1:4589"));
