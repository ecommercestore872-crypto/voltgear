/**
 * Tripods & stands catalog — researched Buy n Try copy.
 * Keep visually similar models isolated (380A ≠ UNME ≠ CANDC ≠ JMARY ≠ BLÜK'S).
 * Do not mix DC-320 with DC-6360 specs. Citations stay out of customer-facing copy.
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
  "stand-380a-portable-tripod",
  "unme-pyp-j1004-universal-tripod",
  "candac-dc-320-flexible-tripod",
  "candac-6360-professional-tripod",
  "jmary-kp-2207-portable-camera-tripod",
  "plokama-auto-a20-ai-smart-tracking-tripod",
  "bluks-bx-391-heavy-duty-tripod",
] as const;

export const TRIPODS_DATA: TripodSeed[] = [
  {
    name: "380A Professional 4.5ft Tripod – Phone & Camera Stand",
    slug: "stand-380a-portable-tripod",
    brand: "380A",
    sku: "VG-TP-ST380A",
    category: "tripod",
    price: 1899,
    compareAtPrice: 2699,
    rating: 4.6,
    reviewCount: 38,
    featured: false,
    badge: "Phone + Camera Value Pick",
    stockStatus: "in-stock",
    shortDescription:
      "Stop balancing your phone on tables and chairs. The 380A gives you an adjustable aluminum tripod, 3-way 360° head, phone holder and portable carry setup for photography, video and content creation.",
    details: `# A Real Tripod Without the Professional Price

If you're starting TikTok, YouTube, product photography or mobile videography, the **380A Tripod** gives you something far more useful than a tiny desktop stand:

**proper adjustable shooting height and stable three-leg support.**

> **The highlight: one affordable tripod for both your smartphone and compatible camera.**

# Frame the Shot Instead of Moving the Whole Stand

The **3-way pan-and-tilt head** lets you change direction, tilt and framing while the tripod stays planted.

That makes it much easier to shoot:

- **Portraits**
- **Landscape photos**
- **TikTok & Reels**
- **YouTube**
- **Product videos**
- **Online classes**
- **Group photos**

A 360° pan function also helps when you want to reposition the shot smoothly.

# Get the Camera Off the Table

The common 380A configuration reaches roughly **132cm / 4.3–4.5 feet**, enough to lift your phone or compact camera well above desk height.

Lower it for tabletop work.

Raise it for standing portraits or creator videos.

# Built to Travel

The lightweight **aluminum-alloy construction**, quick leg locks and foldable body make the 380A easy to pack away when you're finished.

Many packages also include a **mobile holder and carrying bag**.

> **4.5FT • 3-WAY HEAD • PHONE + CAMERA • 360° PAN**

# Start Creating Without Building a Studio

The 380A is strongest as a **first proper tripod**.

It's affordable, adjustable, works with multiple device types and gives your shots a much more intentional look.

**Set it down. Level the frame. Start shooting.**`,
    features: [
      "Works with compatible phones and cameras instead of being limited to one device",
      "3-way head gives more control over tilt and framing",
      "360° panning supports landscape, portraits and moving compositions",
      "Approx. 4.3–4.5ft height is useful for both tabletop and standing content",
      "Aluminum construction keeps it relatively light",
      "Quick leg locks make height adjustment faster",
      "Mobile holder is included with common packages",
      "Carry bag makes storage and transport easier",
    ],
    specifications: [
      { label: "Model", value: "380A" },
      { label: "Type", value: "Floor Tripod" },
      { label: "Material", value: "Aluminum Alloy + Plastic" },
      { label: "Maximum Height", value: "Approx. 132cm / 4.3–4.5ft" },
      { label: "Folded Height", value: "Approx. 47–50cm" },
      { label: "Head", value: "3-Way Pan / Tilt" },
      { label: "Rotation", value: "360°" },
      { label: "Mounting", value: "Quick-Release Camera Plate" },
      { label: "Phone Holder", value: "Included on common bundle" },
      { label: "Feet", value: "Non-Slip Rubber" },
      {
        label: "Compatibility",
        value: "Smartphones, Compact Cameras, Compatible DSLRs/Camcorders",
      },
    ],
    compatibility: [
      "Smartphones",
      "Compact Cameras",
      "Compatible DSLR / Mirrorless Cameras",
      "Camcorders",
      "Action Cameras with suitable mount",
      "TikTok / Reels / YouTube",
      "Photography & Video Calls",
    ],
    inTheBox: ["380A Tripod", "Mobile Phone Holder", "Carrying Bag"],
    image: "/gadget/products/tripod-stand-380a.webp",
  },
  {
    name: "UNME PYP-J1004 150cm Professional Tripod – 3-Way Head",
    slug: "unme-pyp-j1004-universal-tripod",
    brand: "UNME",
    sku: "VG-TP-J1004",
    category: "tripod",
    price: 2299,
    compareAtPrice: 3199,
    rating: 4.7,
    reviewCount: 20,
    featured: false,
    badge: "150CM • Clean White Design",
    stockStatus: "in-stock",
    shortDescription:
      "A tripod that looks as clean as the content setup around it. UNME PYP-J1004 reaches 150cm with a 3-way panoramic head, quick-release mounting and stability hook for phones and cameras.",
    details: `# Your Tripod Doesn't Have to Look Like Cheap Studio Gear

The **UNME PYP-J1004** takes the familiar adjustable tripod format and gives it a cleaner, more polished design.

The exact model is even sold in a **distinctive white finish**, making it particularly attractive for beauty rooms, home studios and minimalist creator setups.

> **The highlight: 150cm professional-style tripod functionality in a much cleaner-looking design.**

# 3-Way Control for Better Framing

The tripod uses a **3-way pan head** with handle control, letting you move between different shooting angles without constantly repositioning all three legs.

That is useful for:

- Portrait photography
- Video
- Product filming
- Livestreaming
- Tutorials
- Time-lapse content

The head supports smooth panoramic positioning and a standard mounting system.

# Phone Today. Camera Tomorrow.

A **standard UNC 1/4″ mount** makes the PYP-J1004 useful with a wide range of compatible cameras, phone holders and video equipment.

So upgrading from smartphone content to a camera later doesn't automatically make your tripod useless.

# Give It More Stability When You Need It

A **center stability hook** lets you hang additional weight underneath the tripod.

This can help when you're shooting in situations where extra stability matters.

Quick leg locks and **rubber feet** make setup faster and help the tripod grip flat surfaces.

> **150CM • 3-WAY HEAD • 1/4″ MOUNT • STABILITY HOOK**

# Made for Creators Who Care About the Setup Too

The PYP-J1004 isn't simply about maximum height.

It combines **useful tripod controls with a noticeably cleaner appearance**.

**Your equipment can look good behind the scenes too.**`,
    features: [
      "150cm height provides useful full-body and standing shooting positions",
      "3-way head provides controlled pan and tilt movement",
      "Standard 1/4″ mounting makes it versatile",
      "Quick-release system helps speed up camera setup",
      "Center hook gives you the option to add stabilizing weight",
      "Rubber feet improve grip",
      "Quick lever locks make height adjustment convenient",
      "White variant looks especially good in beauty and home-studio setups",
    ],
    specifications: [
      { label: "Brand", value: "UNME" },
      { label: "Model", value: "PYP-J1004" },
      { label: "Maximum Height", value: "150cm" },
      { label: "Head", value: "3-Way Pan Head" },
      { label: "Load Rating", value: "Up to 1.5kg" },
      { label: "Mount", value: "UNC 1/4″" },
      { label: "Plate", value: "Quick Release" },
      { label: "Legs", value: "Telescoping" },
      { label: "Locks", value: "Quick Lever" },
      { label: "Feet", value: "Rubber" },
      { label: "Stability Hook", value: "Yes" },
      { label: "Color", value: "White documented" },
    ],
    compatibility: [
      "Smartphones with compatible holder",
      "Cameras with 1/4″ mount",
      "Camcorders",
      "Video equipment",
      "Creator accessories using suitable 1/4″ mounting",
    ],
    inTheBox: ["UNME PYP-J1004 Tripod", "UNME Carry Bag", "Retail Box"],
    image: "/gadget/products/tripod-unme-j1004.webp",
  },
  {
    name: "CANDC DC-320 Professional Tripod – Phone & Camera",
    slug: "candac-dc-320-flexible-tripod",
    brand: "CANDC",
    sku: "VG-TP-CDC320",
    category: "tripod",
    price: 1699,
    compareAtPrice: 2399,
    rating: 4.6,
    reviewCount: 18,
    featured: false,
    badge: "3KG Creator Tripod",
    stockStatus: "in-stock",
    shortDescription:
      "A stronger step up from basic mobile stands. CANDC DC-320 combines approximately 1.4–1.5m height, a 3-way adjustable head, bubble level, stability hook and up to 3kg support.",
    details: `# When a Lightweight Phone Stand Isn't Enough

The **CANDC DC-320** is designed for users who want a more substantial tripod for cameras, phones and video equipment.

Instead of relying on a thin selfie-style stand, you get an **aluminum tripod with proper leg locks, control handle and stability features**.

> **The highlight: up to 3kg documented support in a tripod still light enough to carry.**

# Put Heavier Gear on a Proper Base

A detailed retail specification rates the DC-320 for **up to 3kg**, making it suitable for a broader range of compatible photography gear than many lightweight budget tripods.

Use it with compatible:

- DSLR / mirrorless cameras
- Camcorders
- Smartphones
- Creator accessories

# Get the Horizon Right Before You Record

The tripod includes a **bubble level**, helping you see whether your setup is actually straight.

That's a small feature that becomes extremely useful for:

- Product videos
- Architecture shots
- Interviews
- Static YouTube videos
- Photography

# More Height Without Becoming Huge to Carry

Depending on the documented variant, maximum height is roughly **143–152.5cm**, while the folded length is around **56.5cm**.

That gives you useful shooting height while remaining portable enough for regular use.

# Add Stability When the Environment Gets Difficult

A center **weight hook** lets you add extra mass underneath the tripod.

Combined with rubber feet and quick leg locks, this can make outdoor and uneven-surface work more manageable.

> **~1.5M • 3KG LOAD • BUBBLE LEVEL • WEIGHT HOOK • 3-WAY HEAD**

**A proper tripod for when your setup starts getting more serious.**`,
    features: [
      "Up to 3kg documented load gives you more equipment flexibility",
      "Approx. 1.4–1.5m working height suits everyday photography and video",
      "3-way head makes framing easier",
      "Bubble level helps straighten the shot",
      "Center hook allows extra stabilizing weight",
      "Quick leg locks speed up setup",
      "Rubber feet improve grip",
      "Works with phones, cameras and camcorders",
    ],
    specifications: [
      { label: "Brand", value: "CANDC" },
      { label: "Model", value: "DC-320" },
      { label: "Material", value: "Aluminum Alloy + ABS" },
      { label: "Minimum / Folded Height", value: "Approx. 56–56.5cm" },
      {
        label: "Maximum Height",
        value: "Approx. 143–152.5cm depending listing",
      },
      { label: "Maximum Load", value: "Up to 3kg" },
      { label: "Mount", value: "Standard 1/4″" },
      { label: "Head", value: "3-Way / Adjustable" },
      { label: "Bubble Level", value: "Yes" },
      { label: "Weight Hook", value: "Yes" },
      { label: "Quick Leg Locks", value: "Yes" },
      { label: "Phone Support", value: "Yes" },
    ],
    compatibility: [
      "Smartphones",
      "DSLR / mirrorless cameras",
      "Camcorders",
      "Creator accessories with 1/4″ mount",
    ],
    inTheBox: [
      "CANDC DC-320 Tripod",
      "Phone Holder",
      "Carrying Case / Bag",
      "Retail Box",
    ],
    image: "/gadget/products/tripod-candac-dc320.webp",
  },
  {
    name: "CANDC DC-6360 173cm Professional Tripod with Boom Arm",
    slug: "candac-6360-professional-tripod",
    brand: "CANDC",
    sku: "VG-TP-CDC6360",
    category: "tripod",
    price: 3899,
    compareAtPrice: 5299,
    rating: 4.8,
    reviewCount: 23,
    featured: true,
    badge: "Boom Arm • 173CM",
    stockStatus: "in-stock",
    shortDescription:
      "Go beyond eye-level shots. CANDC DC-6360 combines a professional tripod platform with a boom-arm design and up to approximately 173cm height for creative camera, product and overhead-style angles.",
    details: `# Some Shots Need the Camera Somewhere a Normal Tripod Can't Put It

A conventional tripod is excellent when the camera needs to sit directly above its center column.

But product photography, flat-lays and more creative filming often need **the camera moved outward from the tripod itself**.

That's where the **CANDC DC-6360 boom-arm design** becomes interesting.

> **The highlight: a tripod with boom-arm positioning for more creative shooting angles.**

# Put the Camera Over the Subject

The documented boom-arm configuration gives creators more flexibility for shooting:

- **Products on a table**
- **Flat-lay photography**
- **Food content**
- **Unboxings**
- **Craft tutorials**
- **Desk videos**
- **Creative camera angles**

Instead of trying to lean a conventional tripod over your table, the horizontal arm can position compatible equipment farther from the center of the legs.

# Reach Up to Around 173cm

The strongest exact listing identifies the DC-6360 with a **maximum height of approximately 1730mm**.

That gives you useful height even when you're not using the boom configuration.

# Made for More Serious Creator Setups

Current listings identify the DC-6360 as a **professional tripod / camera tripod and monopod** rather than a lightweight mobile selfie stand.

> **173CM • BOOM ARM • CAMERA TRIPOD • CREATIVE ANGLES**

# Stop Making the Shot Fit the Tripod

The DC-6360 is strongest when you need **camera placement that goes beyond straight-up-and-down shooting.**

**Move the camera where the content needs it.**`,
    features: [
      "Boom-arm configuration allows more flexible camera positioning",
      "Useful for overhead and tabletop-style creator work",
      "Approx. 173cm maximum height on current exact listing",
      "Suitable for professional camera/content setups",
      "Can handle conventional shooting as well as more creative compositions",
      "Especially useful for products, food, craft and unboxing content",
    ],
    specifications: [
      { label: "Brand", value: "CANDC" },
      { label: "Model", value: "DC-6360" },
      { label: "Product Type", value: "Professional Tripod / Camera Support" },
      {
        label: "Maximum Height",
        value: "Approx. 173cm on strongest exact listing",
      },
      { label: "Boom Arm", value: "Yes, documented variant" },
      { label: "Camera Use", value: "Supported" },
      { label: "Phone Use", value: "Listings also identify phone compatibility" },
      { label: "Color", value: "Black commonly shown" },
    ],
    compatibility: [
      "Compatible cameras",
      "Smartphones with suitable holder",
      "Product photography",
      "Creator desk and tabletop setups",
    ],
    inTheBox: ["CANDC DC-6360 Tripod"],
    image: "/gadget/products/tripod-candac-6360.webp",
  },
  {
    name: "JMARY KP-2207 Overhead 2-in-1 Tripod – Phone & Camera",
    slug: "jmary-kp-2207-portable-camera-tripod",
    brand: "JMARY",
    sku: "VG-TP-JM2207",
    category: "tripod",
    price: 2999,
    compareAtPrice: 4199,
    rating: 4.8,
    reviewCount: 36,
    featured: true,
    badge: "Overhead / Top-Down Creator",
    stockStatus: "in-stock",
    shortDescription:
      "Made for the shots ordinary tripods struggle with. JMARY KP-2207 switches between standard and overhead shooting for unboxings, food videos, product reels and desk content.",
    details: `# Finally Put the Camera Directly Above the Table

If you make **unboxings, food videos, product demonstrations or desk tutorials**, you already know the problem:

A normal tripod wants to keep the camera beside the table—not above it.

The **JMARY KP-2207** is designed specifically to solve that.

> **The highlight: switch from a normal tripod to an overhead/top-down setup using the same stand.**

# The Perfect Angle for Products and Hands-On Content

Move the horizontal axis over your working surface and frame the camera directly downward.

That makes the KP-2207 particularly useful for:

- **Product unboxings**
- **Food videos**
- **Drawing**
- **Craft tutorials**
- **Phone repair**
- **Cooking**
- **Flat-lay photography**
- **Desk demonstrations**

The viewer sees your hands and the subject instead of an awkward side angle.

# Turn It Back Into a Normal Tripod

Top-down filming isn't the only thing it can do.

The **2-in-1 design converts back to conventional tripod mode**, so you can use the same stand for portraits, talking videos and general photography.

# Official JMARY Construction

JMARY specifies:

**4-section aluminum legs**, **133cm maximum height**, **1.5kg load capacity**, **42cm folded size** and a **standard UNC 1/4″ screw**.

A ball-head/quick-release style setup also gives creators flexible positioning.

> **OVERHEAD • 2-IN-1 • 1/4″ MOUNT • 1.5KG LOAD**

# One Tripod. A Completely Different Camera Angle.

For normal videos, use it upright.

When the content moves to the table, **move the camera above it instead of rearranging your entire room.**

**That's the reason to buy the KP-2207.**`,
    features: [
      "Overhead mode is ideal for top-down creator content",
      "2-in-1 design also works as a conventional tripod",
      "Perfect for unboxing, cooking, repair, drawing and product videos",
      "Standard 1/4″ mounting works with many compatible devices",
      "1.5kg official maximum load",
      "133cm official maximum height",
      "Only 0.68kg, making it relatively easy to transport",
      "4-section aluminum legs balance portability and support",
    ],
    specifications: [
      { label: "Brand", value: "JMARY" },
      { label: "Model", value: "KP-2207" },
      { label: "Design", value: "Overhead + Standard 2-in-1" },
      { label: "Maximum Height", value: "133cm" },
      { label: "Minimum Height", value: "38.5cm" },
      { label: "Folded Height", value: "42cm" },
      { label: "Weight", value: "0.68kg" },
      { label: "Max Load", value: "1.5kg" },
      { label: "Legs", value: "4-Section Aluminum" },
      { label: "Mount", value: "UNC 1/4″" },
      { label: "Head", value: "Adjustable / Ball-Head Style" },
    ],
    compatibility: [
      "Smartphones with compatible holder",
      "DSLR / Mirrorless Cameras within load limit",
      "Action Cameras with compatible mount",
      "Product photography",
      "Overhead filming",
      "Flat-lay photography",
    ],
    inTheBox: ["JMARY KP-2207 Tripod"],
    image: "/gadget/products/tripod-jmary-kp2207.webp",
  },
  {
    name: "Plokama AUTO-A20 AI 360° Auto-Tracking Phone Holder",
    slug: "plokama-auto-a20-ai-smart-tracking-tripod",
    brand: "Plokama",
    sku: "VG-TP-AUTOA20",
    category: "tripod",
    price: 4999,
    compareAtPrice: 6999,
    rating: 4.9,
    reviewCount: 44,
    featured: true,
    badge: "AI Follows You 360°",
    stockStatus: "in-stock",
    shortDescription:
      "Your cameraman just became automatic. Plokama AUTO-A20 detects and follows your movement through 360°, with gesture controls, no required app, remote operation and tripod support.",
    details: `# Move Around. The Camera Follows.

Recording alone usually means one annoying limitation:

**you have to stay exactly where the phone is pointing.**

The **Plokama AUTO-A20** changes that.

Its AI tracking system is designed to detect the subject and **rotate automatically as you move around the room**.

> **The highlight: you move—the phone turns to follow you.**

# Record Yourself Without a Cameraman

The holder can rotate through **360° horizontally**, helping keep you inside the frame while you:

- **Cook**
- **Teach**
- **Exercise**
- **Livestream**
- **Apply makeup**
- **Demonstrate products**
- **Record TikToks**
- **Make Reels**
- **Join video calls**

You can move more naturally instead of constantly walking back to reposition the phone.

# No Special App Required

One of the most useful exact-model features is **no-app operation**.

The tracking system works through the holder itself instead of forcing you to install a questionable third-party camera application.

That means you can continue using the camera/social apps you already know.

# Control It with Your Hands

The AUTO-A20 supports **gesture-based tracking controls**.

Exact packaging shows gestures for controlling tracking states, allowing you to interact with the setup while standing in front of the camera.

A remote is also included/shown on the exact model.

# Put It on a Desk—or Your Existing Tripod

The built-in base works well for tabletop recording.

Need it higher?

A **standard 1/4″ tripod interface** means you can mount the AUTO-A20 on a compatible tripod and turn it into a taller AI-following camera setup.

# Recharge with USB-C

The exact unit uses **USB Type-C 5V/1A charging** and weighs around **220g**, with dimensions approximately **82 × 82 × 180mm**.

> **AI TRACKING • 360° • GESTURE CONTROL • NO APP • TYPE-C**

# Your Phone Doesn't Need Someone Standing Behind It

Set it down.

Put the phone in.

Start moving.

**AUTO-A20 does the camera turning for you.**`,
    features: [
      "AI tracking automatically follows your movement",
      "360° horizontal rotation gives you freedom to move around the room",
      "No dedicated app required",
      "Gesture control lets you control tracking from in front of the camera",
      "Remote control provides another hands-free control method",
      "Standard 1/4″ mount lets you attach it to a compatible tripod",
      "USB-C charging",
      "Works with compatible iPhone and Android phones",
      "Excellent for solo TikTok, cooking, fitness and livestream content",
    ],
    specifications: [
      { label: "Brand", value: "Plokama" },
      { label: "Model", value: "AUTO-A20" },
      { label: "Product Type", value: "AI Tracking Phone Holder" },
      { label: "Tracking", value: "AI Face / Motion Tracking" },
      { label: "Rotation", value: "360° Horizontal Unlimited" },
      { label: "App Required", value: "No" },
      { label: "Gesture Control", value: "Yes" },
      { label: "Remote", value: "Included / documented" },
      { label: "Tripod Mount", value: "1/4″" },
      { label: "Charging", value: "USB-C, 5V/1A" },
      { label: "Size", value: "Approx. 82 × 82 × 180mm" },
      { label: "Net Weight", value: "Approx. 220g" },
      { label: "Phone Orientation", value: "Portrait + Landscape" },
      { label: "Compatibility", value: "iOS & Android Smartphones" },
    ],
    compatibility: [
      "iPhones",
      "Android Smartphones",
      "TikTok",
      "Instagram Reels",
      "YouTube",
      "Video Calls",
      "Livestreaming",
      "Online Teaching",
      "Makeup / Beauty Videos",
      "Fitness Videos",
    ],
    inTheBox: [
      "Plokama AUTO-A20 Tracking Holder",
      "Phone Clamp",
      "Remote Control",
      "USB-C Charging Cable",
    ],
    image: "/gadget/products/tripod-plokama-a20.webp",
  },
  {
    name: "BLÜK'S BX-391 6ft Camera Tripod – 3kg Professional Stand",
    slug: "bluks-bx-391-heavy-duty-tripod",
    brand: "BLÜK'S",
    sku: "VG-TP-BX391",
    category: "tripod",
    price: 3699,
    compareAtPrice: 4999,
    rating: 4.7,
    reviewCount: 21,
    featured: true,
    badge: "6FT • 3KG Camera Tripod",
    stockStatus: "in-stock",
    shortDescription:
      "Built for cameras, tall enough for serious creator setups. BLÜK'S BX-391 reaches 6 feet with a 3kg load rating, 3-way pan head, aluminum body and 1/4″ quick-release mount.",
    details: `# Six Feet of Proper Camera Support

The **BLÜK'S BX-391** is not trying to be a pocket-size selfie stick.

It is a **full-size camera/camcorder tripod** made for creators and photographers who need real height and a stronger equipment platform.

> **The highlight: up to 6 feet tall with an official 3kg load rating.**

# Put the Camera at Eye Level

The BX-391 extends to approximately **183cm / 6 feet**, which makes a major difference for:

- **Standing portraits**
- **Interviews**
- **Event photography**
- **Full-body videos**
- **Livestreaming**
- **YouTube**
- **Studio photography**

Instead of pointing a short tripod upward at the subject, place the camera closer to the height it should actually be.

# A Head Designed for Framing

The **3-way pan-and-tilt head** gives you deliberate control over camera movement.

Use the **360° central-axis rotation** for panoramic repositioning while keeping the tripod legs stationary.

# Made to Hold More Than a Phone

BLÜK'S officially rates the BX-391 for **up to 3kg**.

That makes it far more appropriate for compatible:

- DSLR cameras
- Mirrorless cameras
- Camcorders
- Smartphones with adapter

than very lightweight mobile-only tripods.

# Stability Where It Matters

The BX-391 includes:

- **Quick-release flip locks**
- **Rubber foot pads**
- **Center weight hook**
- **1/4″ quick-release plate**
- **Aluminum body**

Those are practical features that matter more as your equipment becomes heavier.

> **6FT • 3KG • 3-WAY HEAD • ALUMINUM • 1/4″ QUICK RELEASE**

# Buy the Tripod Your Camera Can Grow Into

A cheap tripod may be enough for your first phone video.

The BX-391 makes more sense for the customer who wants **one stand that remains useful when the camera gear gets more serious.**

**More height. More support. More room to grow.**`,
    features: [
      "183cm / 6ft maximum height supports proper standing camera positions",
      "Official 3kg load rating handles significantly more than lightweight selfie tripods",
      "3-way pan and tilt head gives you controlled framing",
      "360° center-axis rotation",
      "Standard 1/4″ quick-release mounting",
      "Aluminum body provides strength without excessive bulk",
      "Rubber feet improve stability",
      "Weight hook lets you add more stabilizing mass",
      "Quick flip locks simplify height changes",
      "BLÜK'S Pakistan lists a 1-year warranty for this model",
    ],
    specifications: [
      { label: "Brand", value: "BLÜK'S" },
      { label: "Model", value: "BX-391" },
      { label: "Type", value: "Camera / Camcorder Tripod" },
      { label: "Material", value: "Aluminum" },
      { label: "Minimum Height", value: "555mm" },
      { label: "Maximum Height", value: "1830mm / 6ft" },
      { label: "Closed Height", value: "575mm" },
      { label: "Maximum Load", value: "3kg" },
      { label: "Head", value: "3-Way Pan & Tilt" },
      { label: "Rotation", value: "360° Central Axis" },
      { label: "Mount", value: "UNC 1/4″ Quick Release" },
      { label: "Leg Locks", value: "Quick-Release Flip" },
      { label: "Feet", value: "Rubber" },
      { label: "Weight Hook", value: "Yes" },
      { label: "Certifications", value: "CE & RoHS listed" },
      { label: "Warranty", value: "1 Year listed by BLÜK'S" },
    ],
    compatibility: [
      "DSLR Cameras",
      "Mirrorless Cameras",
      "Camcorders",
      "Smartphones with compatible adapter",
      "Photography",
      "Video",
      "Interviews",
      "Studio Creator Work",
    ],
    inTheBox: ["1 × BLÜK'S BX-391 Tripod"],
    image: "/gadget/products/tripod-bluks-bx391.webp",
  },
];
