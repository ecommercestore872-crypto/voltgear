# Handoff: inline product video

## Goal
Show the admin-uploaded MP4 as the 2nd slide of the PDP gallery (muted, autoplay only while visible, loop, playsinline, poster, preload none until near, tap-for-sound, visible controls, reduced-motion respected) without hurting mobile PageSpeed/LCP.

## Files
- packages/shared/lib/product-gallery-video.ts (+ .test.ts): picks the uploaded file video (ignores Instagram/TikTok links), adds Cloudinary `q_auto,w_720,c_limit` transform.
- packages/shared/components/product/product-gallery-video.tsx: new player slide.
- packages/shared/components/product/product-gallery.tsx: inserts video as slide 2 + thumbnail with play icon; no zoom/lightbox on video.
- packages/shared/components/product/product-info-sections.tsx: ProductVideoSection (unused) now uses the shared helper.
- packages/shared/components/admin/product-form.tsx: "Product video (MP4)" field via the existing MediaField/upload route.

## Decisions
- No migration: `products.product_video` is already jsonb holding {url, cloudinaryPublicId, poster}; PDP shell query already selects it. Nothing to apply to production.
- Video element only mounts when its slide is selected, so first image stays the LCP and the MP4 is never fetched on load.
- product-video-modal.tsx untouched (still handles Instagram/TikTok link demo button).
- Swiping is disabled over the video (it would fight the scrub bar); thumbnails switch slides.

## Next step
- Upload a real MP4 on a product in admin, Publish, check on a phone. Vercel limits request bodies to ~4.5 MB, so larger Reels need a pasted hosted MP4 link (or a direct-to-Cloudinary upload later).
- Check gadget-video-pip doesn't double-play the same file on PDP.
- Run PageSpeed on a live URL after deploy.
- `npm run test` needs Node 23+ (`--test-isolation`); ran with Node 22 by invoking tsx directly.
