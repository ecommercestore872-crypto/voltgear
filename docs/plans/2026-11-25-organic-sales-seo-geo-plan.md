# Plan: Organic sales through SEO, GEO and AEO

Date: 2026-11-25. Status: PLAN ONLY. Nothing in the store has been changed.
Extends (does not replace) docs/plans/2026-09-21-seo-ranking-master-plan.md.

## 1. Honest goal

Nobody can force #1 for every query on Google, or force ChatGPT, Claude, Perplexity or Gemini to name one brand first. What can be done: win the queries where buyers are ready to purchase (price, COD, best-under-budget, X vs Y, Pakistan), get cited by AI answers on those same queries, and make the site convert those visitors. Expect first movement in 4-8 weeks, real sales growth in 3-6 months, competitive category pages in 6-12 months.

## 2. Skills used as the knowledge base

ECC is not installed in this environment (only two cc-skill-* notes exist). The "agentic awesome skills" pack is installed (Agents/skills and plugins/agentic-awesome-skills-claude). SEO-related skills picked from it:

| Job | Skills |
|-----|--------|
| Full audit | seo-audit, seo-fundamentals, web-performance-optimization |
| AI answers (GEO/AEO) | ai-seo (+ platform-ranking-factors reference), geo-fundamentals (has scripts/geo_checker.py), seo-snippet-hunter |
| Keywords and structure | seo-keyword-strategist, seo-content-planner, seo-structure-architect, seo-cannibalization-detector, seo-meta-optimizer |
| Content quality and trust | seo-content-writer, seo-content-auditor, seo-content-refresher, seo-authority-builder (E-E-A-T), copywriting |
| Schema | schema-markup |
| Comparison pages | competitor-alternatives, alternatives-pages |
| Scale pages safely | programmatic-seo |
| Off-site and social | social-content, reddit-automation (needs Rube/Composio, probably skip), apify-competitor-intelligence, apify-brand-reputation-monitoring |
| Sales conversion | page-cro, analytics-tracking |

Repo rules that bind all of this: AGENTS.md, .agents/rules/60-performance-seo.md, and commerce truth (no fake reviews, ratings, stock, sales counts, badges or schema).

## 3. What the store already has (verified in code, live site not reachable from this sandbox)

- Canonical URLs, live-only sitemap with real lastmod, robots.txt that allows Googlebot, Bingbot, GPTBot, ChatGPT-User, PerplexityBot, ClaudeBot, anthropic-ai, Google-Extended.
- llms.txt generated from store settings, IndexNow key route, Google Merchant feed (app/google-merchant.xml), RSS feed.
- Product, Organization, Breadcrumb, category and FAQ JSON-LD (honest, data-backed).
- Admin-editable on-page SEO for categories, products, city pages. City COD hubs at /cod/[city]. Compare page. Blog.
- A test (pdp-static.test.ts) that stops product pages from silently becoming slow and uncached.

So technical SEO is mostly done. The remaining gaps are authority (backlinks and third-party mentions), content depth, real reviews, measurement, and AI-citation tracking. That is where competitors beat a young store.

## 4. Phase 0 - Protect the store first (before any SEO change)

The earlier incident (product pages disappearing while ads ran) must not repeat. Rules for every phase:

1. No direct changes to the live store. Every change goes on a branch, gets a Vercel preview URL, and is checked there first.
2. Add one small smoke-test script: fetch a sample of product, category, cart and checkout URLs from the sitemap and fail if any is not 200 or has no price. Run it on the preview before merge and on production right after deploy.
3. Never delete or unpublish products to "clean up SEO". Retired products keep a page or 301 to the category.
4. Sitemap product count is recorded before each deploy and compared after. A drop is a stop signal.
5. Full check (npm run ci) plus phone and desktop browser check before every deploy, as AGENTS.md requires.
6. No database changes without approval. Content edits go through the existing admin SEO fields where possible, not code.
7. Avoid deploys during peak ad hours. Ads and SEO changes are never released at the same time.
8. Rollback note: the previous Vercel deployment is promoted back if the smoke test fails.

