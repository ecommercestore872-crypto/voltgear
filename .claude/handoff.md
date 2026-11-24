# Handoff: admin picks homepage products
Goal: admin chooses + orders homepage Featured / Best Sellers; "Best seller" label only on picks; empty = hidden.
Finding: `homepage_sections` is NOT read by the homepage (fetchPublicHomepageSections has no caller). Homepage uses collections + home slots (cached via fetchProductsForHomeSlots). Extended that instead.
Files: collection-store.ts (bestsellers auto rule no longer derived), collection-editor.tsx (picker for all modes, up/down order, order-aware dirty check), gadget-home-sections.tsx (Best Sellers rail hidden when no picks; no newest/"Explore products" fallback; Featured no longer falls back to rail), gadget-new-arrivals.tsx (pickLabel prop).
Decisions: no migration (collection_products.sort_order already stores order). No new Supabase reads.
Next: (1) real per-category best sellers needs a decision/migration; (2) browser check at 1440/390 with real data; (3) after merge, admin must pick products in Collections > Best Sellers (currently empty = hidden).
