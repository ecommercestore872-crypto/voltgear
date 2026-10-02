import Image from "next/image";
import Link from "next/link";
import { STORE_V2_COLLECTIONS } from "./store-v2.constants";
import type { Product, Testimonial } from "@/lib/types";
import { StoreV2CategoryIcon } from "./store-v2-category-icons";
import { storeV2ProductHref, storeV2ProductImage } from "./store-v2-utils";
import { formatPrice } from "@/lib/utils";
import { products2Href } from "@/lib/gadget-preview";

type TrustItem = { title: string; detail: string; icon: "cod" | "track" | "returns" | "warranty" };

function trustIcon(kind: TrustItem["icon"]) {
  const paths: Record<TrustItem["icon"], string> = {
    cod: "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
    track: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    returns: "M3 10h10a4 4 0 0 1 4 4v6H3v-10zM21 14H11a4 4 0 0 0-4 4v2h14v-6z",
    warranty: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d={paths[kind]} />
    </svg>
  );
}

export function StoreV2TrustStrip({ items }: { items: TrustItem[] }) {
  return (
    <div className="sv2-trust" role="region" aria-label="Store promises">
      <div className="sv2-container sv2-trust-inner">
        {items.map((item) => (
          <div key={item.title} className="sv2-trust-item">
            <span className="sv2-trust-icon">{trustIcon(item.icon)}</span>
            <div>
              <strong>{item.title}</strong>
              <span>{item.detail}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StoreV2Categories({
  tiles,
}: {
  tiles: { label: string; href: string; slug: string }[];
}) {
  const list = tiles.slice(0, 6);
  const tile = (t: (typeof list)[0]) => (
    <Link key={t.href} className="sv2-cat-icon-tile" href={t.href}>
      <StoreV2CategoryIcon slug={t.slug} />
      <span className="sv2-cat-icon-label">{t.label}</span>
    </Link>
  );

  return (
    <section className="sv2-section sv2-categories" aria-labelledby="sv2-cat-heading">
      <div className="sv2-container">
        <div className="sv2-section-head">
          <div>
            <p className="sv2-eyebrow">Shop by need</p>
            <h2 id="sv2-cat-heading">Categories</h2>
          </div>
          <Link className="sv2-pill-btn" href={products2Href()}>
            View all
          </Link>
        </div>
        <div className="sv2-cat-icon-grid">{list.map(tile)}</div>
        <div className="sv2-cat-icon-rail">{list.map(tile)}</div>
      </div>
    </section>
  );
}

export function StoreV2Featured({
  main,
  side,
  productImage,
  productHref,
}: {
  main: Product;
  side: Product[];
  productImage?: typeof storeV2ProductImage;
  productHref?: typeof storeV2ProductHref;
}) {
  const img = productImage ?? storeV2ProductImage;
  const href = productHref ?? storeV2ProductHref;
  const sideA = side[0];
  const sideB = side[1];
  return (
    <section className="sv2-section sv2-featured" aria-labelledby="sv2-featured-heading">
      <div className="sv2-container">
        <div className="sv2-section-head">
          <div>
            <span className="sv2-ribbon">Featured products</span>
            <h2 id="sv2-featured-heading">This week&apos;s picks</h2>
          </div>
          <Link className="sv2-link-arrow" href={products2Href()}>
            Shop featured
          </Link>
        </div>
        <div className="sv2-featured-layout">
          <article className="sv2-featured-main">
            <Link href={href(main)} className="sv2-featured-main-link">
              <div className="sv2-featured-visual">
                <Image src={img(main, 900)} alt={main.name} width={900} height={900} className="sv2-contain-img" />
              </div>
              <div className="sv2-featured-main-copy">
                <h3>{main.name}</h3>
                <p className="sv2-price">{formatPrice(main.price)}</p>
                <span className="sv2-pill-btn sv2-pill-btn--dark">Buy on COD</span>
              </div>
            </Link>
          </article>
          <div className="sv2-featured-side">
            {sideA ? (
              <Link href={href(sideA)} className="sv2-spot-card">
                <div className="sv2-spot-visual">
                  <span className="sv2-spot-dept">Power</span>
                  <Image src={img(sideA, 400)} alt={sideA.name} width={400} height={400} className="sv2-contain-img" />
                </div>
                <div className="sv2-spot-body">
                  <h3>{sideA.name}</h3>
                  <p className="sv2-spot-price">{formatPrice(sideA.price)}</p>
                </div>
              </Link>
            ) : null}
            {sideB ? (
              <Link href={href(sideB)} className="sv2-spot-card sv2-spot-card--night">
                <div className="sv2-spot-visual">
                  <span className="sv2-spot-dept">Drive</span>
                  <Image src={img(sideB, 400)} alt={sideB.name} width={400} height={400} className="sv2-contain-img" />
                </div>
                <div className="sv2-spot-body">
                  <h3>{sideB.name}</h3>
                  <p className="sv2-spot-price">{formatPrice(sideB.price)}</p>
                </div>
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export function StoreV2Collections() {
  return (
    <section className="sv2-section sv2-collections" aria-labelledby="sv2-col-heading">
      <div className="sv2-container">
        <div className="sv2-section-head">
          <div>
            <p className="sv2-eyebrow">Collections</p>
            <h2 id="sv2-col-heading">Shop the edit</h2>
          </div>
          <Link className="sv2-link-arrow" href="/collections/featured">
            View all
          </Link>
        </div>
        <div className="sv2-col-bento">
          {STORE_V2_COLLECTIONS.map((c) => (
            <Link key={c.index} href={c.href} className={`sv2-col sv2-col--${c.layout}`}>
              <Image src={c.img} alt="" fill sizes="(max-width:900px) 85vw, 33vw" className="sv2-col-img" />
              <div className="sv2-col-scrim" aria-hidden="true" />
              <div className="sv2-col-content">
                <span className="sv2-col-tag">{c.tag}</span>
                <h3>{c.title}</h3>
                <p>
                  <span>{c.count} products</span>
                  <span aria-hidden="true">→</span>
                </p>
              </div>
              <span className="sv2-col-index" aria-hidden="true">
                {c.index}
              </span>
            </Link>
          ))}
        </div>
        <div className="sv2-col-rail">
          {STORE_V2_COLLECTIONS.map((c) => (
            <Link key={`rail-${c.index}`} href={c.href} className="sv2-col-rail-card">
              <span className="sv2-col-rail-media">
                <Image src={c.img} alt="" width={320} height={240} className="sv2-cover-img" />
              </span>
              <span className="sv2-col-rail-body">
                <span className="sv2-col-rail-index">{c.index}</span>
                <strong>{c.title}</strong>
                <span>
                  {c.count} products · {c.tag}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function StoreV2ProductRow({
  id,
  title,
  products,
  viewAllHref,
  productImage,
  productHref,
  tone,
}: {
  id: string;
  title: string;
  products: Product[];
  viewAllHref: string;
  productImage?: typeof storeV2ProductImage;
  productHref?: typeof storeV2ProductHref;
  tone?: "soft" | "default";
}) {
  const img = productImage ?? storeV2ProductImage;
  const hrefFn = productHref ?? storeV2ProductHref;
  if (!products.length) return null;
  return (
    <section className={`sv2-section sv2-loadout${tone === "soft" ? " sv2-loadout--soft" : ""}`} aria-labelledby={id}>
      <div className="sv2-container">
        <div className="sv2-section-head">
          <h2 id={id}>{title}</h2>
          <Link className="sv2-link-arrow" href={viewAllHref}>
            View all
          </Link>
        </div>
        <div className="sv2-product-grid">
          {products.slice(0, 4).map((p) => (
            <Link key={p._id} href={hrefFn(p)} className="sv2-product-card">
              <div className="sv2-product-media">
                <Image src={img(p, 600)} alt={p.name} width={600} height={600} className="sv2-contain-img" />
              </div>
              <h3>{p.name}</h3>
              <p className="sv2-price">{formatPrice(p.price)}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function StoreV2Reviews({ reviews }: { reviews: Testimonial[] }) {
  const list = reviews.slice(0, 4);
  if (!list.length) return null;
  return (
    <section className="sv2-section sv2-reviews" aria-labelledby="sv2-reviews-heading">
      <div className="sv2-container">
        <div className="sv2-section-head">
          <div>
            <p className="sv2-eyebrow">Customer reviews</p>
            <h2 id="sv2-reviews-heading">People trust Buy n Try</h2>
          </div>
          <div className="sv2-review-summary">
            <span className="sv2-review-score">4.9★</span>
            <span>Verified buyers</span>
          </div>
        </div>
        <div className="sv2-review-grid">
          {list.map((r, i) => (
            <blockquote key={`${r.customerName}-${i}`} className={`sv2-review-card${i === 0 ? " sv2-review-card--quote" : ""}`}>
              <p>{r.reviewText}</p>
              <footer>
                <strong>{r.customerName}</strong>
                {r.verified ? <span>Verified COD</span> : null}
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