## 5. Phase 1 - Real data, then keywords (week 1-2)

Do not guess keywords. Use what Pakistani buyers actually search.

- Owner gives access: Google Search Console (sc-domain:buyntryy.com already verified), Bing Webmaster Tools, GA4, Google Merchant Center. The Adspirer connector can read GSC and GA4, but only Meta Ads is connected and its monthly quota is used up. Reconnect or wait for the quota reset.
- Pull from GSC: top queries, pages, CTR, and "striking distance" queries (position 8-20, fastest wins). Pull question-style queries (what, which, best, price, vs, kya, kitna).
- Add outside demand: Google autocomplete and People Also Ask for each category, Google Trends (Pakistan), Keyword Planner (Pakistan), Bing Webmaster keyword research. Optional paid: Ahrefs or Semrush (needs owner approval).
- SERP and AI audit for the top 5 categories (earbuds, smartwatch, power bank, charger, and one more): who ranks (Daraz, PriceOye, Telemart, etc.), what page type, and who ChatGPT, Perplexity, Gemini and Claude cite for a test set of 40 buyer questions. This is the baseline score we try to move.
- Output: one keyword workbook, one primary keyword per URL (use seo-cannibalization-detector to avoid overlap).

## 6. Phase 2 - Technical and speed audit (week 2-3)

Run seo-audit and web-performance-optimization against the live site. Check: GSC indexing report (earlier baseline had 76 "discovered, not indexed" pages), Core Web Vitals on mobile, product schema (price, availability, shipping, return policy only if real), filter and search URLs kept out of the index, orphan products, image alt text, duplicate titles. Validate with Google Rich Results Test. Fix in small separate branches.

Big organic lever to confirm: Google Merchant Center free product listings (feed already exists) so products appear in Google Shopping and AI shopping results at no ad cost. Also submit the same data to Bing Merchant Center.

## 7. Phase 3 - Pages that make sales (week 3-10)

Per category, build a cluster: hub page, products, 2-4 guides, one comparison page.

- Hub and product pages: answer-first intro, spec table, real FAQ built from GSC and PAA questions, clear price, COD, delivery and return info (only what the store really offers), internal links to related products.
- Buying guides: "best power bank under 5000 in Pakistan", "how many mAh do I need", "earbuds vs airpods".
- Comparison pages (competitor-alternatives skill): product vs product and "choose between" pages. No false claims about named competitors.
- Every guide: TL;DR at top, named author or team, last-updated date, self-contained answer paragraphs, FAQ schema. These are the traits AI engines pull.
- Real proof beats copy: real photos, real test notes, real customer reviews (invite reviews after delivery via existing write-review flow). Zero invented content.
- City COD hubs already exist; extend only with unique, useful copy, not duplicates.

## 8. Phase 4 - Get cited by ChatGPT, Gemini, Perplexity, Claude (ongoing from week 4)

How each one chooses sources (from ai-seo): ChatGPT and Copilot lean on the Bing index, so Bing Webmaster and IndexNow matter. Gemini and AI Overviews lean on Google rankings, schema and Merchant data. Claude uses Brave search. Perplexity rewards fresh, well-structured pages with FAQ schema. All of them heavily cite third-party sources (Reddit, YouTube, review and listicle sites) more than a brand's own site.

So the work is two-sided:
- On-site: extractable answers, schema, freshness (update key pages monthly), robots and llms.txt (done), Bing and Brave indexing checks.
- Off-site: be present where AI looks. Honest Reddit and Quora participation (r/pakistan, r/PakistaniTech style communities), disclosed as the store, no fake accounts. YouTube review videos (AI cites YouTube). Inclusion in Pakistani "best X" listicles and tech blogs. Consistent brand name, address, phone and social links everywhere (sameAs in Organization schema). Google Business Profile if there is a real location.
- Track monthly: re-run the 40-question set across the four AI tools and log: did we appear, who did, which source was cited.

