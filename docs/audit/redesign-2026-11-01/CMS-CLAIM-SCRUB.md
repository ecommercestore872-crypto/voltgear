# CMS / copy claim scrub (P0)

Unsupported marketing claims must not ship in paid-traffic surfaces.

## Remove or rewrite in Admin CMS / site settings

| Pattern | Action |
| --- | --- |
| “1,000+ Happy Customers” / unverifiable counts | Remove or replace with a verifiable ops fact |
| “100% genuine” / “authentic” without sourcing | Remove |
| Guaranteed delivery windows (“24h everywhere”) | Replace with courier-realistic language |
| “Official / authorized / certified” without proof | Remove unless substantiated on legal/warranty pages |
| Fake testimonials / stock portrait reviews | Remove |

## Code-side scrub completed on this branch

- Trust bar: “Premium Quality” → “Inspect at the door”
- Catalog trust: “Fast Delivery” → “Courier delivery / Major cities nationwide”
- Checkout sidebar: “100% safe & secure” → “Encrypted connection”

## Admin checklist before merge

1. Open Admin → Site settings / homepage modules / product markdown.
2. Search for: Happy, genuine, official, 100%, guaranteed, certified, thousands.
3. Edit or unpublish offending blocks; do not leave placeholders that imply social proof.
4. Re-check Vercel Preview homepage + PDP after publish.
