import type { Metadata } from "next";
import { STOREFRONT_CATALOG_REVALIDATE } from "@/lib/storefront-cache";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { GadgetShopCatalogClient } from "@/components/gadget/gadget-shop-catalog-client";
import { FALLBACK_SHOP_TYPES, findShopType } from "@/lib/categories";
import { applyGadgetStudioImagesList } from "@/lib/gadget-product-images";
import { products2Href } from "@/lib/gadget-preview";
import { fetchCatalogProductsByCategory, fetchShopTypes } from "@/lib/db/store";
import { getSettings } from "@/lib/sanity/settings";
import { normalizeSettings } from "@/lib/site-config";
import type { Product } from "@/lib/types";
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

export const revalidate = STOREFRONT_CATALOG_REVALIDATE;

export async function generateMetadata({
  params,
}: {
  params: { category: string };
}): Promise<Metadata> {
  const types = await fetchShopTypes().catch(() => FALLBACK_SHOP_TYPES);
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
  return {
    title: { absolute: meta.title },
    description: meta.description,
    keywords: meta.keywords,
    alternates: {
      canonical: `/products/${params.category}`,
      languages: storeAlternatesLanguages(`/products/${params.category}`)
        .languages,
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      type: "website",
    },
  };
}

export default async function Products2CategoryPage({
  params,
}: {
  params: { category: string };
}) {
  let products: Product[] = [];
  let shopTypes = FALLBACK_SHOP_TYPES;
  const settings = await getSettings().catch(() => null);
  const config = normalizeSettings(settings);

  try {
    const [p, types] = await Promise.all([
      fetchCatalogProductsByCategory(params.category),
      fetchShopTypes(),
    ]);
    products = applyGadgetStudioImagesList(p);
    shopTypes = types.length ? types : FALLBACK_SHOP_TYPES;
  } catch {
    products = [];
  }

  const shop = findShopType(shopTypes, params.category);
  if (!shop && !products.some((p) => p.category === params.category)) {
    notFound();
  }

  const title = shop?.name || params.category.replace(/-/g, " ");
  const categoryProducts = products.filter(
    (p) => p.category === params.category,
  );
  const hubCopy = categoryHubCopy({ slug: params.category, name: title });
  const structured = categoryStructuredData({
    siteUrl: indexSiteUrl(),
    name: title,
    path: `/products/${params.category}`,
    slug: params.category,
    description: hubCopy,
    items: categoryProducts.slice(0, 20).map((product) => ({
      name: product.name,
      path: `/product/${product.slug}`,
    })),
  });

  const faqs = CATEGORY_FAQS[params.category] || [];

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
      <Suspense
        fallback={
          <div className="min-h-[50vh] bg-[var(--g-cream)]" aria-hidden />
        }
      >
        <GadgetShopCatalogClient
          title={title}
          description={hubCopy}
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