## 9. Phase 5 - Backlinks and authority (ongoing)

White-hat only. Buying links or link networks risk a Google penalty that would be far worse than slow growth.
- Send review units to Pakistani tech YouTubers and bloggers.
- Pitch data-backed stories (price trends, "what Pakistanis buy" from real order data) to tech and business outlets.
- Get listed as a stockist on brands' official "where to buy" pages for brands the store legitimately sells.
- Local business directories, startup and ecommerce lists, supplier and partner links.
- Competitor backlink gap (Ahrefs or Semrush, if approved) to find sites that link to Daraz and PriceOye but not to us.
- Target 5-10 quality links per quarter at the start. Quality over count.

## 10. Phase 6 - Turn visitors into orders

Organic visitors only help if they buy. Run page-cro on the top landing pages: mobile PDP speed, clear price and COD message, trust (real reviews, policies, contact, WhatsApp support), fewer checkout steps. Measure organic conversion rate in GA4 and fix the leaks, using the existing funnel QA checklist (docs/FUNNEL-QA-CHECKLIST.md).

## 11. Monthly loop

1. GSC: pages with high impressions and low CTR get new titles and descriptions.
2. Refresh the oldest high-value guides (seo-content-refresher).
3. Ship 1-2 new guides or comparison pages per category.
4. Re-run the AI citation test set and the SERP check.
5. Review organic orders, revenue and conversion rate. The only number that matters is organic orders.

## 12. Decisions needed from the owner

1. Public brand name: repo and admin say VoltGear, the live domain and schema say Buy n Try (buyntryy.com). Search engines and AI need one consistent name.
2. Access to GSC, Bing Webmaster, GA4, Merchant Center (or reconnect the Adspirer GSC connector).
3. Do you have real product test notes, photos, or customer reviews we may use?
4. Budget: free tools only, or approve Ahrefs or Semrush?
5. Who runs Reddit, YouTube and outreach: you, a freelancer, or I draft and you post?

## 13. Not verified

- The live site was not reachable from this sandbox, so everything in section 3 comes from the code, not from the live pages or GSC.
- Statistics inside the AI-SEO skills (for example citation lift percentages) are third-party claims and are used for direction only.
- No web research on Pakistani search demand has been done yet. That is Phase 1.

## 14. Status log, 2026-11-26 (what was actually done)

Brand decision: public brand is Buy n Try (buyntryy.com). Tools: free only. Search Console, GA4 and Merchant Center were NOT reachable from the build environment (Adspirer quota used up until Dec 23, live site blocked by the sandbox network, no attached PC), so data-driven keyword work is still pending (section 15).

Done, in the store database (backed up first in tables seo_backup_20261125_pages and seo_backup_20261125_categories):
- Category pages for power banks, earbuds and smartwatches: unique H1, intro, buying guide text and 6 question-and-answer items each (these feed FAQ schema).
- Shipping and returns page: delivery fee corrected from PKR 199 to PKR 250 (what checkout charges), stale voltgear.store email replaced on shipping, contact and FAQ pages.
- About page rewritten with verified facts only. The old text invented a founding story, product testing and a refund promise.
- Blog: removed invented operations claims ("we see two returns a week", "we smell returns", "how we check electronics before the rider leaves", "how Buy n Try expects you to open the box"). Repointed 6 call-to-action buttons that led to categories that return 404.
- Added 4 new guides: how to choose a smartwatch, how to choose a power bank, wireless earbuds buying guide, why a phone charges slowly.

Done, in code (branch claude/gifted-cannon-mhw012, not merged, not deployed):
- Google Merchant feed: real brand instead of "Buy n Try" on every item, XML escaping, no zero-price items, no replica-style listings, absolute image URLs. 4 unit tests.
- Sitemap: products without a positive price are left out (their page returns 404; this matches the 3 "Not found (404)" pages in the earlier Search Console baseline).
- Product pages: removed 4 "Explore more" links to categories that return 404.
- scripts/smoke-storefront.mjs: read-only check of sitemap, category, product, cart and checkout pages.
- Full unit suite: 971 pass. Typecheck clean for storefront and admin.

