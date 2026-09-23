import { SHOPPER_BRAND } from "@/lib/brand";
import type { DealCatalogProduct, DealRecord } from "@/lib/db/deal-rules";
import { cheaperUnitPrice, comboPaidAfterDeal } from "@/lib/db/deal-rules";

export function escapeHtml(raw: unknown): string {
  return String(raw ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function money(n: number): string {
  return `Rs ${Math.round(n).toLocaleString("en-PK")}`;
}

export function dealGraphicHtml(deal: DealRecord, a: DealCatalogProduct, b: DealCatalogProduct): string {
  const cheaper = cheaperUnitPrice(a.price, b.price);
  const paid = comboPaidAfterDeal(a.price, b.price, deal.percentOff);
  const listed = a.price + b.price;
  const title = escapeHtml(deal.title || `${a.name} + ${b.name}`);
  const brand = escapeHtml(SHOPPER_BRAND.spokenName);
  const nameA = escapeHtml(a.name);
  const nameB = escapeHtml(b.name);
  const imgA = a.imageUrl ? escapeHtml(a.imageUrl) : "";
  const imgB = b.imageUrl ? escapeHtml(b.imageUrl) : "";
  const offer = `Buy 2 · ${deal.percentOff}% off the cheaper item`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} — ${brand} deal graphic</title>
  <style>
    :root { --forest:#1F3626; --cream:#F4EFE6; --white:#FFFaf3; --charcoal:#1A1A1A; --taupe:#7A7268; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Georgia, "Times New Roman", serif; background: #d9d0c3; color: var(--charcoal); padding: 32px 16px 64px; }
    h1 { font-size: 20px; text-align: center; margin: 0 0 8px; }
    .hint { text-align: center; color: #5c564e; font-family: system-ui, sans-serif; font-size: 13px; margin: 0 0 28px; }
    .stage { display: flex; flex-wrap: wrap; gap: 28px; justify-content: center; }
    .card { background: var(--cream); color: var(--charcoal); position: relative; overflow: hidden; }
    .square { width: 1080px; height: 1080px; }
    .story { width: 1080px; height: 1920px; }
    .inner { height: 100%; padding: 72px; display: flex; flex-direction: column; }
    .brand { font-family: system-ui, sans-serif; letter-spacing: .28em; text-transform: uppercase; font-size: 18px; color: var(--forest); }
    .offer { margin-top: 28px; font-size: 42px; line-height: 1.15; }
    .story .offer { font-size: 56px; }
    .pair { margin-top: auto; display: grid; grid-template-columns: 1fr 1fr; gap: 28px; }
    .item { background: var(--white); border-radius: 28px; padding: 28px; min-height: 420px; }
    .photo { height: 280px; border-radius: 20px; background: #e8e0d4 center/cover no-repeat; margin-bottom: 18px; }
    .name { font-size: 28px; margin: 0 0 8px; }
    .price { font-family: system-ui, sans-serif; font-size: 22px; color: var(--taupe); margin: 0; }
    .totals { margin-top: 32px; font-family: system-ui, sans-serif; }
    .was { color: var(--taupe); text-decoration: line-through; font-size: 24px; }
    .now { font-size: 48px; font-weight: 700; color: var(--forest); }
    .note { margin-top: 16px; font-size: 18px; color: var(--taupe); font-family: system-ui, sans-serif; }
    .badge { position: absolute; top: 56px; right: 56px; background: var(--forest); color: var(--cream); font-family: system-ui, sans-serif; font-size: 28px; font-weight: 700; padding: 14px 22px; border-radius: 999px; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p class="hint">Open this file, screenshot the square (1080) for feed ads and the tall card (1080×1920) for Stories / Reels. Off is only on the cheaper item (${money(cheaper)}).</p>
  <div class="stage">
    ${frame("square", offer, brand, nameA, nameB, imgA, imgB, a.price, b.price, listed, paid, deal.percentOff)}
    ${frame("story", offer, brand, nameA, nameB, imgA, imgB, a.price, b.price, listed, paid, deal.percentOff)}
  </div>
</body>
</html>`;
}

function frame(
  size: "square" | "story",
  offer: string,
  brand: string,
  nameA: string,
  nameB: string,
  imgA: string,
  imgB: string,
  priceA: number,
  priceB: number,
  listed: number,
  paid: number,
  percent: number
): string {
  return `<article class="card ${size}">
    <div class="badge">${percent}% OFF</div>
    <div class="inner">
      <p class="brand">${brand}</p>
      <p class="offer">${escapeHtml(offer)}</p>
      <div class="pair">
        <div class="item">
          <div class="photo"${imgA ? ` style="background-image:url('${imgA}')"` : ""}></div>
          <p class="name">${nameA}</p>
          <p class="price">${money(priceA)}</p>
        </div>
        <div class="item">
          <div class="photo"${imgB ? ` style="background-image:url('${imgB}')"` : ""}></div>
          <p class="name">${nameB}</p>
          <p class="price">${money(priceB)}</p>
        </div>
      </div>
      <div class="totals">
        <p class="was">${money(listed)}</p>
        <p class="now">${money(paid)}</p>
        <p class="note">Percent comes off the cheaper item only. COD nationwide.</p>
      </div>
    </div>
  </article>`;
}
