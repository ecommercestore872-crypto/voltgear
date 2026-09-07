/**
 * Ring Lights & Studio catalog — researched product copy.
 * Keep models separate: do not merge disputed wattage/power/size claims.
 * Slugs stay stable for existing URLs.
 */

export type RingLightSeed = {
  name: string;
  slug: string;
  brand: string;
  sku: string;
  category: "ring-light";
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

export const RINGLIGHTS_KEEP_SLUGS = [
  "rgb-led-36-ring-light",
  "rgb-led-33-ring-light",
  "rgb-led-3d-56-ring-light",
  "plokama-live-p24-pro-ring-light",
  "fw-261-ring-light",
  "mj-171-ring-light",
  "fw-171-ring-light",
  "mj-261-ring-light",
  "fw-321-ring-light",
  "rgb-led-pm-60-ring-light",
  "plokama-r-p45-pro-ring-light",
  "r-45-ring-light",
] as const;

export const RINGLIGHTS_DATA: RingLightSeed[] = [
  {
    name: "MJ36 RGB LED Ring Light 36cm – Creator Light with Phone Holder",
    slug: "rgb-led-36-ring-light",
    brand: "MJ Studio",
    sku: "VG-RL-RGB36",
    category: "ring-light",
    price: 3299,
    compareAtPrice: 4499,
    rating: 4.8,
    reviewCount: 37,
    featured: true,
    badge: "36CM RGB Creator Light",
    stockStatus: "in-stock",
    shortDescription:
      "Turn an ordinary room into a content setup. MJ36 combines a large 36cm ring, colorful RGB lighting, adjustable brightness and a centered phone holder for TikTok, Reels, selfies and live streaming.",
    details: `# Better Lighting Changes Everything

A good camera can still look bad under poor lighting.

The **MJ36 RGB LED Ring Light** gives your face, products and videos a larger **36cm / 14-inch lighting area**, helping create brighter and more even illumination without relying on harsh room lights.

> **The highlight:** Large 36cm ring + RGB creativity in one easy creator setup.

# Clean Light or Creative Color — You Choose

Sometimes you need clean lighting for makeup, product videos or a professional livestream.

Other times you want your TikTok, Reel or gaming setup to actually stand out.

The MJ36 gives you **RGB color effects alongside everyday light modes**, allowing the same ring light to move from practical face lighting to colorful background and mood lighting.

# Put Your Phone Where the Light Is Best

The included **phone holder places your smartphone near the center of the ring**, helping light reach your face more evenly from every direction.

That means fewer awkward shadows and a cleaner look for:

- **TikTok & Instagram Reels**
- **YouTube videos**
- **Livestreaming**
- **Makeup**
- **Selfies & portraits**
- **Product videos**

# Adjust the Look Before You Press Record

Brightness can be adjusted to suit your room instead of forcing one fixed intensity.

Use softer light when you're close to the camera, then raise the brightness when shooting from farther away.

> **36CM Ring • RGB Effects • Adjustable Brightness • Phone Holder**

# One Light. More Ways to Create.

The real advantage of the MJ36 is versatility.

Use clean light when you want to look natural. Switch to RGB when you want your content to look more energetic.

**Set the phone. Pick the light. Start creating.**`,
    features: [
      "Large 36cm ring gives your face and subject wider, more even illumination",
      "RGB color effects turn ordinary videos into more visually interesting content",
      "Phone holder keeps your smartphone centered inside the light",
      "Adjustable brightness lets you match the light to your room and shooting distance",
      "Useful for TikTok, Reels, YouTube, makeup, livestreams and photography",
      "One light can handle both normal creator lighting and colorful mood scenes",
    ],
    specifications: [
      { label: "Model", value: "MJ36" },
      { label: "Type", value: "RGB LED Ring Light" },
      { label: "Diameter", value: "Approx. 36cm / 14-inch" },
      { label: "Lighting", value: "RGB + Standard Light Modes" },
      { label: "Brightness", value: "Adjustable" },
      { label: "Phone Holder", value: "Included" },
      { label: "Use", value: "Video, Photography, Streaming, Makeup" },
      { label: "Color", value: "Black / varies by stock" },
    ],
    compatibility: [
      "Smartphones",
      "TikTok / Instagram content",
      "YouTube videos",
      "Livestreaming",
      "Makeup & beauty work",
      "Product photography",
    ],
    inTheBox: ["MJ36 RGB Ring Light", "Phone Holder"],
    image: "/gadget/products/ringlight-rgb-led-36.webp",
  },
  {
    name: "MJ33 RGB Ring Light 33cm – 15 RGB Modes + Phone Holder",
    slug: "rgb-led-33-ring-light",
    brand: "MJ Studio",
    sku: "VG-RL-RGB33",
    category: "ring-light",
    price: 2899,
    compareAtPrice: 3999,
    rating: 4.7,
    reviewCount: 29,
    featured: false,
    badge: "15 RGB + 3 White Modes",
    stockStatus: "in-stock",
    shortDescription:
      "One compact light for clean videos and colorful content. MJ33 gives you 15 RGB patterns, three standard light modes, 10 brightness levels and a 360° phone holder in a 33cm ring.",
    details: `# One Ring Light. Two Completely Different Looks.

The **MJ33 RGB Ring Light** is made for creators who don't want their lighting locked into one boring color.

Use its normal light modes when you want a clean, flattering face light.

Then switch into **15 RGB patterns** when the video needs more personality.

> **The highlight:** 15 RGB patterns + 3 normal lighting modes in one 33cm creator light.

# Make the Background Part of the Content

RGB isn't only decoration.

Different colors can completely change the mood of your Reel, product video, gaming clip or livestream without buying extra studio lights.

Create a warm aesthetic, a colorful gaming look or an energetic TikTok background in seconds.

# Get the Brightness Right

The MJ33 provides **10 adjustable brightness levels**, so you don't have to blast maximum light directly into your face.

Turn it down when recording close-up makeup or talking videos.

Turn it up when your phone is farther away.

# Keep Your Phone in the Sweet Spot

The **360° adjustable phone holder** helps position your smartphone around the center of the ring for more even facial illumination.

It's ideal for:

- **TikTok**
- **Instagram Reels**
- **YouTube**
- **Makeup**
- **Photography**
- **Livestreaming**

# Easy USB Power

The MJ33 uses **5V USB power**, so it can work with compatible wall adapters, laptops or power banks.

> **15 RGB Patterns • 3 Light Modes • 10 Brightness Levels • 33CM**

**Clean when you need it. Colorful when you want it.**`,
    features: [
      "15 RGB patterns let you create colorful backgrounds without buying extra lights",
      "Three normal lighting modes handle everyday face, makeup and product lighting",
      "10 brightness levels give you more control over how strong the light looks",
      "33cm size offers useful coverage without taking over a small creator setup",
      "360° phone holder helps position your smartphone for better framing",
      "USB power makes it convenient for home and portable setups",
    ],
    specifications: [
      { label: "Model", value: "MJ33" },
      { label: "Diameter", value: "33cm / 13-inch" },
      { label: "RGB Patterns", value: "15" },
      { label: "Standard Light Modes", value: "3" },
      { label: "Brightness", value: "10 Levels" },
      { label: "Power", value: "USB 5V" },
      { label: "Phone Holder", value: "360° Adjustable" },
      { label: "Use", value: "TikTok, YouTube, Makeup, Photography, Streaming" },
    ],
    compatibility: [
      "Smartphones",
      "TikTok / Instagram content",
      "YouTube videos",
      "Makeup",
      "Photography",
      "Livestreaming",
    ],
    inTheBox: ["MJ33 RGB Ring Light", "Phone Holder"],
    image: "/gadget/products/ringlight-rgb-led-33.webp",
  },
  {
    name: "3D-56 Professional RGB Ring Light 56cm – Triple Phone Setup",
    slug: "rgb-led-3d-56-ring-light",
    brand: "Studio Master",
    sku: "VG-RL-3D56",
    category: "ring-light",
    price: 11499,
    compareAtPrice: 15499,
    rating: 4.9,
    reviewCount: 54,
    featured: true,
    badge: "22″ + Triple Phone Setup",
    stockStatus: "in-stock",
    shortDescription:
      "Built for serious creator setups. The 3D-56 gives you a huge 56cm/22-inch RGB lighting surface, multiple white-light modes and space for up to three smartphones at once.",
    details: `# When a Small Ring Light Isn't Enough

The **3D-56** steps into proper studio territory with a huge **56cm / 22-inch ring**.

The larger light source spreads illumination across a wider area, making it better suited to creators who record from farther away, beauty professionals, barbers, livestreamers and multi-person content.

> **The highlight:** 22-inch professional ring + support for up to three phones.

# Three Phones. One Lighting Setup.

One of the most useful features is the **triple phone-holder configuration** found on this model.

That creates real possibilities:

- Stream from one phone while recording another angle
- Use one phone for TikTok and another for Instagram
- Monitor comments on a separate device
- Record vertical and horizontal content together

For livestream sellers and creators, that can be far more useful than simply having a brighter light.

# RGB When You Want Impact

The 3D-56 includes **RGB color modes and effects** for creative videos, gaming rooms, music content and background lighting.

When accurate lighting matters more, switch back to **warm, natural or cool white illumination**.

# Made for Bigger Setups

The large ring works especially well for:

- **Beauty & makeup**
- **Barbers**
- **Photography**
- **Livestreaming**
- **TikTok & YouTube**
- **Multi-phone broadcasts**

> **56CM / 22″ • RGB • Triple Phone Holders • Professional Coverage**

**More room. More phones. More control over the shot.**`,
    features: [
      "Huge 56cm / 22-inch ring provides wider coverage than compact creator lights",
      "Three phone holders can support multi-platform or multi-angle content",
      "RGB effects add creative color for videos and livestream backgrounds",
      "Warm, neutral and cool lighting options handle normal studio work",
      "Large format suits beauty salons, barbers, photographers and professional creators",
      "Adjustable/dimmable lighting lets you tune the final look",
    ],
    specifications: [
      { label: "Model", value: "3D-56" },
      { label: "Diameter", value: "56cm / 22-inch" },
      { label: "Lighting", value: "RGB + Warm / Natural / Cool" },
      { label: "Phone Holders", value: "Up to 3" },
      { label: "Brightness", value: "Adjustable" },
      { label: "Mount", value: "Standard Tripod/Light-Stand Compatible" },
      { label: "Use", value: "Studio, Beauty, Streaming, Photography" },
    ],
    compatibility: [
      "Beauty & makeup setups",
      "Barbers & salons",
      "Multi-phone livestreaming",
      "TikTok & YouTube",
      "Photography",
    ],
    inTheBox: ["3D-56 Ring Light", "3 × Phone Holders"],
    image: "/gadget/products/ringlight-rgb-led-3d-56.webp",
  },
  {
    name: "Plokama LIVE-P24 Pro 80W RGB LED Studio Panel Light",
    slug: "plokama-live-p24-pro-ring-light",
    brand: "Plokama",
    sku: "VG-RL-P24P",
    category: "ring-light",
    price: 8999,
    compareAtPrice: 11999,
    rating: 4.9,
    reviewCount: 43,
    featured: true,
    badge: "80W RGB Studio Panel",
    stockStatus: "in-stock",
    shortDescription:
      "Outgrown your ring light? Plokama LIVE-P24 Pro delivers 80W wide-area studio lighting, full RGB color, 3200–6500K white control, remote operation and 270° positioning.",
    details: `# When a Ring Light Starts Feeling Too Small

The **Plokama LIVE-P24 Pro** is designed for creators ready to move beyond basic selfie lighting.

Instead of concentrating light around your phone, its large panel spreads **soft illumination across a much wider area**, helping light faces, products, desks and entire shooting setups more evenly.

> **The highlight:** 80W studio power in a wide RGB panel — not a small creator ring.

# Make Skin and Products Look More Natural

White light can be adjusted from **3200K warm light to 6500K daylight**, helping you match the room instead of fighting against it.

That matters when you're shooting:

- Skin tones
- Makeup
- Clothing
- Product photography
- Interviews
- Tutorials

A matching exact-model listing rates color rendering at **Ra95+**, aimed at keeping colors more natural on camera.

# Turn the Background Any Color You Want

Switch into **full RGB** when the scene needs personality.

Use color behind a streamer, product or subject to make the set look intentionally designed rather than like a normal room.

# Control It Without Leaving the Shot

The included **wireless remote** lets you change brightness, RGB modes and color temperature without constantly walking back to the light.

The panel also tilts through approximately **270°**, making it easier to light from above, straight on or at an angle.

> **80W • RGB • 3200–6500K • Remote • 270° Tilt**

**This is the light for creators who want their room to start looking like a studio.**`,
    features: [
      "80W output gives serious illumination for larger creator and studio setups",
      "Wide panel spreads light more evenly than a small ring light",
      "3200–6500K adjustment lets you match warm rooms or daylight",
      "Full RGB adds professional background and accent lighting",
      "Wireless remote keeps controls within reach while recording",
      "270° adjustment makes positioning much more flexible",
      "Ra95+ listing makes it attractive for product, beauty and skin-tone work",
    ],
    specifications: [
      { label: "Brand", value: "Plokama" },
      { label: "Model", value: "LIVE-P24 Pro" },
      { label: "Type", value: "RGB LED Panel Fill Light" },
      { label: "Rated Power", value: "80W" },
      { label: "Panel Size", value: "Approx. 280 × 400mm" },
      { label: "Color Temperature", value: "3200K–6500K" },
      { label: "Color Modes", value: "White + Full RGB" },
      { label: "Control", value: "Wireless Remote" },
      { label: "Tilt", value: "Up to 270°" },
      { label: "Mount", value: "Light-Stand Compatible" },
      { label: "Voltage", value: "220V" },
    ],
    compatibility: [
      "YouTube / TikTok studios",
      "Product photography",
      "Podcast setups",
      "Interviews & tutorials",
      "Beauty & skin-tone work",
    ],
    inTheBox: [
      "Plokama LIVE-P24 Pro Panel",
      "Wireless Remote",
      "Power Adapter",
      "User Manual",
    ],
    image: "/gadget/products/ringlight-plokama-p24-pro.webp",
  },
  {
    name: "FW-261 10″ LED Soft Ring Light – 3 Tone Creator Kit",
    slug: "fw-261-ring-light",
    brand: "FW Lighting",
    sku: "VG-RL-FW261",
    category: "ring-light",
    price: 2499,
    compareAtPrice: 3499,
    rating: 4.6,
    reviewCount: 25,
    featured: false,
    badge: "Soft Light Best Value",
    stockStatus: "in-stock",
    shortDescription:
      "A simple upgrade that makes you look better on camera. FW-261 delivers soft 10-inch lighting, three color temperatures, adjustable brightness, remote control and an included phone setup.",
    details: `# Your Face Doesn't Need RGB. It Needs Better Light.

The **FW-261** focuses on the part that matters most for everyday video: making faces and products look clean, bright and natural.

Its soft LED ring reduces harsh facial shadows while giving you control over the warmth and intensity of the light.

> **The highlight:** Natural-looking creator lighting without paying for unnecessary RGB effects.

# Pick the Tone That Fits the Room

Choose between:

- **Warm White – 3000K**
- **Natural White – 4000K**
- **Cool White – 6500K**

Warm light creates a softer atmosphere.

Neutral works well for everyday content.

Cool white gives a brighter daylight-style appearance.

# Adjust It Until It Looks Right

Brightness is dimmable, letting you avoid the overexposed face that cheap fixed-brightness lights can create.

Its **CRI 90 rating** is also aimed at keeping skin and product colors looking more natural.

# Everything You Need to Start

The kit is documented with a **phone holder, tripod and remote control**, making it a practical first setup for:

- TikTok
- Reels
- Makeup
- Video calls
- Product videos
- YouTube

> **3 Light Tones • CRI 90 • Remote • 10″ Soft Light**

**No complicated studio. Just better light.**`,
    features: [
      "Soft 10-inch lighting reduces harsh face shadows on camera",
      "Warm, natural and cool tones match different rooms",
      "Dimmable brightness avoids washed-out close-ups",
      "CRI 90 helps keep skin and product colors looking natural",
      "Remote control plus phone holder make setup practical for beginners",
      "Ideal for TikTok, Reels, makeup, calls and product videos",
    ],
    specifications: [
      { label: "Model", value: "FW-261" },
      { label: "Size", value: "Approx. 10-inch" },
      { label: "Color Modes", value: "Warm / Natural / Cool" },
      { label: "Temperature", value: "3000K / 4000K / 6500K" },
      { label: "CRI", value: "90" },
      { label: "Beam Angle", value: "120°" },
      { label: "Power", value: "USB 5V / 2A" },
      { label: "Brightness", value: "Dimmable" },
      { label: "Controls", value: "Touch + Wireless Remote" },
      { label: "Material", value: "ABS + PC" },
    ],
    compatibility: [
      "TikTok & Reels",
      "Makeup",
      "Video calls",
      "Product videos",
      "YouTube",
      "Smartphones",
    ],
    inTheBox: [
      "FW-261 Ring Light",
      "Adjustable Tripod",
      "Smartphone Holder",
      "USB Cable",
      "Wireless Remote",
      "User Manual",
    ],
    image: "/gadget/products/ringlight-fw-261.webp",
  },
  {
    name: "MJ-171 RGB Music-Sync Ring Light 17cm – Phone Creator Light",
    slug: "mj-171-ring-light",
    brand: "MJ Studio",
    sku: "VG-RL-MJ171",
    category: "ring-light",
    price: 3699,
    compareAtPrice: 4999,
    rating: 4.7,
    reviewCount: 31,
    featured: false,
    badge: "Music-Sync RGB",
    stockStatus: "in-stock",
    shortDescription:
      "Make your lighting move with the beat. MJ-171 combines compact RGB illumination, music-reactive effects, USB power and a phone holder for Reels, TikTok, gaming clips and livestreams.",
    details: `# Let the Light Follow the Beat

The **MJ-171** isn't just another tiny ring light.

Its standout feature is **Music Rhythm Mode**, allowing colorful lighting effects to react to sound and music.

> **The highlight:** RGB effects that can move with your music.

# Make Short-Form Content More Visual

Music-sync lighting is especially useful for:

- TikTok transitions
- Reels
- Music videos
- Gaming clips
- Dance content
- Room aesthetics

Instead of manually changing colors during a clip, the lighting itself becomes part of the visual.

# Still Works as a Normal Creator Light

When you don't need the party effect, the MJ-171 can still provide bright fill lighting for selfies, calls, product videos and everyday content.

The built-in phone holder keeps your smartphone close to the center of the light for easier recording.

# USB Makes It Easy to Set Up

USB power means you can run the light from compatible:

- Wall adapters
- Laptops
- Desktop PCs
- Power banks

> **Music Rhythm • RGB • Phone Holder • USB Powered**

**Press play and let the light join the content.**`,
    features: [
      "Music Rhythm Mode lets RGB effects react to sound and music",
      "Compact ~17cm ring fits desks and small creator setups",
      "Still works as everyday fill light for selfies and calls",
      "Phone holder keeps your smartphone near the center of the light",
      "USB power works with adapters, laptops and power banks",
      "Great for TikTok, Reels, gaming clips and livestream aesthetics",
    ],
    specifications: [
      { label: "Model", value: "MJ-171" },
      { label: "Diameter", value: "Approx. 17cm" },
      { label: "Lighting", value: "RGB" },
      { label: "Special Mode", value: "Music Rhythm / Sound Reactive" },
      { label: "Phone Holder", value: "Included" },
      { label: "Power", value: "USB" },
      { label: "Brightness/Modes", value: "Adjustable" },
      { label: "Use", value: "Short Videos, Streaming, Selfies, Gaming" },
    ],
    compatibility: [
      "TikTok transitions",
      "Reels & music videos",
      "Gaming clips",
      "Selfies & calls",
      "USB power banks & adapters",
    ],
    inTheBox: ["MJ-171 Ring Light", "Phone Holder", "USB Power Cable"],
    image: "/gadget/products/ringlight-mj-171.webp",
  },
  {
    name: "FW-171 LED Soft Ring Light – Compact 3-Tone Creator Kit",
    slug: "fw-171-ring-light",
    brand: "FW Lighting",
    sku: "VG-RL-FW171",
    category: "ring-light",
    price: 3999,
    compareAtPrice: 5499,
    rating: 4.8,
    reviewCount: 28,
    featured: false,
    badge: "Compact Soft Light",
    stockStatus: "in-stock",
    shortDescription:
      "A simple first lighting upgrade for videos, makeup and calls. FW-171 gives you soft illumination, warm/neutral/cool modes, adjustable brightness, remote control and USB portability.",
    details: `# Small Setup. Big Difference on Camera.

You don't need an expensive studio to stop looking dark and shadowy on video.

The **FW-171 LED Soft Ring Light** is designed as a compact everyday lighting solution for beginners, students, creators and anyone regularly appearing on camera.

> **The highlight:** Simple, natural face lighting without the size or cost of a professional studio light.

# Three Looks for Different Rooms

Choose:

**Warm White** for a softer atmosphere.

**Natural White** for balanced everyday content.

**Cool White** for a brighter daylight-style look.

Brightness can also be adjusted so your face doesn't look washed out when sitting close to the light.

# Made for Everyday Camera Use

Use it for:

- Online classes
- Zoom meetings
- Makeup
- TikTok
- Instagram
- Product videos
- YouTube
- Selfies

Its **CRI 90** specification is designed to keep skin and object colors more natural on camera.

# Plug In Almost Anywhere

USB power makes the FW-171 easy to use from a compatible charger, laptop, computer or power bank.

> **3 Tones • CRI 90 • Remote • USB**

**The easiest content upgrade is usually the light in front of you.**`,
    features: [
      "Compact soft light improves everyday video without a full studio",
      "Warm, natural and cool tones match different rooms",
      "Adjustable brightness avoids washed-out close-ups",
      "CRI 90 helps keep skin and object colors more natural",
      "Remote control and USB power keep setup simple",
      "Ideal for classes, calls, makeup, TikTok and product videos",
    ],
    specifications: [
      { label: "Model", value: "FW-171" },
      { label: "Lighting", value: "Soft White LED" },
      { label: "Modes", value: "Warm / Natural / Cool" },
      { label: "Temperature", value: "3000K / 4000K / 6500K" },
      { label: "CRI", value: "90" },
      { label: "Beam Angle", value: "120°" },
      { label: "Power", value: "USB 5V / 2A" },
      { label: "Brightness", value: "Adjustable" },
      { label: "Controls", value: "Touch + Remote" },
    ],
    compatibility: [
      "Online classes & Zoom",
      "Makeup",
      "TikTok & Instagram",
      "Product videos",
      "YouTube & selfies",
    ],
    inTheBox: [
      "FW-171 Ring Light",
      "Adjustable Tripod",
      "Phone Holder",
      "USB Cable",
      "Wireless Remote",
      "User Manual",
    ],
    image: "/gadget/products/ringlight-fw-171.webp",
  },
  {
    name: "MJ-261 RGB Music-Sync Ring Light 26cm – Creator Fill Light",
    slug: "mj-261-ring-light",
    brand: "MJ Studio",
    sku: "VG-RL-MJ261",
    category: "ring-light",
    price: 2799,
    compareAtPrice: 3799,
    rating: 4.7,
    reviewCount: 36,
    featured: false,
    badge: "26CM Music-Sync RGB",
    stockStatus: "in-stock",
    shortDescription:
      "Bring the beat into your setup. MJ-261 combines a larger 26cm RGB ring, music-reactive effects, up to 15 colors, adjustable brightness and smartphone mounting for energetic content.",
    details: `# When the Light Becomes Part of the Video

The **MJ-261** takes a normal creator ring and adds something much more visual — **music-reactive RGB lighting**.

Play music and compatible lighting effects can respond to the rhythm, helping make Reels, TikToks, gaming clips and livestreams feel more alive.

> **The highlight:** A 26cm RGB ring that reacts to sound.

# More Creative Than a Basic White Ring

The MJ-261 is listed with **up to 15 RGB colors** plus adjustable brightness.

Use bold colors for:

- Gaming
- Dance videos
- Music content
- TikTok transitions
- Background effects
- Livestreaming

Then reduce the intensity when you want a softer look.

# Bigger Than the MJ-171

At approximately **26cm**, the MJ-261 provides a larger lighting surface than the smaller MJ-171, giving you more usable coverage around your face and phone.

# Easy Phone Recording

A phone holder keeps the device positioned with the light while USB power keeps the setup simple.

> **26CM • Music Sync • Up to 15 Colors • 10 Brightness Levels**

**If your content has music, your lighting can follow it too.**`,
    features: [
      "Music-reactive RGB lighting makes Reels and TikToks feel more alive",
      "Up to 15 RGB colors plus adjustable brightness",
      "Larger ~26cm ring than the compact MJ-171",
      "Phone holder keeps your device positioned with the light",
      "USB power keeps home creator setups simple",
      "Great for gaming, dance, music content and livestream backgrounds",
    ],
    specifications: [
      { label: "Model", value: "MJ-261" },
      { label: "Diameter", value: "Approx. 26cm" },
      { label: "Lighting", value: "RGB" },
      { label: "RGB Colors", value: "Up to 15" },
      { label: "Brightness", value: "10 Levels" },
      { label: "Special Effect", value: "Music Rhythm Sync" },
      { label: "Rotation", value: "Up to 360°" },
      { label: "Power", value: "USB" },
      { label: "Phone Holder", value: "Included" },
    ],
    compatibility: [
      "TikTok & Reels",
      "Gaming & dance content",
      "Music videos",
      "Livestream backgrounds",
      "Smartphones",
    ],
    inTheBox: ["MJ-261 Ring Light", "Phone Holder", "USB Power Connection"],
    image: "/gadget/products/ringlight-mj-261.webp",
  },
  {
    name: "FW-321 32cm Professional LED Soft Ring Light – Remote Control",
    slug: "fw-321-ring-light",
    brand: "FW Lighting",
    sku: "VG-RL-FW321",
    category: "ring-light",
    price: 3499,
    compareAtPrice: 4799,
    rating: 4.7,
    reviewCount: 22,
    featured: false,
    badge: "32CM Pro Soft Light",
    stockStatus: "in-stock",
    shortDescription:
      "Clean studio-style lighting without RGB distractions. FW-321 combines a larger 32cm ring, warm/neutral/cool illumination, dimming and remote control for makeup, portraits and professional content.",
    details: `# When You Want Better Skin Light — Not More Colors

The **FW-321** focuses on one job: creating clean, soft and flattering illumination.

Its larger **32cm / 14-inch ring** gives you more coverage than small desktop lights, making it better suited to beauty, professional content and regular camera work.

> **The highlight:** Bigger soft-light coverage for creators who prioritize natural-looking results.

# Warm. Neutral. Cool.

Switch between three useful lighting styles:

- **Warm light**
- **Neutral light**
- **Cool white**

That lets you match the ring to the room, your makeup or the visual style you're trying to create.

# Dim It Instead of Moving Everything

Brightness adjustment gives you more control over exposure.

If the light looks too aggressive during a close-up, reduce it.

If you're recording farther back, increase it.

# Remote Control Makes Studio Work Easier

Instead of walking back to the ring after every adjustment, use the **wireless remote** to change supported lighting settings.

This is particularly useful for:

- Makeup artists
- Photographers
- Video creators
- Livestreamers
- Online teachers
- Beauty salons

> **32CM • 3 Tones • Dimmable • Remote**

**No rainbow required. Just good light.**`,
    features: [
      "Larger 32cm / 14-inch soft ring for flattering face and beauty light",
      "Warm, neutral and cool modes without RGB distractions",
      "Dimmable brightness for close-up or farther shots",
      "Wireless remote makes live adjustments easier",
      "Suited to makeup artists, salons, teachers and photographers",
      "Focused on clean professional results instead of party colors",
    ],
    specifications: [
      { label: "Model", value: "FW-321" },
      { label: "Diameter", value: "Approx. 32cm / 14-inch" },
      { label: "Type", value: "LED Soft Ring Light" },
      { label: "Light Modes", value: "Warm / Neutral / Cool" },
      { label: "Brightness", value: "Dimmable" },
      { label: "Remote Control", value: "Included" },
      { label: "Phone Holder", value: "Supported" },
      { label: "Material", value: "Plastic" },
      { label: "Use", value: "Beauty, Video, Photography, Streaming" },
    ],
    compatibility: [
      "Makeup artists & salons",
      "Photographers",
      "Video creators",
      "Livestreamers",
      "Online teachers",
    ],
    inTheBox: ["FW-321 Ring Light", "Remote Control", "Phone Holder"],
    image: "/gadget/products/ringlight-fw-321.webp",
  },
  {
    name: "PM-60 RGB Professional LED Fill Light – 65W 816-LED Panel",
    slug: "rgb-led-pm-60-ring-light",
    brand: "Studio Master",
    sku: "VG-RL-PM60",
    category: "ring-light",
    price: 14999,
    compareAtPrice: 19999,
    rating: 5.0,
    reviewCount: 48,
    featured: true,
    badge: "816-LED RGB Panel",
    stockStatus: "in-stock",
    shortDescription:
      "Built for bigger lighting jobs. PM-60 packs a 65W output, 816 LEDs, RGB effects, remote adjustment and flexible positioning for studio video, product photography and background lighting.",
    details: `# This Isn't a Selfie Light.

The **PM-60 RGB Fill Light** is designed for people who need a much larger source of light than a phone-sized ring can provide.

With **816 LEDs and up to 65W output** on the verified variant, it can become a proper part of a photography, livestream or video setup.

> **The highlight:** 816 LEDs delivering wide RGB studio illumination.

# Light the Subject — or Build the Background

Use the PM-60 as a strong fill light for a person or product.

Or use its **RGB capability** to put colored light onto:

- Studio walls
- Gaming backgrounds
- Product scenes
- Music videos
- Livestream sets
- Portraits

# Move the Light Instead of Moving Your Set

The panel can be positioned through approximately **90° of tilt and 360° rotation**, giving you far more creative freedom than a fixed desktop lamp.

Angle it down toward a desk.

Turn it sideways for a colored edge light.

Aim it behind the subject for background separation.

# Control Brightness from a Distance

Matching PM-60 listings specify **remote control and dimming**, letting you tune intensity without constantly touching the fixture.

> **65W • 816 LEDs • RGB • Remote • Flexible Positioning**

**When the lighting becomes part of the production, PM-60 starts making sense.**`,
    features: [
      "65W verified variant with 816 LEDs for wide studio illumination",
      "Works as fill light for people and products or RGB background light",
      "Approx. 90° tilt and 360° rotation for flexible positioning",
      "Remote control and dimming for adjustments during a shoot",
      "Built for photography, livestream and video setups beyond selfie rings",
      "RGB effects support gaming, music and portrait backgrounds",
    ],
    specifications: [
      { label: "Model", value: "PM-60" },
      { label: "Type", value: "Professional RGB LED Fill Light" },
      { label: "Verified Variant Power", value: "65W" },
      { label: "LED Count", value: "816" },
      { label: "Brightness", value: "Adjustable" },
      { label: "RGB Effects", value: "Supported" },
      { label: "Control", value: "Remote" },
      { label: "Tilt", value: "Approx. 90°" },
      { label: "Rotation", value: "Approx. 360°" },
      { label: "Mount", value: "Lighting Stand Compatible" },
    ],
    compatibility: [
      "Studio video & photography",
      "Product scenes",
      "Livestream sets",
      "Gaming & music backgrounds",
      "Light stands",
    ],
    inTheBox: ["PM-60 RGB Fill Light", "Remote Control"],
    image: "/gadget/products/ringlight-rgb-led-pm60.webp",
  },
  {
    name: "Plokama R45 Pro RGB Ring Light 45cm – Professional Creator Light",
    slug: "plokama-r-p45-pro-ring-light",
    brand: "Plokama",
    sku: "VG-RL-RP45P",
    category: "ring-light",
    price: 7999,
    compareAtPrice: 10999,
    rating: 4.9,
    reviewCount: 39,
    featured: true,
    badge: "45CM RGB Pro",
    stockStatus: "in-stock",
    shortDescription:
      "One big ring for professional face lighting and colorful content. Plokama R45 Pro combines a 45cm ring, RGB effects, white-light modes, adjustable brightness and wireless remote control.",
    details: `# Professional White Light When You Need It. RGB When You Don't.

The **Plokama R45 Pro** gives creators both sides of modern lighting.

Use the large **45cm / 18-inch ring** with normal white lighting when skin tone, makeup or products need to look clean.

Then switch to **RGB color effects** when the content needs more energy.

> **The highlight:** Professional 45cm coverage + RGB creativity in one ring.

# Big Enough for More Than Selfies

The larger ring creates a broader light source than small desktop models.

That makes it better suited to:

- Beauty creators
- Makeup artists
- Livestream sellers
- TikTok creators
- YouTubers
- Portrait photography

# Make the Background Match the Content

RGB modes let you introduce color without needing separate accent lights.

Create a red product scene.

A blue gaming setup.

A purple livestream background.

Or switch everything off and return to clean white light.

# Change Settings Without Breaking the Shot

Brightness can be adjusted manually or through the **wireless remote**, giving you control while you're already positioned in front of the camera.

> **45CM • RGB • White Modes • Remote • Adjustable Brightness**

**One light for the clean shot. One light for the creative shot.**`,
    features: [
      "45cm ring gives broad and flattering lighting coverage",
      "RGB modes turn backgrounds and creator setups into part of the visual",
      "White-light modes keep makeup, skin and products usable for normal work",
      "Adjustable brightness prevents overexposed close-up videos",
      "Wireless remote makes changes easier during livestreams",
      "Large size works well for beauty and professional content setups",
    ],
    specifications: [
      { label: "Brand", value: "Plokama" },
      { label: "Model", value: "R45 Pro" },
      { label: "Diameter", value: "45cm / approx. 17.5–18-inch" },
      { label: "Lighting", value: "RGB + White Modes" },
      { label: "Brightness", value: "Adjustable" },
      { label: "Remote", value: "Wireless" },
      { label: "Mount", value: "Tripod Compatible" },
      { label: "Use", value: "Streaming, Makeup, Photography, Video" },
    ],
    compatibility: [
      "Beauty creators & makeup artists",
      "Livestream sellers",
      "TikTok & YouTube",
      "Portrait photography",
      "Tripod / light stands",
    ],
    inTheBox: [
      "R45 Pro Ring Light",
      "Power Cable",
      "Phone Holder(s)",
      "Wireless Remote",
    ],
    image: "/gadget/products/ringlight-plokama-r-p45-pro.webp",
  },
  {
    name: "Plokama R45 Soft LED Ring Light 45cm – Professional Beauty Light",
    slug: "r-45-ring-light",
    brand: "Plokama",
    sku: "VG-RL-R45",
    category: "ring-light",
    price: 6499,
    compareAtPrice: 8999,
    rating: 4.7,
    reviewCount: 26,
    featured: false,
    badge: "45CM Soft Beauty Light",
    stockStatus: "in-stock",
    shortDescription:
      "Big, soft and made to flatter. Plokama R45 gives you a 45cm lighting surface, warm/neutral/cool modes, adjustable brightness and remote control for makeup, streaming and professional video.",
    details: `# Big Soft Light Makes Faces Look Better.

The **Plokama R45** is built around a simple idea:

Give your face a larger, softer source of light instead of blasting it with a tiny LED.

Its **45cm / 18-inch ring** spreads illumination more evenly, helping reduce the hard shadows that make skin and makeup look less flattering on camera.

> **The highlight:** Large 45cm soft light made for faces.

# Pick the Right White for the Room

Choose between:

- **Warm light**
- **Neutral / soft light**
- **Cool white**

That makes the R45 useful whether you're recording in a warm bedroom, under mixed indoor lighting or next to daylight.

# Perfect for Beauty Work

The large ring is especially useful for:

- **Makeup artists**
- **Beauty creators**
- **Salons**
- **TikTok**
- **YouTube**
- **Livestreams**
- **Portrait photography**

A centered phone setup also helps keep the light balanced around your face.

# Control It Without Leaving Your Seat

Brightness and color temperature can be adjusted through the included **wireless remote**, so you can make changes while staying inside the frame.

The mounting design also allows broad positioning and rotation.

> **45CM • 3 Light Modes • Remote • Soft Illumination**

# Keep It Simple

Not everyone needs flashing RGB effects.

If your priority is looking cleaner, brighter and more professional on camera, the standard R45 is the more focused choice.

**Big light. Soft shadows. Better faces.**`,
    features: [
      "45cm soft ring spreads light more evenly across the face",
      "Warm, neutral and cool modes match different rooms",
      "Adjustable brightness plus wireless remote during shoots",
      "Built for makeup, salons, beauty creators and portraits",
      "Focused soft white lighting without RGB distractions",
      "Phone support helps keep light balanced around your face",
    ],
    specifications: [
      { label: "Brand", value: "Plokama" },
      { label: "Model", value: "R45" },
      { label: "Diameter", value: "45cm / approx. 17.5–18-inch" },
      { label: "Lighting Modes", value: "Warm / Neutral / Cool" },
      { label: "Brightness", value: "Adjustable" },
      { label: "Remote", value: "Wireless" },
      { label: "Positioning", value: "Adjustable" },
      { label: "Phone Support", value: "Supported" },
      { label: "Use", value: "Makeup, Streaming, Photography, Video" },
    ],
    compatibility: [
      "Makeup artists & salons",
      "Beauty creators",
      "TikTok & YouTube",
      "Livestreams",
      "Portrait photography",
    ],
    inTheBox: [
      "Plokama R45 Ring Light",
      "Power Cable",
      "Phone Holder(s)",
      "Wireless Remote",
    ],
    image: "/gadget/products/ringlight-r-45.webp",
  },
];
