import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { GadgetShopCatalogClient } from "@/components/gadget/gadget-shop-catalog-client";
import { FALLBACK_SHOP_TYPES, findShopType } from "@/lib/categories";
import { applyGadgetStudioImagesList } from "@/lib/gadget-product-images";
import { products2Href } from "@/lib/gadget-preview";
import { fetchCatalogProductsByCategory, fetchShopTypes } from "@/lib/db/store";
import { loadStorefrontSettings } from "@/lib/db/storefront-shell";
import { normalizeSettings } from "@/lib/site-config";
import { localCatalogPreviewEnabled } from "@/lib/local-catalog-preview";
import type { Product } from "@/lib/types";
import { resolveCategorySeo } from "@/lib/onpage-seo";
import {
  categoryHubCopy,
  categoryRelatedGuide,
  categorySearchMeta,
  categoryStructuredData,
  indexSiteUrl,
  storeAlternatesLanguages,
  CATEGORY_FAQS,
} from "@/lib/seo-rules";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const revalidate = 300;

export async function generateMetadata(
  props: {
    params: Promise<{ category: string }>;
  }
): Promise<Metadata> {
  const params = await props.params;
  const types = localCatalogPreviewEnabled() ? FALLBACK_SHOP_TYPES : await fetchShopTypes().catch(() => FALLBACK_SHOP_TYPES);
  const shop = findShopType(
    types.length ? types : FALLBACK_SHOP_TYPES,
    params.category,
  );
  const name = shop?.name || params.category.replace(/-/g, " ");
  const meta = categorySearchMeta({
    slug: params.category,
    name,
    description: shop?.description,
  });
  const seo = resolveCategorySeo(shop, {
    title: meta.title,
    description: meta.description,
    intro: "",
    faq: [],
  });
  return {
    title: { absolute: seo.title },
    description: seo.description,
    keywords: meta.keywords,
    alternates: {
      canonical: `/products/${params.category}`,
      languages: storeAlternatesLanguages(`/products/${params.category}`)
        .languages,
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      type: "website",
    },
  };
}

export default async function Products2CategoryPage(
  props: {
    params: Promise<{ category: string }>;
  }
) {
  const params = await props.params;
  let products: Product[] = [];
  let shopTypes = FALLBACK_SHOP_TYPES;
  const preview = localCatalogPreviewEnabled();
  const [settings, p, types] = await Promise.all([
    preview ? Promise.resolve(null) : loadStorefrontSettings().catch(() => null),
    fetchCatalogProductsByCategory(params.category).catch(() => [] as Product[]),
    preview ? Promise.resolve(FALLBACK_SHOP_TYPES) : fetchShopTypes().catch(() => FALLBACK_SHOP_TYPES),
  ]);
  const config = normalizeSettings(settings);
  products = applyGadgetStudioImagesList(p);
  shopTypes = types.length ? types : FALLBACK_SHOP_TYPES;

  const shop = findShopType(shopTypes, params.category);
  if (!shop) {
    notFound();
  }

  const title = shop?.name || params.category.replace(/-/g, " ");
  const categoryProducts = products.filter(
    (p) => p.category === params.category,
  );
  const hubCopy = categoryHubCopy({ slug: params.category, name: title });
  const seo = resolveCategorySeo(shop, {
    title: "",
    description: "",
    intro: hubCopy,
    faq: CATEGORY_FAQS[params.category] || [],
  });
  const faqs = seo.faq;
  const structured = categoryStructuredData({
    faqs,
    siteUrl: indexSiteUrl(),
    name: title,
    path: `/products/${params.category}`,
    slug: params.category,
    description: seo.intro,
    items: categoryProducts.slice(0, 20).map((product) => ({
      name: product.name,
      path: `/product/${product.slug}`,
    })),
  });


  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            [
              structured.collection,
              structured.itemList,
              structured.breadcrumb,
              structured.faq,
            ].filter(Boolean)
          ).replace(/</g, "\\u003c"),
        }}
      />
      <div className="min-h-dvh bg-[var(--g-cream)]">
        <Suspense fallback={null}>
          <GadgetShopCatalogClient
            title={seo.h1 ?? title}
            description={seo.intro}
            products={products}
            shopTypes={shopTypes}
            activeCategory={params.category}
            config={config}
            flattenGrid
            guideLink={categoryRelatedGuide(params.category)}
            breadcrumbs={[
              { label: "Home", href: "/" },
              { label: "Shop", href: products2Href() },
              { label: title },
            ]}
          />
        </Suspense>
      </div>

      {seo.guide.length > 0 && (
        <section className="mx-auto max-w-4xl space-y-4 px-4 py-12 text-base leading-relaxed text-slate-600 sm:px-6 lg:px-8">
          {seo.guide.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </section>
      )}

      {faqs.length > 0 && (
        <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Common Questions About {title}
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Expert answers to help you choose the right {title.toLowerCase()} in Pakistan.
            </p>
          </div>
          <Accordion type="single" collapsible className="w-full space-y-4">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border border-slate-200 bg-white px-6 rounded-xl shadow-sm data-[state=open]:ring-2 data-[state=open]:ring-primary/20 transition-all">
                <AccordionTrigger className="text-left text-[17px] font-bold text-slate-800 hover:text-primary hover:no-underline py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 text-base leading-relaxed pb-6">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      )}
    </>
  );
}
