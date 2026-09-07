/**
 * Tripods & stands catalog — researched Plokama copy.
 * Keep PK-998 / PK-8899 / VT-170 / PK-9950 / VT-200 / PK-9970 specs separate.
 * Brand voice: Buy n Try (never VoltGear).
 */

export type TripodSeed = {
  name: string;
  slug: string;
  brand: string;
  sku: string;
  category: "tripod";
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
};

export const TRIPODS_KEEP_SLUGS = [
  "plokama-pk-998-professional-tripod",
  "plokama-pk-8899-multipurpose-tripod",
  "vt-170-aluminum-video-tripod",
  "plokama-pk-9950-heavy-duty-tripod",
  "vt-200-professional-camera-tripod",
  "plokama-pk-9970-heavy-duty-tripod",
] as const;

export const TRIPODS_DATA: TripodSeed[] = [
  {
    name: "Plokama PK-998 2M All-in-One Tripod – Phone & Camera + Remote",
    slug: "plokama-pk-998-professional-tripod",
    brand: "Plokama",
    sku: "VG-TP-PK998",
    category: "tripod",
    price: 3499,
    compareAtPrice: 4799,
    rating: 4.8,
    reviewCount: 39,
    featured: true,
    badge: "2M All-in-One Creator Tripod",
    stockStatus: "in-stock",
    shortDescription:
      "One tripod for your phone, DSLR and creator setup. Plokama PK-998 reaches 2 meters with 360° positioning, universal 1/4″ mounting, phone holder, wireless remote and carry bag.",
    details: `# One Tripod. Almost Every Setup Covered.

Buying separate stands for your phone, camera and content setup gets expensive and messy.

The **Plokama PK-998** is designed as an all-in-one solution, giving you a tall **2-meter tripod** that can work with compatible smartphones, DSLR/mirrorless cameras, action cameras and other 1/4-inch accessories.

> **The highlight:** Phone + camera compatibility in a tripod that reaches up to 200cm.

# Get the Camera Up Where You Actually Need It

The PK-998 adjusts from around **55cm all the way to 200cm**, giving you much more freedom than short desktop tripods.

Use the lower settings for product photography or seated videos.

Raise it for:

- **Full-body TikToks**
- **Standing tutorials**
- **Portrait photography**
- **Group pictures**
- **Interviews**
- **Livestreams**
- **Studio setups**

No more stacking books or putting your camera on furniture just to reach eye level.

# Frame the Shot from Any Direction

The head supports **360° panoramic movement**, making it easier to position your camera or phone exactly where you want it.

Shoot horizontally for YouTube and landscape photography.

Switch to vertical creator content when you're filming for TikTok, Reels or Shorts.

# Take the Photo Without Touching the Phone

The bundled **wireless remote** makes solo shooting much easier.

Position the tripod, step into the frame and trigger a compatible smartphone camera without running back to the phone.

# Built to Travel Too

Despite reaching two meters, the PK-998 folds down to around **55cm** and comes with a **carrying bag**.

That makes it useful both as a permanent studio tripod and something you can take to outdoor shoots, university events or client work.

> **200CM • 360° HEAD • PHONE + CAMERA • REMOTE • CARRY BAG**

**Set the height. Frame the shot. Step back and create.**`,
    features: [
      "200cm maximum height gives you proper standing and full-body shooting angles",
      "Works with both compatible smartphones and cameras instead of locking you to one device",
      "Standard 1/4″ mount supports a wide range of photography accessories",
      "360° panoramic head gives you more freedom to position the shot",
      "Wireless remote makes solo photography and creator content easier",
      "Phone clip is included, so mobile creators can start without buying another mount",
      "Carry bag makes the large tripod easier to transport",
      "Four adjustable leg sections let you choose the height that fits the scene",
    ],
    specifications: [
      { label: "Brand", value: "Plokama" },
      { label: "Model", value: "PK-998" },
      { label: "Type", value: "All-in-One Phone & Camera Tripod" },
      { label: "Maximum Height", value: "200cm / approx. 6.5ft" },
      { label: "Minimum Height", value: "Approx. 55cm" },
      { label: "Folded Length", value: "Approx. 55cm" },
      { label: "Leg Sections", value: "4" },
      { label: "Head Movement", value: "360° Panoramic" },
      { label: "Mount", value: "Standard 1/4″" },
      { label: "Material", value: "Aluminum Alloy + ABS" },
      { label: "Phone Holder", value: "Included" },
      { label: "Remote", value: "Wireless Remote Included" },
      { label: "Use", value: "Phone, Camera, Action Camera, Creator Accessories" },
    ],
    compatibility: [
      "Smartphones with supplied holder",
      "DSLR Cameras",
      "Mirrorless Cameras",
      "Action Cameras with compatible mount",
      "Video Cameras with 1/4″ mount",
      "Compatible Ring Lights / Accessories",
      "TikTok / Reels / YouTube",
      "Photography & Livestreaming",
    ],
    inTheBox: [
      "Plokama PK-998 Tripod",
      "Phone Holder / Clip",
      "Wireless Remote",
      "Carrying Bag",
    ],
    image: "/gadget/products/tripod-plokama-pk998.webp",
  },
  {
    name: "Plokama PK-8899 2M Studio Tripod & Ring Light Stand",
    slug: "plokama-pk-8899-multipurpose-tripod",
    brand: "Plokama",
    sku: "VG-TP-PK8899",
    category: "tripod",
    price: 3999,
    compareAtPrice: 5499,
    rating: 4.8,
    reviewCount: 34,
    featured: true,
    badge: "2M Studio Light Stand",
    stockStatus: "in-stock",
    shortDescription:
      "Give your lighting a proper foundation. Plokama PK-8899 extends to 200cm with a sturdy aluminum build and universal 1/4″ mount for ring lights, LED panels, cameras and studio accessories.",
    details: `# Your Light Is Only as Useful as the Stand Holding It.

A good ring light or LED panel isn't much help if the stand underneath it is short, unstable or constantly slipping.

The **Plokama PK-8899** is built around stability and height, giving creators a strong adjustable support for lighting, photography and studio accessories.

> **The highlight:** A 2-meter stand made for proper creator and studio setups.

# Put the Light Where It Actually Needs to Be

The PK-8899 adjusts from approximately **80cm to 200cm**.

That gives you enough range to place lighting:

- At face level
- Above your subject
- Behind a creator
- Over a product table
- Beside a photography setup

The extra height is especially useful for larger ring lights and LED panels where a short tripod limits your lighting angle.

# Universal 1/4″ Mount

The standard **1/4-inch mounting interface** makes the PK-8899 compatible with a wide range of suitable cameras and creator accessories.

Use it with compatible:

- **Ring lights**
- **LED panels**
- **Photography lights**
- **Camera accessories**
- **Phone holders**
- **Other 1/4″ equipment**

# Stable Without Becoming Impossible to Carry

The aluminum-alloy construction keeps the stand relatively lightweight at around **1kg**, while the folded size is approximately **71.5cm**.

So you can keep it in a studio permanently or put it in its included bag and take it to a shoot.

> **200CM HEIGHT • ALUMINUM BUILD • 1/4″ MOUNT • CARRY BAG**

# Build the Setup Properly

The PK-8899 isn't about flashy features.

It's about giving your light or compatible equipment **a taller, more stable place to work from**.

**Better positioning starts with a better stand.**`,
    features: [
      "Extends to 200cm so lights can be positioned above or around your subject",
      "Strong choice for ring lights and LED panel setups",
      "Standard 1/4″ interface works with many creator accessories",
      "Aluminum-alloy body balances strength with portability",
      "Folds to approximately 71.5cm for easier transport and storage",
      "Around 1kg weight makes it practical for mobile shoots",
      "Useful for photography, video, streaming, makeup and product setups",
    ],
    specifications: [
      { label: "Brand", value: "Plokama" },
      { label: "Model", value: "PK-8899" },
      { label: "Type", value: "Photography / Ring Light / Accessory Stand" },
      { label: "Minimum Working Height", value: "Approx. 80cm" },
      { label: "Maximum Working Height", value: "200cm" },
      { label: "Folded Height", value: "Approx. 71.5cm" },
      { label: "Material", value: "Aluminum Alloy" },
      { label: "Weight", value: "Approx. 1kg" },
      { label: "Mount", value: "Universal 1/4″" },
      { label: "Primary Use", value: "Ring Lights, LED Lights, Cameras & Studio Accessories" },
    ],
    compatibility: [
      "Ring Lights with compatible mounting",
      "LED Panel Lights",
      "Studio Lights",
      "Cameras with compatible 1/4″ mount",
      "Phone Holders with compatible mount",
      "Product Photography",
      "Livestream Setups",
    ],
    inTheBox: ["Plokama PK-8899 Stand", "Carrying Bag", "User Manual"],
    image: "/gadget/products/tripod-plokama-pk8899.webp",
  },
  {
    name: "Plokama VT-170 170cm Camera & Phone Tripod – 3-Way Pan Head",
    slug: "vt-170-aluminum-video-tripod",
    brand: "Plokama",
    sku: "VG-TP-VT170",
    category: "tripod",
    price: 3199,
    compareAtPrice: 4299,
    rating: 4.7,
    reviewCount: 28,
    featured: false,
    badge: "170CM + 3-Way Pan Head",
    stockStatus: "in-stock",
    shortDescription:
      "Frame the shot instead of fighting the stand. Plokama VT-170 reaches 170cm with a 3-way pan head, universal 1/4″ mount and rotating phone holder for photography, video and content creation.",
    details: `# Stability Is Only Half of a Good Tripod.

The other half is being able to put the camera exactly where you want it.

The **Plokama VT-170** combines a tall 170cm tripod with a **3-way pan head**, giving you more deliberate control over horizontal movement, vertical angles and overall framing.

> **The highlight:** 3-way angle control for more precise photography and video.

# From Product Shots to Full-Height Content

Raise the VT-170 to approximately **170cm** for standing videos, portraits and livestreaming.

Lower it when you're shooting:

- Products
- Tabletop videos
- Seated tutorials
- Interviews
- Food content
- Indoor photography

That flexibility means one tripod can stay useful across very different types of shooting.

# Move the Camera — Not the Whole Tripod

The **3-way pan head** lets you tilt, rotate and reposition the camera without constantly moving the tripod legs.

That's especially useful for:

- Panning across a scene
- Portrait vs landscape framing
- Product demonstrations
- Tutorials
- Photography composition

# Phone or Camera

A universal **1/4-inch mount** works with a wide variety of compatible cameras and accessories.

The supplied rotating mobile clip also makes the tripod practical for smartphone creators.

# Quick Setup When the Shot Matters

Quick-release leg locks help you adjust the height faster, while rubberized feet on documented versions improve grip on flat surfaces.

> **170CM • 3-WAY HEAD • 1/4″ MOUNT • PHONE HOLDER**

**Stable legs. More control over the frame.**`,
    features: [
      "3-way pan head gives better control over tilt, rotation and composition",
      "170cm maximum height works well for standing videos and portraits",
      "Universal 1/4″ screw supports compatible cameras and accessories",
      "Rotating mobile clip makes smartphone shooting easy",
      "Quick-release leg locks make height changes faster",
      "Lightweight-alloy construction makes it easier to travel with",
      "Suitable for product videos, YouTube, TikTok, livestreams and photography",
    ],
    specifications: [
      { label: "Brand", value: "Plokama" },
      { label: "Model", value: "VT-170" },
      { label: "Maximum Height", value: "170cm" },
      { label: "Mount", value: "Universal 1/4″" },
      { label: "Head", value: "3-Way Pan Head" },
      { label: "Phone Holder", value: "Double-Pull Rotating Clip" },
      { label: "Leg Locks", value: "Quick Release" },
      { label: "Material", value: "Lightweight Aluminum/Alloy" },
      { label: "Orientation", value: "Portrait & Landscape Supported" },
      { label: "Use", value: "Camera, Smartphone, Ring Light, Projector & Compatible Accessories" },
    ],
    compatibility: [
      "Smartphones",
      "DSLR / Mirrorless Cameras",
      "Digital Cameras",
      "Compatible Ring Lights",
      "Projectors with 1/4″ mounting",
      "Photography",
      "Vlogging",
      "Livestreaming",
    ],
    inTheBox: [
      "Plokama VT-170 Tripod",
      "Mobile Phone Holder / Clip",
      "Carry Bag",
    ],
    image: "/gadget/products/tripod-vt170.webp",
  },
  {
    name: "Plokama PK-9950 150cm Professional Tripod – Phone & Camera Remote",
    slug: "plokama-pk-9950-heavy-duty-tripod",
    brand: "Plokama",
    sku: "VG-TP-PK9950",
    category: "tripod",
    price: 4499,
    compareAtPrice: 5999,
    rating: 4.8,
    reviewCount: 31,
    featured: false,
    badge: "Compact 150CM Hybrid Tripod",
    stockStatus: "in-stock",
    shortDescription:
      "Portable enough for travel, capable enough for serious content. Plokama PK-9950 combines 150cm height, 360° rotation, quick-release camera mounting, phone holder and remote control.",
    details: `# Not Every Shoot Needs a Two-Meter Stand.

Sometimes the better tripod is the one you'll actually take with you.

The **Plokama PK-9950** gives you a practical **150cm shooting height** while staying more compact than the taller 190–200cm models.

> **The highlight:** Phone + camera versatility in a more travel-friendly 150cm tripod.

# Switch from Phone to Camera Faster

The PK-9950 uses a **standard 1/4-inch mounting system and quick-release plate**, helping compatible cameras go on and off the tripod without turning setup into a project.

A phone holder is also supplied on common packages, letting the same tripod work for smartphone content.

# Shoot Vertical or Horizontal

The head provides **360° rotation**, while exact-model sources also list approximately **90° vertical positioning**.

That makes it useful for:

- **Portraits**
- **Landscape photography**
- **TikTok**
- **Reels**
- **YouTube**
- **Travel video**
- **Product photography**

# Step Away from the Camera

A **Bluetooth/wireless remote** is supplied with common PK-9950 packages, letting compatible smartphone users take pictures from a distance.

Set the camera angle, get into position and shoot without touching the phone.

# Built for Carrying

Exact listings place the folded size at roughly **56–60cm**, making it easier to transport than full-height studio stands.

> **150CM • 360° • QUICK RELEASE • PHONE + CAMERA • REMOTE**

**Less bulk. Still enough tripod for real creator work.**`,
    features: [
      "150cm height gives useful shooting range without the bulk of a 2m stand",
      "Quick-release mounting helps you attach and remove compatible cameras faster",
      "Works with both smartphones and cameras",
      "360° rotation gives you flexible composition",
      "90° vertical positioning supports portrait-oriented content",
      "Wireless remote makes solo smartphone photography easier",
      "Compact folded design is more practical for travel",
      "Non-slip feet on documented variants improve stability on flat surfaces",
    ],
    specifications: [
      { label: "Brand", value: "Plokama" },
      { label: "Model", value: "PK-9950" },
      { label: "Maximum Height", value: "Up to approx. 150cm" },
      { label: "Minimum Height", value: "Approx. 55cm on documented variant" },
      { label: "Folded Length", value: "Approx. 56–60cm" },
      { label: "Head Rotation", value: "360°" },
      { label: "Vertical Adjustment", value: "Up to approx. 90°" },
      { label: "Mount", value: "Standard 1/4″" },
      { label: "Quick-Release Plate", value: "Yes" },
      { label: "Phone Holder", value: "Included on common package" },
      { label: "Remote", value: "Bluetooth/Wireless Remote" },
      { label: "Build", value: "ABS + Metal / Aluminum Alloy" },
    ],
    compatibility: [
      "Smartphones",
      "DSLR Cameras",
      "Mirrorless Cameras",
      "Compact Cameras",
      "Action Cameras with compatible adapter",
      "Projectors/accessories using compatible 1/4″ mount",
      "Photography & Mobile Video",
    ],
    inTheBox: [
      "Plokama PK-9950 Tripod",
      "Phone Holder",
      "Bluetooth Remote",
      "Carry Bag",
    ],
    image: "/gadget/products/tripod-plokama-pk9950.webp",
  },
  {
    name: "Plokama VT-200 2M Creator Tripod – 360° Phone Holder + Remote",
    slug: "vt-200-professional-camera-tripod",
    brand: "Plokama",
    sku: "VG-TP-VT200",
    category: "tripod",
    price: 4999,
    compareAtPrice: 6799,
    rating: 4.9,
    reviewCount: 36,
    featured: true,
    badge: "2M Full-Height Creator Stand",
    stockStatus: "in-stock",
    shortDescription:
      "Go from desk shots to full-height creator content with one stand. Plokama VT-200 reaches 200cm with 360° phone rotation, 180° vertical adjustment, remote control and universal camera mounting.",
    details: `# Stop Building Your Camera Setup on Top of Furniture.

The **Plokama VT-200** reaches a full **200cm**, giving you enough height for standing content, elevated angles and professional-looking framing without putting your phone or camera on a chair.

> **The highlight:** A full 2-meter creator tripod for phones and cameras.

# Full-Body Content Finally Fits Naturally

Extend the tripod for:

- **Fashion videos**
- **Full-body TikToks**
- **Workout content**
- **Standing tutorials**
- **Interviews**
- **Group photography**
- **Livestreaming**

Instead of tilting a short tripod upward, bring the camera itself closer to the correct height.

# Rotate the Phone Where the Platform Needs It

The mobile holder supports **360° rotation**, making portrait-to-landscape changes quick.

Current exact Pakistan documentation also specifies roughly **180° vertical adjustment**, giving you much more flexibility for high, low and desk-style angles.

# Use More Than Just a Phone

The universal **1/4-inch mounting interface** allows the VT-200 to work with compatible cameras, phones, ring lights and other accessories.

That gives creators room to upgrade equipment later without immediately replacing the stand.

# Shoot from a Distance

The included **remote control** lets compatible smartphone users take photos or start supported shooting functions without standing next to the device.

A carry bag is also included on the current Pakistan package.

> **200CM • 360° ROTATION • 180° ADJUSTMENT • REMOTE • 1/4″ MOUNT**

**Raise the camera to the shot — instead of compromising the shot for the tripod.**`,
    features: [
      "200cm height handles full-body videos and elevated camera positions",
      "360° phone rotation makes vertical and horizontal shooting simple",
      "180° vertical adjustment adds more high/low angle flexibility",
      "Wireless remote makes solo shooting easier",
      "Universal 1/4″ interface supports phones, cameras and compatible accessories",
      "Durable alloy construction is designed for repeated creator use",
      "Carry bag makes a 2-meter-capable tripod easier to move",
      "Useful for TikTok, YouTube, photography, tutorials and product shoots",
    ],
    specifications: [
      { label: "Brand", value: "Plokama" },
      { label: "Model", value: "VT-200" },
      { label: "Maximum Height", value: "200cm" },
      { label: "Phone Rotation", value: "360°" },
      { label: "Vertical Adjustment", value: "Approx. 180°" },
      { label: "Mount", value: "Universal 1/4″" },
      { label: "Phone Holder", value: "Rotating / Expandable" },
      { label: "Remote", value: "Wireless Remote Included" },
      { label: "Material", value: "Durable Alloy" },
      { label: "Compatibility", value: "Smartphones, Cameras & Compatible Accessories" },
      { label: "Carry Bag", value: "Included on current Pakistan package" },
    ],
    compatibility: [
      "iPhone & Android Smartphones",
      "DSLR / Mirrorless Cameras",
      "Digital Cameras",
      "Compatible Ring Lights",
      "Compatible Photography Accessories",
      "TikTok",
      "YouTube",
      "Livestreaming",
      "Tutorials & Product Shoots",
    ],
    inTheBox: [
      "Plokama VT-200 Tripod",
      "Phone Holder",
      "Wireless Remote",
      "Carry Bag",
    ],
    image: "/gadget/products/tripod-vt200.webp",
  },
  {
    name: "Plokama PK-9970 190cm Professional Tripod – Phone & Camera + Remote",
    slug: "plokama-pk-9970-heavy-duty-tripod",
    brand: "Plokama",
    sku: "VG-TP-PK9970",
    category: "tripod",
    price: 5299,
    compareAtPrice: 6999,
    rating: 4.8,
    reviewCount: 27,
    featured: true,
    badge: "190CM High-Reach Tripod",
    stockStatus: "in-stock",
    shortDescription:
      "Get close to full 2-meter shooting height without carrying the biggest studio stand. Plokama PK-9970 reaches around 190cm with 360° positioning, phone mount and Bluetooth remote.",
    details: `# Almost Two Meters of Shooting Height

A short tripod forces you to compromise the frame.

The **Plokama PK-9970** extends to approximately **190cm**, giving you the height needed for standing portraits, full-body creator content, events and elevated camera positions.

> **The highlight:** Near-2-meter height for both phone and camera shooting.

# Go from Mobile Content to Camera Work

A standard **1/4-inch mounting interface** supports compatible cameras, while the supplied phone holder makes the same tripod practical for mobile creators.

That means you can use it for:

- **TikTok & Reels**
- **YouTube**
- **Portrait photography**
- **Event photography**
- **Product content**
- **Livestreaming**
- **Travel shoots**

without keeping separate stands for every device.

# Frame in Any Direction

The head supports **360° movement**, letting you move between different shooting directions while keeping the legs in place.

That's especially helpful for panoramic framing, events and content where the subject moves around the scene.

# Shoot Without Running Back to the Phone

A **Bluetooth remote** is included on current Pakistan-market listings.

Set the tripod, compose the shot and trigger compatible smartphone photography while you're already in position.

# High Reach Without Extreme Weight

A detailed exact-model specification lists the PK-9970 at roughly **970g**, with ABS + metal construction.

That's a useful balance for creators who want serious height but still need to move the tripod from place to place.

> **190CM • 360° • PHONE + CAMERA • REMOTE • ~970G**

**Go higher without turning your creator setup into permanent studio equipment.**`,
    features: [
      "Approx. 190cm height gives you excellent standing and elevated shooting range",
      "Compatible with both phones and cameras",
      "360° head movement makes changing direction easier",
      "Bluetooth remote simplifies solo smartphone photography",
      "Universal 1/4″ mounting works with common compatible camera accessories",
      "ABS + metal construction balances strength with portability",
      "Approx. 970g documented weight keeps the high-reach tripod manageable",
      "Useful for events, travel, TikTok, photography and studio content",
    ],
    specifications: [
      { label: "Brand", value: "Plokama" },
      { label: "Model", value: "PK-9970" },
      { label: "Maximum Height", value: "Up to approx. 190cm / 1.9m" },
      { label: "Material", value: "ABS + Metal" },
      { label: "Weight", value: "Approx. 970g on documented 190cm variant" },
      { label: "Head Movement", value: "360°" },
      { label: "Mount", value: "Universal 1/4″" },
      { label: "Phone Holder", value: "Included" },
      { label: "Remote", value: "Bluetooth Remote Included" },
      { label: "Use", value: "Mobile, Camera, Photography, Video & Content Creation" },
    ],
    compatibility: [
      "iPhones",
      "Android Smartphones",
      "DSLR Cameras",
      "Mirrorless Cameras",
      "Digital Cameras",
      "Compatible 1/4″ Accessories",
      "TikTok / Reels / YouTube",
      "Events & Photography",
    ],
    inTheBox: [
      "Plokama PK-9970 Tripod",
      "Phone Holder / Clip",
      "Bluetooth Remote",
    ],
    image: "/gadget/products/tripod-plokama-pk9970.webp",
  },
];