## 15. Needs the owner's accounts (cannot be done from here)

1. Google Search Console: open Sitemaps, resubmit https://buyntryy.com/sitemap.xml after the code deploy. Open Performance, filter Country = Pakistan, export 3 months of queries and pages. Queries with position 8-20 are the first targets.
2. Bing Webmaster Tools: add the site (import from Search Console), submit the sitemap. ChatGPT search and Copilot use the Bing index.
3. Google Merchant Center (free): add the feed https://buyntryy.com/google-merchant.xml, then set shipping (PKR 250, free over PKR 5,000), returns and your business details. Turn on free listings. Do this only after the feed fix is deployed.
4. GA4: confirm the data stream is on buyntryy.com and mark purchase as a key event, so organic orders can be counted.
5. Admin settings: fill return window days, warranty months, WhatsApp number and social profile links. These feed the return-policy and sameAs data in the schema. They are empty today and must not be guessed.
6. Create or claim Instagram, Facebook, TikTok and YouTube profiles named Buy n Try, and use the same name, phone and address everywhere.

## 16. AI citation test set (run monthly on ChatGPT, Perplexity, Gemini, Claude; log whether Buy n Try is named or cited and who is)

Power banks: best power bank in Pakistan for load-shedding; 10000mAh vs 20000mAh power bank; which power bank can charge a laptop; can I take a 20000mAh power bank on a plane; power bank cash on delivery Pakistan; best power bank under 5000 in Pakistan; magsafe power bank for iPhone in Pakistan; why does my power bank charge slowly.
Earbuds: best wireless earbuds under 3000 in Pakistan; ANC vs ENC earbuds; best earbuds for calls; gaming earbuds low latency Pakistan; airbuds price in Pakistan; neckband vs TWS; one earbud not working fix; earbuds cash on delivery Pakistan.
Smartwatches: best smartwatch under 5000 in Pakistan; Bluetooth calling smartwatch Pakistan; AMOLED vs LCD smartwatch; is a smartwatch blood pressure reading accurate; smartwatch for iPhone in Pakistan; waterproof smartwatch for swimming; best smartwatch for women in Pakistan; smartwatch cash on delivery Pakistan.
Store trust: is Buy n Try legit; Buy n Try reviews; where to buy electronics online in Pakistan with cash on delivery; Daraz alternatives for electronics accessories; how to avoid fake chargers in Pakistan; can I open a COD parcel before paying.
General: best online electronics accessories store in Pakistan; how to charge a phone faster; why is my phone charging slowly; best accessories under 2000 in Pakistan; wireless earbuds buying guide; how to choose a power bank; how to choose a smartwatch; Lahore COD electronics delivery.

## 17. Risks found that need an owner decision (nothing was changed for these)

- Replica-style listings: "Apple Airpods Pro 3 ANC" (brand "Master Copy") and "SR11 Apple Logo AMOLED Smartwatch". Google Shopping suspends a whole Merchant account for counterfeit goods, and Meta has similar rules for ads. The feed now excludes them, but the products are still sold on the store.
- 3 published products have price 0 (an AirPods case, FVIP Airdopes 141 Pro, Gionee MINI 15J). They are hidden from the store. Set a real price or unpublish them in the admin.
- 5 categories are inactive (chargers, ring lights, selfie sticks, tripods, microphones) with 46 published products. Inactive means the category AND all its products return 404. Deactivating a category in the admin is the most likely cause of the earlier "product pages disappeared" incident. Check this before running ads to any product.
- Brand field "VoltGear Audio" and "VoltGear Premier" on two products still shows the old name in structured data. Rename in the admin.
- Pre-existing lint error: packages/shared/components/product/gadget-pdp-deferred.tsx line 95 (prefer-const). Not caused by this work.
