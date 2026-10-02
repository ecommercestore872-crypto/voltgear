# Demo images (offline-ready)

Bundled JPGs for the Store V2 **HTML preview**. Open `preview/index.html` without relying on Unsplash CDN.

## Folders

| Folder | Use |
|--------|-----|
| `products/` | PLP, PDP, cart, featured, loadout cards |
| `hero/` | Homepage hero slider (`hero-1.jpg` … `hero-4.jpg`) |
| `collections/` | Collections bento + mobile rail |
| `blog/` | Journal placeholder |

## Replace with your brand

1. Keep filenames **or** update paths in `demo-images.js`.
2. Optional WebP heroes: add `assets/hero/slide-1.webp` … `slide-4.webp` (used by `<picture>` when present).
3. Recommended product shots: **800×800** PNG/JPG on white or soft grey, `object-fit: contain` in CSS.

## Re-download stock (optional)

Some files were fetched from Unsplash during setup. Swap them for Buy n Try packshots before production.
