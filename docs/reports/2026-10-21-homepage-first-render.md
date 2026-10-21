# Homepage first-render fix — preview verification

## Release status

Implemented on `codex/homepage-first-render`, draft PR #22. **Not merged or deployed to production.** Only the approved `voltgear` storefront preview was deployed. No database schema, order, checkout, production environment or unrelated project changes were made.

Preview: https://voltgear-rmxwqbpzq-hassaans-projects-e3451522.vercel.app

Application commit: `b6690acac1357922296d47260cb505f4e20bd75f`.

## Confirmed causes and changes

1. Production homepage HTML serialized its internal route as `/index`. The shared route classifier recognized `/` but not that exact alias. Server HTML used the legacy header; browser hydration used the intended theme. The classifier now treats exactly `/index` like `/`, with regression coverage excluding `/indexnow`, `/index/foo` and `/admin`. No dynamic root rendering or middleware workaround was added.
2. The hero had its own empty Suspense fallback. Hero data now resolves before the homepage returns; heavier lower sections can still stream separately. The route-loading state uses the existing cream/forest branding.
3. Hero-linked products previously loaded the entire PDP/review/gallery embed. The campaign query now requests identity, availability and quantity only. An observed two-product response dropped from 28,799 to 572 bytes. Single-request query timings were 345 ms and 299 ms respectively; these are samples, not a latency guarantee. Publication/demo filtering and quantity-based stock mapping remain intact.
4. Hero preloads now match the rendered responsive image's source, quality and sizes. A banner without separate mobile artwork uses one responsive preload; art-directed banners use mutually exclusive viewport media queries. Later slides remain lazy and normal priority.
5. Slow-device testing caught the footer entering the viewport before streamed content expanded. The loading state and homepage now reserve a viewport of height, keeping the footer below the fold without changing the finished design.

## Verification

- 772 unit tests passed, including route-alias and responsive-preload regressions.
- Both workspace lint and TypeScript checks passed.
- Both production builds passed. An initial local Windows `EPERM` build-output error was resolved by rerunning with the required filesystem permission.
- GitHub Monorepo CI run 58 passed at the application commit: https://github.com/ecommercestore872-crypto/voltgear/actions/runs/39631685844
- Existing storefront JavaScript/CSS performance budgets passed.
- Vercel preview is Ready. Authenticated HTML contains the correct header, actual campaign region and responsive preloads, without the old empty hero fallback.
- Browser checks at 1440px and 390px: intended theme, real published artwork, correct viewport image selection, no horizontal overflow, no observed console errors. Carousel controls, mobile menu opening/closing and homepage-to-catalog navigation worked.
- Admin publishing code still invalidates `/` and the shared merchandising tags, including `storefront-hero-slides`; the five-minute TTL is retained. No real promotions were changed to test publishing.
- Checkout/order/Sheets flows were not modified; no test order or customer-data mutation was performed.

## Lighthouse evidence and limitations

Performance-only Lighthouse 13.5.0; browser storage reset for each run. Baseline was the public production URL. Preview tests used a temporary GET/HEAD-only loopback bridge, authenticated to the exact preview origin using the existing short-lived development token. Protection was not disabled; credentials were not sent to asset providers. The final bridge preserved response compression and Next.js request headers.

| Measurement | Production baseline | Corrected preview |
| --- | ---: | ---: |
| Mobile performance | 48 | 63 |
| Mobile LCP | 5.29 s | 2.91 s |
| Mobile FCP | 1.23 s | 1.48 s |
| Mobile CLS | 0 | 0.00043 |
| Mobile total blocking time | 3.64 s | 3.15 s |
| Mobile document TTFB | 97 ms | 615 ms |
| Desktop performance | 68 | 69 |
| Desktop LCP | 1.07 s | 1.17 s |
| Desktop CLS | 0.1083 | 0.00174 |
| Desktop total blocking time | 667 ms | 645 ms |
| Desktop document TTFB | 98 ms | 591 ms |

These are diagnostic lab samples, **not a controlled production A/B comparison**: preview authentication/network path differs, and Lighthouse warned that this machine's CPU was slower than its expected calibration. Early uncompressed/protocol-incomplete bridge runs were discarded for performance claims; they did help identify the footer shift. Some runs failed with Lighthouse `NO_NAVSTART` and are not passing results.

The mobile result improves the observed LCP but is **not 90+ performance and not a verified ≤2.5-second p75 result**. Remaining main-thread blocking needs a separate focused profile if higher scores are required. No real-user p75 improvement can be established before an approved production release and sufficient field data. Normal browser testing is not physical iOS Safari certification.

Artifacts are saved under `C:/Users/aliab/.codex/visualizations/2026/10/13/01a13586-57cf-7a83-b63f-d42765986e5e/`: `home-flash-baseline-{mobile,desktop}.json`, `home-flash-preview-v2-{mobile,desktop}-final.json`, `home-preview-mobile.png` and `home-preview-desktop.png`. The temporary verification servers were stopped after testing.

## Acceptance / next gate

- Theme mismatch root cause fixed and protected-preview HTML verified.
- Empty hero fallback removed; branded pending state and footer reservation verified.
- Image selection, navigation and CI gates passed.
- Live publishing mutation, production cold-origin behavior and real-user p75 LCP remain unverified intentionally.
- Review the protected preview, then obtain explicit production approval. Keep PR draft until that decision.
- If approved: recheck current head CI, merge normally, inspect both approved deployments and perform read-only production smoke checks. Roll back to the previous production deployment if the theme, banners or navigation regress.

No claim is made that all performance targets are achieved or that the homepage fix is already live.
