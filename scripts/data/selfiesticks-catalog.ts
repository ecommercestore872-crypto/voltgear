/**
 * Selfie Sticks catalog — researched product copy.
 * Keep K5 / K5 LED / K6 / K7 / R1S-L / JC-18H specs separate.
 * Slugs stay stable for existing URLs.
 */

export type SelfieStickSeed = {
  name: string;
  slug: string;
  brand: string;
  sku: string;
  category: "selfie-stick";
  price: number;
  compareAtPrice: number;
  rating: number;
  reviewCount: number;
  featured: boolean;
  badge: string;
  stockStatus: "in-stock" | "low-stock" | "out-of-stock";
  shortDescription: string;
  details: string;
  features: string[];
  specifications: { label: string; value: string }[];
  compatibility: string[];
  inTheBox: string[];
  image: string;
  productVideoUrl?: string;
};

export const SELFIESTICKS_KEEP_SLUGS = [
  "plokama-live-k5-selfie-stick",
  "plokama-live-k5-led-selfie-stick",
  "plokama-live-k6-selfie-stick",
  "plokama-live-k7-gimbal-selfie-stick",
  "r1s-large-selfie-stick-tripod",
  "jc-18-h-heavy-duty-selfie-stick",
] as const;

export const SELFIESTICKS_DATA: SelfieStickSeed[] = [
  {
    name: "Plokama LIVE-K5 70cm Selfie Stick Tripod – Bluetooth Remote",
    slug: "plokama-live-k5-selfie-stick",
    brand: "Plokama",
    sku: "VG-SS-PLK5",
    category: "selfie-stick",
    price: 1499,
    compareAtPrice: 2199,
    rating: 4.7,
    reviewCount: 32,
    featured: false,
    badge: "70CM + Remote Tripod",
    stockStatus: "in-stock",
    shortDescription:
      "Selfie stick when you're moving, tripod when you need both hands. Plokama LIVE-K5 extends up to 70cm with 360° rotation, 270° tilt and a detachable Bluetooth remote.",
    details: `# Stop Asking Someone Else to Take the Photo

The **Plokama LIVE-K5** gives you a selfie stick, phone stand and compact tripod in one foldable accessory.

Use it handheld for selfies and travel shots, then open the base when you want to record yourself, take a group photo or join a video call without holding your phone.

> **The highlight:** Extend it, stand it up and control your camera remotely.

# Get More People Into the Shot

The telescopic pole extends from approximately **16cm to 70cm**, giving you more distance between the phone and your face.

That extra reach is useful for:

- **Group selfies**
- **Travel photos**
- **Fuller-background shots**
- **Vlogging**
- **TikTok & Reels**
- **Video calls**

Instead of filling the whole frame with your face, step back and actually show where you are.

# Shoot Without Touching the Phone

The detachable **Bluetooth shutter remote** lets you trigger compatible smartphone cameras wirelessly.

Set the LIVE-K5 down as a tripod, move into position and take the shot yourself.

No timer rush. No asking strangers. No reaching back toward the phone.

# Portrait or Landscape — Your Choice

The phone holder supports **360° rotation with up to 270° tilt**, giving you much more control over the framing.

Shoot vertical for TikTok and Instagram.

Rotate horizontal for YouTube, group pictures or video calls.

# Small Enough to Take Anywhere

The LIVE-K5 folds into a compact handheld body and weighs roughly **110–130g depending on the documented batch**, making it easy to keep in a handbag, backpack or travel kit.

> **70CM Reach • Tripod Mode • Bluetooth Remote • 360° Rotation**

# One Small Accessory. A Lot More Freedom.

The real advantage of the LIVE-K5 isn't simply taking selfies.

It's being able to **position your phone, step away from it and capture the moment yourself**.

**Set it. Frame it. Step back. Shoot.**`,
    features: [
      "Transforms from handheld selfie stick into a tripod for hands-free photos and videos",
      "Extends up to 70cm so you can fit more people and background into the frame",
      "Bluetooth remote lets you take pictures without touching the phone",
      "360° phone rotation makes switching between portrait and landscape easy",
      "270° tilt gives you more freedom to frame high and low angles",
      "Compact foldable design fits easily into a travel or everyday bag",
      "Works well for selfies, group shots, TikTok, video calls and vlogging",
    ],
    specifications: [
      { label: "Brand", value: "Plokama" },
      { label: "Model", value: "LIVE-K5" },
      { label: "Type", value: "Selfie Stick + Tripod" },
      { label: "Minimum Length", value: "Approx. 160mm" },
      { label: "Maximum Length", value: "Approx. 700mm / 70cm" },
      { label: "Phone Rotation", value: "360°" },
      { label: "Tilt", value: "Up to 270°" },
      { label: "Remote", value: "Detachable Bluetooth Shutter" },
      { label: "Remote Range", value: "Up to approx. 10m" },
      { label: "Material", value: "ABS + Stainless Steel" },
      { label: "Color", value: "Black" },
      { label: "Compatibility", value: "Most iOS & Android Smartphones" },
    ],
    compatibility: [
      "iPhones",
      "Android Smartphones",
      "TikTok",
      "Instagram Reels",
      "YouTube",
      "Video Calls",
      "Mobile Photography",
    ],
    inTheBox: ["Plokama LIVE-K5 Selfie Stick", "Bluetooth Remote"],
    image: "/gadget/products/selfiestick-plokama-k5.webp",
  },
  {
    name: "Plokama LIVE-K5 LED Selfie Stick Tripod – 3-Tone Fill Light",
    slug: "plokama-live-k5-led-selfie-stick",
    brand: "Plokama",
    sku: "VG-SS-PLK5LED",
    category: "selfie-stick",
    price: 1899,
    compareAtPrice: 2599,
    rating: 4.8,
    reviewCount: 29,
    featured: true,
    badge: "Tripod + Built-In Light",
    stockStatus: "in-stock",
    shortDescription:
      "Bad lighting doesn't have to ruin the shot. Plokama LIVE-K5 LED combines a 70cm selfie stick, tripod, Bluetooth remote and built-in 3-tone fill light in one compact creator tool.",
    details: `# A Selfie Stick That Brings Its Own Light

You can have the perfect angle and still get a bad photo if the lighting is poor.

The **Plokama LIVE-K5 LED** solves both problems at once.

It combines an extendable selfie stick, tripod stand, Bluetooth shutter remote and **built-in LED fill light** in one compact setup.

> **The highlight:** Your phone stand and your face light travel together.

# Warm. Neutral. Cool.

The integrated LED supports **three lighting tones**:

- **Warm**
- **Neutral**
- **Cool**

Use warm light for a softer look.

Neutral for everyday content.

Cool when you need a brighter, cleaner appearance.

That makes the K5 LED much more useful for night selfies, indoor videos, makeup, calls and travel content.

# Step Back and Control the Shot

Extend the pole up to approximately **70cm**, open the tripod and use the detachable **Bluetooth remote** to trigger your compatible phone camera.

That means you can record:

- **Solo videos**
- **Full-body content**
- **Group photos**
- **TikToks**
- **Instagram Reels**
- **Video calls**

without standing directly beside the phone.

# Rotate Until the Frame Looks Right

The holder supports **360° rotation and roughly 270° tilt**, giving you freedom to shoot both vertical and horizontal content.

> **3 Light Tones • 70CM • Tripod • Bluetooth Remote**

# Less Gear to Carry

Normally you'd need a selfie stick, tripod and separate mini light.

With the LIVE-K5 LED, they're already combined.

**Open it. Light it. Frame it. Shoot.**`,
    features: [
      "Built-in LED fill light improves your face and videos in dim rooms or at night",
      "Three light tones let you choose warm, neutral or cool illumination",
      "70cm extension gives you more room for full-body and group shots",
      "Tripod mode makes solo recording and livestreaming hands-free",
      "Bluetooth remote lets you shoot from a distance",
      "360° rotation makes vertical and horizontal recording easy",
      "Compact 3-in-1 design replaces several separate creator accessories",
    ],
    specifications: [
      { label: "Brand", value: "Plokama" },
      { label: "Model", value: "LIVE-K5 LED" },
      { label: "Maximum Length", value: "Approx. 700mm" },
      { label: "Minimum Length", value: "Approx. 160mm" },
      { label: "Lighting", value: "Built-In LED" },
      { label: "Light Tones", value: "Warm / Neutral / Cool" },
      { label: "Rotation", value: "360°" },
      { label: "Tilt", value: "Approx. 270°" },
      { label: "Remote", value: "Bluetooth Shutter" },
      { label: "Material", value: "ABS + Metal" },
      { label: "Use Modes", value: "Selfie Stick / Tripod / Phone Stand" },
    ],
    compatibility: [
      "iPhones",
      "Android Smartphones",
      "TikTok & Reels",
      "Night / indoor selfies",
      "Video calls",
      "Travel content",
    ],
    inTheBox: [
      "Plokama LIVE-K5 LED Selfie Stick",
      "Bluetooth Remote",
      "Integrated LED Light",
    ],
    image: "/gadget/products/selfiestick-plokama-k5-led.webp",
  },
  {
    name: "Plokama LIVE-K6 1M Selfie Stick Tripod – Bluetooth Remote",
    slug: "plokama-live-k6-selfie-stick",
    brand: "Plokama",
    sku: "VG-SS-PLK6",
    category: "selfie-stick",
    price: 2199,
    compareAtPrice: 2999,
    rating: 4.8,
    reviewCount: 41,
    featured: true,
    badge: "1-Meter Creator Reach",
    stockStatus: "in-stock",
    shortDescription:
      "Need more distance than a mini selfie stick? Plokama LIVE-K6 extends from just 18.5cm to a full 1 meter with tripod mode, 360° rotation and wireless remote control.",
    details: `# More Distance Changes the Shot

A short selfie stick is fine when all you want is your face.

The **Plokama LIVE-K6** extends all the way to **100cm**, giving you much more freedom for full-body videos, group photos, travel shots and creator content.

> **The highlight:** A full 1 meter of reach from a compact foldable stick.

# Finally Fit Your Whole Outfit in the Frame

Open the built-in tripod, extend the pole and step back.

Instead of holding your phone at arm's length, you can create:

- **Full-body TikToks**
- **Fashion videos**
- **Dance content**
- **Group pictures**
- **Travel shots**
- **Product videos**
- **Livestreams**

That extra height makes the K6 feel more like a mini phone tripod than a basic selfie stick.

# Take the Shot from Across the Room

The detachable **Bluetooth remote** lets you trigger compatible camera apps without standing beside your phone.

Set the frame once, move into position and shoot.

Some exact listings document approximately **10m remote range**.

# Vertical, Horizontal or Angled

The K6 supports **360° rotation and around 270° tilt**, so you're not stuck with one viewing position.

Film vertical for social media.

Rotate horizontal for YouTube and calls.

Tilt down for desk content or products.

# Fold It When You're Done

Despite reaching 1 meter, the K6 collapses to approximately **18.5cm** and exact packaging lists it at around **138g**, making it convenient for travel.

> **1M Reach • Tripod • Remote • 360° Rotation**

**Small in the bag. Much bigger when you need the shot.**`,
    features: [
      "Extends to 1 meter for full-body videos and wider group shots",
      "Tripod mode gives you hands-free recording without a separate stand",
      "Bluetooth remote lets you shoot while standing away from the phone",
      "360° rotation supports both vertical and horizontal content",
      "270° tilt helps with low, high and desk-level angles",
      "Folds down to a compact travel-friendly size",
      "Useful for TikTok, Reels, vlogging, meetings and product filming",
    ],
    specifications: [
      { label: "Brand", value: "Plokama" },
      { label: "Model", value: "LIVE-K6" },
      { label: "Minimum Length", value: "Approx. 18.5cm" },
      { label: "Maximum Length", value: "100cm" },
      { label: "Rotation", value: "360°" },
      { label: "Tilt", value: "270°" },
      { label: "Remote", value: "Detachable Bluetooth" },
      { label: "Remote Range", value: "Up to approx. 10m" },
      { label: "Material", value: "ABS + Stainless Steel" },
      { label: "Weight", value: "Approx. 138g" },
      { label: "Modes", value: "Selfie Stick / Tripod / Desktop Holder" },
    ],
    compatibility: [
      "iPhones",
      "Android Smartphones",
      "TikTok & Reels",
      "Full-body / fashion videos",
      "Travel & group photos",
      "Livestreams",
    ],
    inTheBox: [
      "Plokama LIVE-K6 Selfie Stick",
      "Bluetooth Remote",
      "Integrated Tripod Base",
    ],
    image: "/gadget/products/selfiestick-plokama-k6.webp",
  },
  {
    name: "Plokama LIVE-K7 110cm Selfie Stick Tripod – Live Streaming Stand",
    slug: "plokama-live-k7-gimbal-selfie-stick",
    brand: "Plokama",
    sku: "VG-SS-PLK7",
    category: "selfie-stick",
    price: 2999,
    compareAtPrice: 3999,
    rating: 4.9,
    reviewCount: 38,
    featured: true,
    badge: "110CM Live Streaming Stand",
    stockStatus: "in-stock",
    shortDescription:
      "Set your phone farther away and frame more of the scene. Plokama LIVE-K7 extends up to 110cm with tripod mode, 360° rotation and wireless remote control for TikTok, Reels and livestreaming.",
    details: `# More Than a Selfie Stick

The **Plokama LIVE-K7** is better thought of as a compact **live-streaming stand that can also become a selfie stick**.

It reaches approximately **110cm**, giving creators enough distance for wider framing, standing videos and hands-free recording.

> **The highlight:** 110cm reach in a foldable tripod you can still carry around.

# Put the Phone Down and Step Into the Content

Open the tripod legs, extend the pole and place yourself where the camera actually needs you.

The K7 is especially useful for:

- **TikTok Lives**
- **Instagram Reels**
- **YouTube**
- **Full-body videos**
- **Fitness content**
- **Makeup tutorials**
- **Video meetings**
- **Group photos**

You don't have to keep the phone in your hand just because you're filming alone.

# Remote Shooting from a Distance

The included **wireless Bluetooth remote** lets you take compatible photos and videos from around **10 meters away**.

That's especially useful for group photos or full-body shots where reaching the phone would ruin the framing.

# Portrait to Landscape in Seconds

The adjustable holder supports **360° positioning**, making it easy to switch between vertical and horizontal shooting.

# Stable When You Need It. Handheld When You Don't.

Close the legs and use it as a regular extendable selfie stick.

Open them again and it becomes a freestanding phone support.

> **110CM • Tripod • Wireless Remote • 360° Rotation**

**Hold it when you're moving. Stand it when you're creating.**`,
    features: [
      "Extends up to roughly 110cm for full-body and wider creator shots",
      "Built-in tripod lets you film yourself without another person holding the phone",
      "Bluetooth remote gives you hands-free control from up to around 10m",
      "360° rotation makes portrait and landscape switching easy",
      "Foldable construction makes a large stand practical to carry",
      "Ideal for live streaming, TikTok, Reels, YouTube and group photos",
      "Stainless-steel + ABS construction keeps the design lightweight",
    ],
    specifications: [
      { label: "Brand", value: "Plokama" },
      { label: "Model", value: "LIVE-K7" },
      { label: "Maximum Height", value: "Approx. 105–110cm" },
      { label: "Folded Length", value: "Approx. 19cm" },
      { label: "Rotation", value: "360°" },
      { label: "Remote Range", value: "Approx. 10m" },
      { label: "Material", value: "Stainless Steel + ABS" },
      { label: "Weight", value: "Approx. 171g on Pakistan listing" },
      { label: "Sections", value: "8 Adjustable Sections" },
      { label: "Remote Battery", value: "CR2032" },
      { label: "Compatibility", value: "Android & iOS Smartphones" },
    ],
    compatibility: [
      "TikTok Lives",
      "Instagram Reels",
      "YouTube",
      "Fitness & makeup content",
      "Video meetings",
      "Group photos",
    ],
    inTheBox: [
      "Plokama LIVE-K7 Selfie Stick Tripod",
      "Wireless Remote",
      "User Manual",
    ],
    image: "/gadget/products/selfiestick-plokama-k7.webp",
  },
  {
    name: "R1S-L 1.7M Large Selfie Stick Tripod – LED + Bluetooth Remote",
    slug: "r1s-large-selfie-stick-tripod",
    brand: "R1 Series",
    sku: "VG-SS-R1SL",
    category: "selfie-stick",
    price: 1699,
    compareAtPrice: 2399,
    rating: 4.7,
    reviewCount: 46,
    featured: true,
    badge: "1.7M Full-Height Tripod",
    stockStatus: "in-stock",
    shortDescription:
      "A selfie stick that grows almost as tall as you. R1S-L extends to 1.7 meters with tripod mode, built-in LED fill light, 360° phone rotation and Bluetooth remote control.",
    details: `# This One Actually Gets Tall Enough for Full-Body Content

Most selfie sticks stop around your chest.

The **R1S-L Large** extends all the way to approximately **170cm / 5.5–5.8 feet**, turning a compact handheld accessory into a proper full-height phone tripod.

> **The highlight:** 1.7 meters of reach from something that folds down to around 24cm.

# Record Your Whole Outfit — Without a Cameraman

Set the tripod on the floor and extend it to eye level.

Now your phone can capture:

- **Full-body TikToks**
- **Fashion & outfit videos**
- **Dance content**
- **Workout videos**
- **Group photos**
- **Travel shots**
- **YouTube content**
- **Livestreams**

without balancing the phone on furniture or asking someone else to film.

# Built-In Light When the Room Isn't Helping

The large R1S-L variant is sold with an integrated **LED fill light**, with exact Pakistan documentation listing **3 brightness levels**.

That means you can give your face a little extra light during night videos, calls or indoor content without carrying a separate mini light.

# Press the Remote and Stay in Position

The detachable Bluetooth shutter supports wireless camera control from up to approximately **10 meters**.

Frame the shot once.

Step into position.

Press.

# Portrait or Landscape

The holder supports **360° rotation**, so the same stand works for vertical social content and horizontal videos.

# Tall When You Need It. Small When You Don't.

Despite extending to 1.7m, the R1S-L folds to around **24cm**.

That's what makes the product interesting: it's close to a full phone tripod when open, but still designed to travel like a selfie stick.

> **1.7M • LED LIGHT • TRIPOD • BLUETOOTH REMOTE**

**From pocket-size to almost human-height.**`,
    features: [
      "Massive 1.7m extension lets you shoot proper full-body content at standing height",
      "Tripod base replaces the need for a separate full-size phone stand",
      "Built-in LED light helps improve videos in darker rooms",
      "Three brightness levels let you adjust the light instead of using one fixed intensity",
      "Bluetooth remote lets you capture photos from around 10m away",
      "360° phone rotation supports both TikTok portrait and YouTube landscape",
      "Folds to around 24cm despite extending to approximately 170cm",
      "Works with most iPhone and Android phones",
    ],
    specifications: [
      { label: "Model", value: "R1S-L / R1S Large" },
      { label: "Type", value: "4-in-1 Selfie Stick / Tripod" },
      { label: "Maximum Height", value: "Approx. 170cm / 1.7m" },
      { label: "Folded Height", value: "Approx. 24cm" },
      { label: "Material", value: "Aluminum Alloy / Stainless Steel Construction" },
      { label: "LED Fill Light", value: "Yes" },
      { label: "Brightness Levels", value: "3" },
      { label: "Phone Rotation", value: "360°" },
      { label: "Wireless Remote", value: "Bluetooth" },
      { label: "Remote Range", value: "Up to approx. 10m" },
      { label: "Connectivity", value: "Bluetooth 5.0 on current Pakistan listing" },
      { label: "Phone Width Support", value: "Up to approx. 100mm on documented variant" },
    ],
    compatibility: [
      "iPhones",
      "Android Smartphones",
      "TikTok",
      "Instagram Reels",
      "YouTube",
      "Livestreaming",
      "Fitness Recording",
      "Outfit / Fashion Videos",
      "Group Photography",
    ],
    inTheBox: [
      "R1S-L Large Selfie Stick Tripod",
      "Bluetooth Remote",
      "Integrated LED Light",
    ],
    image: "/gadget/products/selfiestick-r1s-large.webp",
    productVideoUrl: "https://www.youtube.com/shorts/jzLTq3ODJdQ",
  },
  {
    name: "JC-18H 1.7M Dual LED Selfie Stick Tripod – Bluetooth Remote",
    slug: "jc-18-h-heavy-duty-selfie-stick",
    brand: "JC Tech",
    sku: "VG-SS-JC18H",
    category: "selfie-stick",
    price: 2499,
    compareAtPrice: 3499,
    rating: 4.8,
    reviewCount: 33,
    featured: true,
    badge: "Dual Lights + 1.7M Tripod",
    stockStatus: "in-stock",
    shortDescription:
      "Two lights around your phone and a stand that reaches 1.7 meters. JC-18H combines dual LED fill lights, full-height tripod mode, Bluetooth remote and 360° phone positioning for serious mobile content.",
    details: `# Two Lights Are Better Than One When Your Face Is the Subject

Most selfie sticks only hold the phone.

The **JC-18H** surrounds it with **two adjustable LED mirror lights**, giving you illumination from both sides of the camera instead of relying completely on the room.

> **The highlight:** Dual LED lights + a 1.7-meter tripod in one foldable setup.

# Light Both Sides of Your Face

With a light on each side of the phone, the JC-18H can create more balanced illumination than a tiny single lamp.

That makes it especially useful for:

- **Makeup videos**
- **Beauty content**
- **TikTok**
- **Reels**
- **Livestreaming**
- **Video calls**
- **Product demonstrations**

Matching listings document **adjustable brightness**, while exact JC-18H imagery shows the lights positioned independently around the phone.

# Extend It Up to Full Shooting Height

The telescopic pole extends from approximately **28.5cm to 170cm**.

That gives you enough height for:

- Full-body videos
- Standing tutorials
- Group photographs
- Outfit content
- Fitness recording

Instead of placing your phone on a table, set the JC-18H on the floor and raise the camera closer to eye level.

# Control the Camera from Across the Room

The included **Bluetooth remote** pairs with compatible Android and iOS devices and is documented with wireless operation of around **10 meters**.

Set the tripod.

Step into the frame.

Take the photo yourself.

# Rotate for the Platform You're Using

The phone holder supports **360° rotation**, making the transition between vertical TikTok content and horizontal YouTube/video calls easy.

# Big Setup. Foldable Body.

Despite its 1.7m extension, the JC-18H collapses to roughly **28.5–29cm**, making it far easier to store and transport than a conventional full-size tripod.

> **DUAL LED LIGHTS • 1.7M HEIGHT • BLUETOOTH REMOTE • 360°**

**Your phone stand, selfie light and full-height tripod — together.**`,
    features: [
      "Dual LED lights illuminate your face from both sides of the phone",
      "1.7m maximum height handles full-body and standing videos",
      "Tripod mode turns it into a freestanding creator setup",
      "Bluetooth remote lets you shoot while standing away from the phone",
      "360° rotation switches easily between vertical and horizontal content",
      "Adjustable lighting makes it useful for makeup, TikTok and livestreaming",
      "Folds down to roughly 29cm despite extending to near full human height",
      "Works with compatible Android and iOS smartphones",
    ],
    specifications: [
      { label: "Model", value: "JC-18H" },
      { label: "Product Type", value: "Live Broadcast Selfie Stick Tripod" },
      { label: "Collapsed Length", value: "Approx. 28.5–29cm" },
      { label: "Maximum Height", value: "Approx. 170cm / 1.7m" },
      { label: "Lights", value: "Dual LED Mirror / Ring Lights" },
      { label: "Light Brightness", value: "Adjustable" },
      { label: "Phone Rotation", value: "360°" },
      { label: "Remote", value: "Bluetooth Shutter" },
      { label: "Wireless Version", value: "Bluetooth 4.2 on exact Pakistan documentation" },
      { label: "Remote Battery", value: "CR1632 Replaceable" },
      { label: "Voltage", value: "3V" },
      { label: "Remote Battery Capacity", value: "200mAh listed by CM Shop" },
      { label: "Material", value: "ABS + Stainless Steel" },
      { label: "Compatibility", value: "iOS & Android Smartphones" },
    ],
    compatibility: [
      "iPhones",
      "Android Smartphones",
      "TikTok",
      "Instagram Reels",
      "YouTube",
      "Livestreaming",
      "Makeup Tutorials",
      "Video Calls",
      "Mobile Photography",
    ],
    inTheBox: [
      "JC-18H Selfie Stick Tripod",
      "2 × LED Mirror Lights",
      "Bluetooth Remote",
    ],
    image: "/gadget/products/selfiestick-jc18h.webp",
  },
];
