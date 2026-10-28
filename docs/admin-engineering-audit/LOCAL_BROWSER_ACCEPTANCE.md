# Remaining browser media acceptance

Prepared 2026-10-26. These are pending manual/permission-dependent checks, not
passing evidence. Do not use production accounts, customer data or ordinary
Vercel previews connected to production Supabase.

## Environment and permissions

1. Resume the owned acceptance stack with `scripts/local-staging/resume.mjs`.
   `loadLocalRuntime()` must verify all64 migrations, hashes, service ownership,
   Auth/Storage health and loopback bindings. Never reset/delete existing volumes.
2. Start `node scripts/local-staging/browser-session.mjs --https-media` only on free
   ports3300/3301/55421. This creates a random `@example.invalid` account and private
   ignored login-input file. Do not publish or paste its password/cookie.
3. Admin is `http://127.0.0.1:3301`; shop is `http://127.0.0.1:3300`; media is
   `https://127.0.0.1:55421`. The generated certificate is explicitly trusted only
   by child Node test processes. **Chrome/Windows trust is not established.**
4. Before claiming successful browser images, obtain an approved trusted browser
   origin/certificate procedure. Alternatively propose a separately approved
   isolated hosted environment with its exact project, configuration and cost.
   Never disable certificate validation or click through a certificate warning as
   acceptance. No trust-store or hosted setting change is authorized here.
5. Permit the exact synthetic fixture paths in the browser tool, or manually use
   the native picker from the local test browser. Do not copy fixtures into guessed
   permission roots or bypass a denied `upload_file` operation.

Synthetic fixtures produced by `media-https-acceptance.mjs`:

- `tmp/isolated-staging/synthetic-https-0.png`
- `tmp/isolated-staging/synthetic-https-1.png`

Both are32×32 PNGs generated locally with distinct colors. The older
`synthetic-fixture.png` is also synthetic, SHA256
`24B5B1181FF1F06CD4AC0CB5E090CACAB95D67F70C12262AB50CF34AA6C7C42E`.

## Actual acceptance sequence

1. Sign in through the UI. Create a product whose name/slug clearly starts with
   `browser-isolated-`; use a real local category, price1999, cost300 and quantity5.
2. Use the real native file picker to select the two PNGs. Verify two successful
   upload responses, HTTPS URLs, visible decoded previews and no certificate,
   network, hydration or console errors. Record selected file names and statuses,
   never credentials or complete sensitive request headers.
3. Reorder the images, save the draft, navigate away, reopen and hard-reload.
   Confirm the exact image order, price, cost and quantity persist.
4. Publish, then open the local storefront PDP. Confirm both images actually decode
   (`naturalWidth > 0`), first-image selection/order is correct, and no overflow at
   390px mobile or1440px desktop. A URL in HTML or HTTP200 alone is insufficient.
5. Open two editor tabs from the same revision. Save a change in one and attempt a
   different change in the stale tab. Expect409/conflict feedback, no silent loss,
   then reload/reapply deliberately. Use Browser Back and reopen to check persisted
   values rather than an old browser-cache form snapshot.
6. Try a corrupt PNG and a file exceeding4MB. Expect400 and413 respectively with no
   new Storage object or successful preview. Try a controlled interrupted upload;
   an uncertain outcome must not auto-retry/create a second provider copy. Check
   the local Storage result before a deliberate retry.
7. Share an uploaded image with another synthetic draft, remove it from the first
   product and save/publish. Confirm the other reference and original bytes remain;
   permanent media DELETE must return409.
8. Logout, press Browser Back, then reload/access a protected page. Expect fresh
   login, with copied-cookie protected API access denied401. A stale already drawn
   page is not evidence of continuing authorization; test a new request.

## Record and cleanup

Record exact source/build identifiers, browser/version, viewport, fixture hashes,
HTTP statuses, persisted product IDs/order and console results. Distinguish real
Safari testing from Chrome mobile emulation. Mark blocked steps explicitly.
Stop only the owned browser-session process; it stops its apps/TLS proxy and removes
its temporary login-input file. Use `stop.mjs` for the exact eight acceptance
containers; retain every volume and synthetic fixture. Never delete shared media
or alter production settings to clean up local tests.
