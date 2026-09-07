/**
 * Earbuds catalog — researched product copy for Buy n Try.
 * Do not mix similarly named models. No research notes in customer-facing copy.
 */

export type EarbudSeed = {
  name: string;
  slug: string;
  brand: string;
  sku: string;
  category: "earbuds";
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

export const EARBUDS_KEEP_SLUGS = [
  "airpods-pro-3-anc",
  "airdopes-11-pro",
  "z3-pro-earbuds",
  "firefly-earbuds",
  "ne-12s-earbuds",
  "buds-pro-16",
  "buds-pro-3",
  "olonnie-mecha-n20-earbuds",
  "olonnie-round-n03-earbuds",
  "olonnie-round-n05-earbuds",
] as const;

export const EARBUDS_DATA: EarbudSeed[] = [
  {
    name: "Pro 3 ANC Master Copy Earbuds – 2nd-Gen Pop-Up Pairing",
    slug: "airpods-pro-3-anc",
    brand: "Master Copy",
    sku: "VG-EB-APP3ANC",
    category: "earbuds",
    price: 14999,
    compareAtPrice: 18999,
    rating: 4.8,
    reviewCount: 62,
    featured: true,
    badge: "2nd-Gen Pop-Up + ANC",
    stockStatus: "in-stock",
    shortDescription:
      "Open the case and watch the familiar iPhone-style pairing pop-up appear. Pro 3 Master Copy combines 2nd-gen pop-up connectivity, ANC, Transparency Mode, wireless charging, USB-C and touch controls.",
    details: `# Open the Case. See the Pop-Up. Connect.

The **Pro 3 ANC Master Copy** makes its strongest impression before your music even starts.

Open the charging case near a compatible iPhone and the familiar **2nd-generation iPhone-style pairing pop-up** appears, giving you the seamless look and feel people expect from Pro-style earbuds.

> **The highlight: Open the case → see the pop-up → tap connect → start listening.**

# Turn Down the Outside World

Switch on **Active Noise Cancellation (ANC)** when traffic, conversations, university noise or a busy commute starts competing with your music.

Need to stay more aware of what's around you? **Transparency Mode** lets more environmental sound in without constantly removing the earbuds.

That gives you two very different listening experiences from the same pair.

# A Smarter Case, Not Just a Battery Box

The case adds features that make this Master Copy feel more complete:

- **Wireless charging**
- **USB-C charging**
- **Built-in case buzzer**
- **Touch sensor on the case**
- **iPhone-style connection experience**

Instead of being nothing more than storage, the case becomes part of what makes the product interesting.

# Find the Fit That Actually Works for Your Ear

Multiple silicone tip sizes help you find a more secure seal.

A better seal can improve **comfort, bass response and the perceived effectiveness of noise reduction**.

# Controls Stay on the Earbuds

Use the built-in **touch controls** for supported playback, call and volume functions without constantly reaching for your phone.

> **POP-UP PAIRING • ANC • TRANSPARENCY • WIRELESS CHARGING • USB-C**

# The Familiar Pro Experience at a Lower Price

The reason to choose this product is not that it is genuine Apple hardware—it isn't.

It is for customers who want the **Pro-style design, iPhone-style pop-up, ANC and modern charging features** without paying genuine-AirPods pricing.

**Open. Pop-up. Connect. Listen.**

*Master Copy / replica product. Not manufactured or endorsed by Apple.*`,
    features: [
      "2nd-gen iPhone-style pop-up pairing gives the earbuds their strongest visual feature",
      "ANC helps reduce distracting environmental noise",
      "Transparency Mode lets outside sound back in when you need awareness",
      "Wireless charging lets you top up the case without plugging in",
      "Built-in case buzzer adds another useful case feature",
      "USB-C charging works with modern charging setups",
      "Touch controls keep common functions on the earbuds",
      "Multiple silicone tips help you find a better fit",
      "Compatible with iOS and standard Bluetooth devices",
    ],
    specifications: [
      { label: "Product Type", value: "Pro 3 Master Copy / Replica" },
      { label: "Wearing Style", value: "In-Ear TWS" },
      { label: "Main Feature", value: "2nd-Gen iPhone-Style Pop-Up" },
      { label: "Noise Control", value: "ANC + Transparency Mode" },
      { label: "Bluetooth", value: "5.3 / 5.4 depending batch" },
      { label: "Charging", value: "USB-C" },
      { label: "Wireless Charging", value: "Supported on documented variant" },
      { label: "Case Buzzer", value: "Supported" },
      { label: "Touch Controls", value: "Supported" },
      { label: "Ear Tips", value: "Multiple Sizes" },
      { label: "Compatibility", value: "iOS + Bluetooth Devices" },
      { label: "Color", value: "White" },
      { label: "Playback", value: "Up to 8 Hours Advertised — confirm Buy n Try batch" },
    ],
    compatibility: [
      "Compatible iPhones",
      "iPads",
      "Android Smartphones",
      "Bluetooth Laptops",
      "Bluetooth Tablets",
      "Other compatible Bluetooth devices",
    ],
    inTheBox: [
      "Pro 3 ANC Master Copy Earbuds",
      "USB-C Charging Case",
      "Silicone Ear Tips",
      "Documentation",
    ],
    image: "/gadget/products/earbuds-airpods-pro-3-anc.webp",
  },
  {
    name: "Airdopes 11 Pro Gaming Earbuds – 40ms Low Latency & 13mm Bass",
    slug: "airdopes-11-pro",
    brand: "Airdopes",
    sku: "VG-EB-AD11P",
    category: "earbuds",
    price: 3999,
    compareAtPrice: 5499,
    rating: 4.6,
    reviewCount: 29,
    featured: false,
    badge: "40ms Gaming + 13mm Bass",
    stockStatus: "in-stock",
    shortDescription:
      "Hear the action closer to when it happens. Airdopes 11 Pro combine 40ms low-latency gaming, large 13mm bass drivers, Bluetooth 5.3, IPX5 resistance and USB-C charging.",
    details: `# When Audio Delay Can Cost You the Match

With ordinary Bluetooth earbuds, the sound can sometimes arrive noticeably after the action on screen.

The **Airdopes 11 Pro** are built around a **40ms low-latency mode**, helping gaming audio stay more closely synchronized with what you're seeing.

> **The highlight: 40ms low latency for gaming + large 13mm drivers for stronger bass.**

# Bigger Drivers. More Energy.

The **13mm drivers** are designed for a fuller, bass-forward sound that works particularly well with:

- Gaming
- Hip-hop
- Electronic music
- Movies
- Reels
- Everyday entertainment

You get the impact people expect from budget gaming-style earbuds without carrying a headset around.

# Ready for Gym Bags and Everyday Use

An **IPX5 rating** means the documented model is designed to handle sweat and light water exposure better than basic non-rated earbuds.

That makes them useful for workouts, walking and everyday commuting.

# Battery Status at a Glance

The charging setup includes a **battery indicator**, helping you check available power before heading out.

No more opening your bag after leaving home and discovering everything is almost dead.

# Control from the Earbuds

Built-in **touch controls** handle supported playback and call functions, while **Bluetooth 5.3** provides modern wireless connectivity.

Charging is handled through **USB-C**.

> **40MS • 13MM BASS • BT 5.3 • IPX5 • USB-C**

**Built for the customer who games first—but still needs earbuds for everything else.**`,
    features: [
      "40ms low-latency mode helps gaming audio feel more responsive",
      "13mm drivers deliver a stronger bass-focused sound",
      "Bluetooth 5.3 provides modern wireless connectivity",
      "IPX5 resistance is useful for workouts and everyday use",
      "Battery indicator makes remaining power easier to check",
      "Touch controls reduce the need to reach for your phone",
      "USB-C charging keeps the setup current",
    ],
    specifications: [
      { label: "Model", value: "Airdopes 11 Pro" },
      { label: "Type", value: "TWS Earbuds" },
      { label: "Driver", value: "13mm" },
      { label: "Gaming Latency", value: "40ms" },
      { label: "Bluetooth", value: "5.3" },
      { label: "Water Resistance", value: "IPX5" },
      { label: "Controls", value: "Touch" },
      { label: "Charging", value: "USB-C" },
      { label: "Battery Indicator", value: "Supported" },
    ],
    compatibility: [
      "Android smartphones",
      "iPhones",
      "Bluetooth gaming devices",
      "Tablets and laptops with Bluetooth",
    ],
    inTheBox: [
      "Airdopes 11 Pro Earbuds",
      "Charging Case",
      "USB-C Charging Cable",
      "User Documentation",
    ],
    image: "/gadget/products/earbuds-airdopes-11-pro.webp",
  },
  {
    name: "Z3 Pro TWS Earbuds – 45H Battery & Metallic Starburst Case",
    slug: "z3-pro-earbuds",
    brand: "Z3 Pro",
    sku: "VG-EB-Z3PRO",
    category: "earbuds",
    price: 3499,
    compareAtPrice: 4999,
    rating: 4.7,
    reviewCount: 21,
    featured: true,
    badge: "45H Battery • Starburst Case",
    stockStatus: "in-stock",
    shortDescription:
      "Built to stand out and keep playing. Z3 Pro pairs a metallic starburst charging case with up to 45 hours of advertised playback, 10mm bass drivers and Bluetooth 6.0 connectivity.",
    details: `# Your Earbuds Case Doesn't Have to Look Boring

Most budget earbuds come inside the same plain plastic box.

The **Z3 Pro** immediately looks different with its **metallic starburst-textured charging case**, giving the product a more premium and fashion-forward personality before you even put the earbuds in.

> **The highlight: statement-making metallic case + up to 45 hours of advertised music time.**

# Built for People Who Forget to Charge Everything

With the case included, the Z3 Pro is advertised for **up to 45 hours of music playback**.

That means fewer moments where you reach for your earbuds before university, work or a workout and realize they're dead.

# Bigger 10mm Drivers for Fuller Sound

The supplied specification lists **10mm dynamic drivers**, designed to deliver fuller bass and energetic everyday sound.

They're aimed at the kind of content most people actually listen to:

- Music
- Reels
- Movies
- Gaming
- Podcasts
- Calls

# Calls Without Holding Your Phone

The dual-microphone design is marketed with **binaural noise reduction**, helping improve voice pickup for everyday calls.

# Built for Active Days

The ergonomic in-ear fit and sweat-resistant positioning make the Z3 Pro suitable for commuting, walking and workouts.

Charging uses **USB Type-C**.

> **45H MUSIC • 10MM DRIVER • BT 6.0 • METALLIC STARBURST CASE**

**Long battery life is useful. Long battery life that actually looks good in your hand is better.**`,
    features: [
      "Metallic starburst case gives the earbuds a distinctive premium look",
      "Up to 45 hours advertised total music playback",
      "10mm drivers are designed for strong, fuller bass",
      "Dual-mic noise-reduction positioning supports clearer everyday calls",
      "Bluetooth 6.0 is listed on the Buy n Try stock specification",
      "USB-C charging",
      "Ergonomic in-ear fit",
      "Advertised 100-day standby makes the case useful for occasional users",
    ],
    specifications: [
      { label: "Model", value: "Z3 Pro" },
      { label: "Type", value: "TWS Earbuds" },
      { label: "Bluetooth", value: "BT 6.0 — stock supplied" },
      { label: "Driver", value: "10mm Dynamic" },
      { label: "Total Music Time", value: "Up to 45h advertised" },
      { label: "Standby", value: "Up to 100 days advertised" },
      { label: "Case Battery", value: "300mAh" },
      { label: "Case Charge Time", value: "Approx. 1.5h" },
      { label: "Impedance", value: "32Ω" },
      { label: "Sensitivity", value: "101±3dB" },
      { label: "Charging", value: "USB-C" },
      { label: "Calls", value: "Dual-Mic Noise Reduction" },
    ],
    compatibility: [
      "Android smartphones",
      "iPhones",
      "Tablets",
      "Bluetooth audio devices",
    ],
    inTheBox: [
      "Z3 Pro TWS Earbuds",
      "Metallic Starburst Charging Case",
      "USB-C Cable",
      "User Manual",
    ],
    image: "/gadget/products/earbuds-z3-pro.webp",
  },
  {
    name: "Firefly Superbass TWS Earbuds – 36H Battery",
    slug: "firefly-earbuds",
    brand: "Firefly",
    sku: "VG-EB-FIREFLY",
    category: "earbuds",
    price: 4999,
    compareAtPrice: 6999,
    rating: 4.7,
    reviewCount: 33,
    featured: true,
    badge: "36H + Superbass",
    stockStatus: "in-stock",
    shortDescription:
      "Bass that lasts beyond the commute. Firefly Superbass earbuds combine up to 36 hours of total power, a refined matte circular charging case, Bluetooth 5.3 and clear-call noise isolation.",
    details: `# Your Playlist Should Stop When You Want It To

The **Firefly Superbass TWS Earbuds** are built around one very practical advantage:

**battery life that lasts.**

With up to **36 hours of advertised total playback** through the charging case, you can move through work, university, commuting and workouts without constantly thinking about the nearest charger.

> **The highlight: up to 36 hours of playback + bass-focused sound in a sleek round case.**

# Designed for People Who Like Their Bass to Hit

Firefly's **Superbass audio profile** is aimed at listeners who want more energy from:

- Hip-hop
- Pop
- Electronic music
- Reels
- Movies
- Gaming

Instead of thin, flat sound, the emphasis is on a fuller low end while keeping vocals usable.

# A Case You'll Actually Like Carrying

The smooth **matte circular charging case** is one of the product's strongest visual features.

An LED battery indicator gives you a quick view of remaining power without guessing.

# Calls That Focus More on You

The built-in microphone system is positioned around **clear-call noise isolation**, helping reduce distracting environmental noise when you're talking.

# Charge with the Cable You Already Carry

USB Type-C charging means one less unusual cable to keep around.

> **36H • SUPERBASS • MATTE ROUND CASE • BT 5.3 • USB-C**

**Good earbuds disappear in your ears. A good case makes you want to carry them everywhere.**`,
    features: [
      "Up to 36-hour advertised total battery life",
      "Superbass tuning gives music a more energetic low end",
      "Matte circular case looks cleaner than ordinary plastic cases",
      "LED battery indication helps you check remaining power",
      "Noise-isolation calling features improve everyday conversations",
      "Bluetooth 5.3 on Buy n Try stock specification",
      "Comfortable silicone in-ear tips",
      "USB-C charging",
    ],
    specifications: [
      { label: "Product", value: "Firefly Superbass" },
      { label: "Type", value: "TWS In-Ear" },
      { label: "Bluetooth", value: "5.3 — stock supplied" },
      { label: "Battery", value: "Up to 36h total advertised" },
      { label: "Audio", value: "Superbass / Hi-Fi Style" },
      { label: "Impedance", value: "32Ω" },
      { label: "Sensitivity", value: "101±3dB" },
      { label: "Charging", value: "USB-C" },
      { label: "Controls", value: "Touch" },
      { label: "Case", value: "Matte Round + LED Indicator" },
    ],
    compatibility: [
      "Android smartphones",
      "iPhones",
      "Tablets",
      "Bluetooth audio devices",
    ],
    inTheBox: [
      "Firefly Superbass Earbuds",
      "Matte Round Charging Case",
      "Silicone Tips – S/M/L",
      "USB-C Cable",
      "Manual",
    ],
    image: "/gadget/products/earbuds-firefly.webp",
  },
  {
    name: "NE-12S Purse-Case Open-Ear Clip Earbuds – Bluetooth 5.4",
    slug: "ne-12s-earbuds",
    brand: "NE-12S",
    sku: "VG-EB-NE12S",
    category: "earbuds",
    price: 2499,
    compareAtPrice: 3499,
    rating: 4.5,
    reviewCount: 18,
    featured: true,
    badge: "Mini Purse Earbuds",
    stockStatus: "in-stock",
    shortDescription:
      "Earbuds that look more like jewelry than tech. NE-12S pairs stylish open-ear clips with a luxury quilted mini-purse charging case, Bluetooth 5.4 and comfortable ambient listening.",
    details: `# Earbuds That Belong with Your Outfit

Why should every earbuds case look like a tiny plastic box?

The **NE-12S Open-Ear Clip Earbuds** turn everyday audio into part of your style, pairing jewelry-inspired ear clips with a **charging case designed like a miniature quilted handbag**.

> **The highlight: the charging case looks like a tiny fashion purse.**

# Wear Them More Like Ear Cuffs

Instead of pushing deep inside the ear canal, NE-12S uses an **open-ear clip design** that sits around the outside of the ear.

That makes them especially attractive to people who dislike the sealed feeling of traditional silicone earbuds.

# Listen Without Completely Blocking the World

The open architecture leaves the ear canal more exposed, helping you remain more aware of conversations, announcements and what's happening around you.

That makes them useful for:

- Campus
- Shopping
- Walking
- Office use
- Casual commuting
- Everyday listening

# The Case Is Part of the Product

Most earbuds cases are meant to disappear into a pocket.

This one is designed to be noticed.

The **quilted handbag styling** makes the NE-12S especially suitable for fashion-focused TikTok and Instagram advertising.

# Bluetooth 5.4 and Touch Controls

**Bluetooth 5.4** keeps the wireless connection modern, while touch operation gives you convenient control over supported music and call functions.

> **PURSE CASE • OPEN-EAR CLIP • BT 5.4 • FASHION-FIRST DESIGN**

# Your Earbuds Just Became Part of the Outfit

The biggest reason to buy NE-12S isn't a complicated audio specification.

It's that they **don't look like every other pair of earbuds.**

**Clip them on. Carry the mini purse. Press play.**`,
    features: [
      "Mini handbag charging case instantly stands out",
      "Jewelry-inspired ear clips make the earbuds look more like fashion accessories",
      "Open-ear design avoids sealing the ear canal",
      "Better environmental awareness than conventional sealed earbuds",
      "Bluetooth 5.4",
      "Touch controls",
      "Hi-Fi audio positioning for everyday listening",
      "Great visual product for fashion and lifestyle content",
    ],
    specifications: [
      { label: "Model", value: "NE-12S" },
      { label: "Type", value: "OWS / Open-Ear TWS" },
      { label: "Wearing Style", value: "Ear Clip" },
      { label: "Bluetooth", value: "5.4" },
      { label: "Case Design", value: "Handbag / Purse Style" },
      { label: "Audio", value: "Hi-Fi Style" },
      { label: "Controls", value: "Touch" },
      { label: "Charging", value: "USB-C" },
    ],
    compatibility: [
      "Android smartphones",
      "iPhones",
      "Tablets",
      "Bluetooth audio devices",
    ],
    inTheBox: [
      "NE-12S Open-Ear Earbuds",
      "Purse-Style Charging Case",
      "USB-C Cable",
      "User Manual",
    ],
    image: "/gadget/products/earbuds-ne-12s.webp",
  },
  {
    name: "Buds Pro 16 ANC + ENC Wireless Earbuds – Triple Mic",
    slug: "buds-pro-16",
    brand: "Buds Pro",
    sku: "VG-EB-BP16",
    category: "earbuds",
    price: 3799,
    compareAtPrice: 5199,
    rating: 4.6,
    reviewCount: 26,
    featured: false,
    badge: "ANC + ENC • Triple Mic",
    stockStatus: "in-stock",
    shortDescription:
      "Turn distractions down and keep your voice clearer. Buds Pro 16 combine ANC for listening, ENC + triple-mic calling, deep-bass sound and touch controls in an affordable TWS package.",
    details: `# Less Noise. More of What You're Listening To.

The **Buds Pro 16** give budget-conscious buyers two useful forms of noise control instead of relying only on big marketing words.

**ANC** focuses on your listening experience.

**ENC with the triple-mic setup** focuses on making your voice easier to hear during calls.

> **The highlight: ANC for your ears. ENC + Triple Mics for your calls.**

# Turn Down Everyday Distraction

Use **Active Noise Cancellation** when surrounding noise starts competing with your music, podcasts or videos.

It's useful when you're:

- Commuting
- Studying
- Working
- Sitting in busy rooms
- Travelling

# Let Calls Focus More on Your Voice

The **triple-microphone system with ENC** is designed to improve voice pickup and reduce some distracting environmental sound during calls.

That's useful when you're talking from university, work or somewhere outside.

# Give Music More Energy

Buds Pro 16 are positioned around **deep-bass, Hi-Fi-style sound**, making them particularly appealing for everyday music and entertainment.

# Tap Instead of Reaching for the Phone

Touch controls let you manage supported calls and playback directly from the earbuds.

USB-C keeps the charging setup simple.

> **ANC • ENC • TRIPLE MIC • DEEP BASS • USB-C**

**Premium-sounding feature names without premium-earbud pricing.**`,
    features: [
      "ANC helps reduce distracting sounds during listening",
      "ENC improves the calling side of the experience",
      "Triple microphones help capture your voice",
      "Deep-bass tuning gives music more energy",
      "Touch controls",
      "Voice-assistant support",
      "USB-C charging",
      "Works with Android and iOS Bluetooth devices",
    ],
    specifications: [
      { label: "Model", value: "Buds Pro 16" },
      { label: "Type", value: "TWS Earbuds" },
      { label: "Noise Control", value: "ANC + ENC" },
      { label: "Microphones", value: "Triple-Mic Setup" },
      { label: "Sound", value: "Deep Bass / Hi-Fi Style" },
      { label: "Controls", value: "Touch" },
      { label: "Voice Assistant", value: "Supported" },
      { label: "Charging", value: "USB-C" },
      { label: "Compatibility", value: "Android / iOS / Bluetooth" },
    ],
    compatibility: [
      "Android smartphones",
      "iPhones",
      "Tablets",
      "Bluetooth audio devices",
    ],
    inTheBox: [
      "Buds Pro 16 Earbuds",
      "Charging Case",
      "USB-C Charging Cable",
    ],
    image: "/gadget/products/earbuds-buds-pro-16.webp",
  },
  {
    name: "Buds Pro 3 ANC + ENC Earbuds – 36H Battery",
    slug: "buds-pro-3",
    brand: "Buds Pro",
    sku: "VG-EB-BP3",
    category: "earbuds",
    price: 3299,
    compareAtPrice: 4499,
    rating: 4.7,
    reviewCount: 31,
    featured: false,
    badge: "ANC + ENC • 36H",
    stockStatus: "in-stock",
    shortDescription:
      "More quiet, more bass and less charging. Buds Pro 3 combine ANC + ENC noise reduction, deep-bass audio, Bluetooth 5.3, touch controls and up to 36 hours of advertised battery.",
    details: `# Noise Control for Music and Calls

The **Buds Pro 3** are built around a practical combination:

**ANC + ENC.**

ANC helps reduce distractions during your listening.

ENC is designed to help improve voice clarity during calls.

> **The highlight: two noise-control technologies + up to 36 hours of advertised battery life.**

# Stay in the Music Longer

With up to **36 hours total advertised playback**, the charging case is designed to carry you through multiple listening sessions before needing another wall socket.

That makes it convenient for:

- University
- Work
- Commuting
- Travel
- Gym
- Weekend use

# Bass That Doesn't Sound Flat

The Buds Pro 3 are marketed with a **deep-bass sound profile**, making them especially suitable for listeners who prefer more punch from music, videos and gaming.

# Touch and Go

Built-in touch controls allow you to handle supported calls and playback from the earbuds.

**Bluetooth 5.3** provides the wireless connection.

> **ANC + ENC • 36H • DEEP BASS • BT 5.3 • TOUCH**

**For customers who want a lot of features without stepping into flagship pricing.**

*Generic Buds Pro 3 — not OnePlus Buds Pro 3.*`,
    features: [
      "ANC helps reduce distractions while listening",
      "ENC supports clearer calls",
      "Up to 36-hour advertised total battery",
      "Deep-bass sound profile",
      "Bluetooth 5.3",
      "Touch controls",
      "Comfortable in-ear design",
      "Useful for daily commuting, music and calls",
    ],
    specifications: [
      { label: "Model", value: "Buds Pro 3" },
      { label: "Brand", value: "Generic / No Brand" },
      { label: "Type", value: "TWS In-Ear" },
      { label: "Noise Control", value: "ANC + ENC" },
      { label: "Bluetooth", value: "5.3" },
      { label: "Battery", value: "Up to 36h total advertised" },
      { label: "Sound", value: "Deep Bass" },
      { label: "Controls", value: "Touch" },
      { label: "Charging", value: "Charging Case" },
    ],
    compatibility: [
      "Android smartphones",
      "iPhones",
      "Tablets",
      "Bluetooth audio devices",
    ],
    inTheBox: ["Buds Pro 3 Earbuds", "Charging Case", "Charging Cable"],
    image: "/gadget/products/earbuds-buds-pro-3.webp",
  },
  {
    name: "O-Lonnie Mecha N20 Wireless Earbuds",
    slug: "olonnie-mecha-n20-earbuds",
    brand: "O-Lonnie",
    sku: "VG-EB-OLM20",
    category: "earbuds",
    price: 3899,
    compareAtPrice: 5299,
    rating: 4.6,
    reviewCount: 27,
    featured: true,
    badge: "Mecha Series",
    stockStatus: "in-stock",
    shortDescription:
      "O-Lonnie Mecha N20 wireless earbuds combine the distinctive Mecha-series design with a compact true-wireless setup for everyday music, calls and mobile listening.",
    details: `# Built to Look Different from Ordinary Earbuds

The **O-Lonnie Mecha N20** sits within O-Lonnie's design-led Mecha family, giving customers an alternative to the plain rounded cases seen across most budget TWS earbuds.

> **The highlight: a distinctive Mecha-series design from O-Lonnie.**

Use them for everyday:

- Music
- Calls
- Reels
- Videos
- Commuting
- Casual gaming

# Compact Wireless Freedom

The true-wireless form keeps cables out of your daily routine, while the charging case keeps the earbuds together between listening sessions.

# Designed for Everyday Carry

Its compact format makes it easy to keep in a pocket or bag, giving you an everyday audio option without carrying larger headphones.

> **MECHA DESIGN • TRUE WIRELESS • EVERYDAY AUDIO**

**A more mechanical look for customers tired of ordinary earbud styling.**`,
    features: [
      "Distinctive Mecha-series design from O-Lonnie",
      "True-wireless freedom for everyday listening",
      "Compact charging case for pocket or bag carry",
      "Suitable for music, calls, Reels and commuting",
      "Everyday alternative to plain rounded TWS cases",
    ],
    specifications: [
      { label: "Brand", value: "O-Lonnie" },
      { label: "Model", value: "Mecha N20" },
      { label: "Product Type", value: "Wireless Earbuds" },
      { label: "Charging Case", value: "Included" },
      { label: "Connectivity", value: "Bluetooth Wireless" },
    ],
    compatibility: [
      "Android smartphones",
      "iPhones",
      "Tablets",
      "Bluetooth audio devices",
    ],
    inTheBox: ["O-Lonnie Mecha N20 Earbuds", "Charging Case"],
    image: "/gadget/products/earbuds-olonnie-mecha-n20.webp",
  },
  {
    name: "O-Lonnie Round N03 Metal TWS Earbuds – Bluetooth 5.3",
    slug: "olonnie-round-n03-earbuds",
    brand: "O-Lonnie",
    sku: "VG-EB-OLR03",
    category: "earbuds",
    price: 2799,
    compareAtPrice: 3799,
    rating: 4.6,
    reviewCount: 19,
    featured: false,
    badge: "Metal Body • Round Design",
    stockStatus: "in-stock",
    shortDescription:
      "Wireless earbuds that don't feel like another plastic copy. O-Lonnie Round N03 combines a durable metal-body design, Bluetooth 5.3, F13 composite speakers and Type-C charging.",
    details: `# Plastic Earbud Cases Are Everywhere

The **O-Lonnie Round N03** takes a different approach with a **durable metal-body design**, giving the earbuds a more substantial, premium feel in the hand.

> **The highlight: the round metal design is the reason this model immediately stands out.**

# Clear Everyday Sound

The O-Lonnie-specific listing documents **F13 composite-film speakers**, designed to provide clear everyday audio for music, videos and calls.

That makes N03 a good fit for users who want something more stylish without buying expensive flagship earbuds.

# Bluetooth 5.3 EDR

The documented O-Lonnie variant uses **Bluetooth 5.3 EDR** with up to approximately **15 meters of transmission distance** in suitable conditions.

That gives you freedom to move around a room without keeping the phone in your hand.

# Type-C Charging

Modern USB-C charging makes it easier to keep the earbuds topped up using the same cable standard found across many current devices.

> **METAL BODY • ROUND DESIGN • BT 5.3 • F13 SPEAKER • TYPE-C**

# Earbuds That Feel More Like an Accessory

N03's biggest advantage is not a huge list of gimmicks.

It's taking everyday Bluetooth earbuds and wrapping them in **a cleaner, more premium-looking round metal design.**

**Small earbuds. Much stronger personality.**`,
    features: [
      "Metal-body construction gives the product a more premium feel",
      "Distinctive round styling looks different from ordinary TWS cases",
      "Bluetooth 5.3 EDR on the O-Lonnie-specific variant",
      "Up to approx. 15m documented transmission",
      "F13 composite-film speaker design",
      "Type-C charging",
      "Built-in microphone for calls",
      "Compact everyday wireless design",
    ],
    specifications: [
      { label: "Brand", value: "O-Lonnie" },
      { label: "Model", value: "Round N03" },
      { label: "Type", value: "TWS Earbuds" },
      { label: "Body", value: "Metal" },
      { label: "Bluetooth", value: "5.3 EDR" },
      { label: "Range", value: "Up to approx. 15m" },
      { label: "Speaker", value: "F13 Composite-Film" },
      { label: "Talk Time", value: "Approx. 3–4h" },
      { label: "Charging", value: "USB Type-C" },
      { label: "Microphone", value: "Built-In" },
    ],
    compatibility: [
      "Android Smartphones",
      "iPhones",
      "Tablets",
      "Laptops with Bluetooth",
      "Other compatible Bluetooth devices",
    ],
    inTheBox: [
      "O-Lonnie Round N03 Earbuds",
      "Round Charging Case",
      "USB Type-C Cable",
      "Documentation",
    ],
    image: "/gadget/products/earbuds-olonnie-round-n03.webp",
  },
  {
    name: "O-Lonnie Round N05 TWS Earbuds – 10H Battery & Bluetooth 5.3",
    slug: "olonnie-round-n05-earbuds",
    brand: "O-Lonnie",
    sku: "VG-EB-OLR05",
    category: "earbuds",
    price: 2999,
    compareAtPrice: 3999,
    rating: 4.7,
    reviewCount: 22,
    featured: false,
    badge: "10H Earbuds • 500mAh Case",
    stockStatus: "in-stock",
    shortDescription:
      "Made for people who stay on their earbuds longer. O-Lonnie Round N05 combines up to 10 hours of documented talk time, Bluetooth 5.3, a 500mAh charging case and F13 composite speakers.",
    details: `# Put Them In and Stop Watching the Battery Percentage

The **O-Lonnie Round N05** is built for users who spend more of the day listening and talking.

The detailed N05 specification lists up to **10 hours of talk time**, giving it a meaningful advantage for calls, classes and long listening sessions.

> **The highlight: up to 10 hours documented talk time + a 500mAh charging case.**

# Made for Calls That Don't End in Five Minutes

Whether you're:

- On work calls
- Talking with friends
- Attending online classes
- Commuting
- Listening to podcasts
- Watching videos

the longer runtime means fewer interruptions to put the earbuds back in their case.

# Bluetooth 5.3 EDR

The exact variant is documented with **Bluetooth 5.3 EDR** and approximately **10–15 meters of transmission range**.

That gives you enough wireless freedom to move around a room while your phone stays nearby.

# F13 Composite Speaker

An **F13 composite-membrane speaker** handles everyday music and voice reproduction, with retailer positioning around clear calls and bass-focused sound.

# More Power in the Case

The documented charging case is rated at **500mAh**, providing portable power for the earbuds when you're away from a wall charger.

> **10H TALK • 500mAh CASE • BT 5.3 • F13 SPEAKER**

# Built for People Who Use Their Earbuds All Day

N05's appeal isn't a flashy gimmick.

It's having **more usable battery time in a stylish round O-Lonnie package.**

**Charge less. Listen longer.**`,
    features: [
      "Up to 10 hours documented talk time is the strongest reason to choose N05",
      "500mAh charging case keeps additional portable power ready",
      "Bluetooth 5.3 EDR",
      "10–15m documented wireless range",
      "F13 composite-membrane speaker",
      "50mAh documented earbud battery",
      "Distinctive round O-Lonnie design",
      "Suitable for calls, music and everyday listening",
    ],
    specifications: [
      { label: "Brand", value: "O-Lonnie" },
      { label: "Model", value: "Round N05" },
      { label: "Type", value: "TWS Wireless Earbuds" },
      { label: "Bluetooth", value: "5.3 EDR" },
      { label: "Range", value: "Approx. 10–15m" },
      { label: "Earbud Battery", value: "50mAh documented" },
      { label: "Case Battery", value: "500mAh documented" },
      { label: "Talk Time", value: "Up to approx. 10h" },
      { label: "Speaker", value: "F13 Composite Membrane" },
      { label: "Charging Input", value: "5V/1A" },
    ],
    compatibility: [
      "Android Smartphones",
      "iPhones",
      "Tablets",
      "Laptops",
      "Bluetooth Audio Devices",
    ],
    inTheBox: [
      "O-Lonnie Round N05 Earbuds",
      "Round Charging Case",
      "Charging Cable",
      "Documentation",
    ],
    image: "/gadget/products/earbuds-olonnie-round-n05.webp",
  },
];
