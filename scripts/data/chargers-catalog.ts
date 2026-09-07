/**
 * Chargers catalog — researched product copy.
 * Keep Original vs A+ vs car vs watch docks separate.
 * Brand voice: Buy n Try (never VoltGear). A+ is not OEM certification.
 */

export type ChargerSeed = {
  name: string;
  slug: string;
  brand: string;
  sku: string;
  category: "charger";
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

export const CHARGERS_KEEP_SLUGS = [
  "iphone-20w-original-lifetime-warranty-adapter",
  "iphone-20w-aplus-grade-adapter",
  "google-pixel-30w-aplus-charger",
  "google-pixel-30w-original-charger",
  "samsung-25w-original-fast-charger",
  "samsung-25w-aplus-fast-charger",
  "romoss-45w-dual-port-fast-charger",
  "samsung-galaxy-watch-wireless-charger",
  "apple-watch-type-c-magnetic-charger",
  "c6-4in1-retractable-car-charger",
] as const;

export const CHARGERS_DATA: ChargerSeed[] = [
  {
    name: "Apple 20W USB-C Power Adapter – 100% Original",
    slug: "iphone-20w-original-lifetime-warranty-adapter",
    brand: "Apple",
    sku: "VG-CH-IP20W-LTD",
    category: "charger",
    price: 6499,
    compareAtPrice: 8499,
    rating: 4.9,
    reviewCount: 68,
    featured: true,
    badge: "100% Original • 20W",
    stockStatus: "in-stock",
    shortDescription:
      "Bought an expensive iPhone? Don't compromise on the charger. This genuine Apple 20W USB-C adapter delivers Apple's intended fast-charging experience for compatible iPhones and iPads.",
    details: `# The Charger Your iPhone Was Designed to Use

You already paid for the iPhone. The charger shouldn't be the part you have to worry about.

The **Original Apple 20W USB-C Power Adapter** is designed to deliver efficient USB-C charging to compatible Apple devices without relying on the questionable internals found in unverified copies.

> **The highlight: genuine Apple hardware for customers who want authenticity first.**

# From Low Battery to Ready Faster

Pair it with the correct USB-C charging cable and compatible iPhones can use Apple's fast-charging feature.

Apple states that supported iPhones can reach **around 50% battery in approximately 35 minutes** under suitable conditions.

That makes it useful when you have a short window before:

- University
- Work
- Travel
- Going out
- A long day away from a socket

# One Adapter for More Than Your iPhone

The Apple 20W adapter can also power compatible **iPads, AirPods charging accessories, Apple Watch chargers and other supported USB-C devices**.

# Small Enough to Become Your Everyday Charger

Its compact single-port design keeps things simple:

**plug in → connect your cable → charge.**

> **ORIGINAL APPLE • 20W USB-C • FAST CHARGING • COMPACT**

**No exaggerated numbers. No unnecessary ports. Just the charger your Apple setup actually needs.**

**Lifetime Originality Guarantee by Buy n Try** — a Buy n Try authenticity promise, not an Apple lifetime warranty.`,
    features: [
      "Genuine Apple adapter removes the uncertainty associated with replica chargers",
      "20W USB-C fast charging supports compatible iPhones",
      "Apple rates supported iPhones for roughly 50% charging in around 35 minutes",
      "Works with compatible iPhones, iPads and other Apple accessories",
      "Compact design is easy to keep at home, work or in your bag",
      "Lifetime Originality Guarantee by Buy n Try (retailer authenticity promise)",
    ],
    specifications: [
      { label: "Brand", value: "Apple" },
      { label: "Product", value: "USB-C Power Adapter" },
      { label: "Maximum Power", value: "20W" },
      { label: "Output Port", value: "USB-C" },
      { label: "Charging", value: "USB-C Fast Charging" },
      { label: "Recommended For", value: "Compatible iPhone & iPad" },
      { label: "Cable", value: "Sold Separately" },
      { label: "Color", value: "White" },
      { label: "Buy n Try Guarantee", value: "Lifetime Originality Guarantee" },
    ],
    compatibility: [
      "iPhone 8 and newer compatible models",
      "iPad",
      "USB-C Apple accessories",
      "Other compatible USB-C devices",
    ],
    inTheBox: ["1 × Apple 20W USB-C Power Adapter"],
    image: "/gadget/products/adapter-iphone-original-20w.webp",
  },
  {
    name: "A+ 20W USB-C Fast Charger for iPhone",
    slug: "iphone-20w-aplus-grade-adapter",
    brand: "A+ Compatible",
    sku: "VG-CH-IP20W-APLUS",
    category: "charger",
    price: 2499,
    compareAtPrice: 3499,
    rating: 4.7,
    reviewCount: 51,
    featured: false,
    badge: "20W Value Pick",
    stockStatus: "in-stock",
    shortDescription:
      "Want faster iPhone charging without original-Apple pricing? This A+ 20W USB-C adapter is the budget-friendly option for compatible iPhones using the correct USB-C charging cable.",
    details: `# Faster Charging Without Original-Apple Pricing

Not everyone wants to spend original-accessory money on a second charger.

The **A+ 20W USB-C Charger for iPhone** is positioned as a more affordable everyday option for customers who want the familiar compact 20W USB-C charger format.

> **The highlight: the budget alternative for your desk, bedroom, office or spare charging setup.**

# Perfect as Your Second Charger

Keep one:

- At your desk
- Beside your bed
- At university
- At work
- Inside your travel bag

Instead of constantly moving your main charger from one place to another.

# Built Around the 20W iPhone Charging Standard

Modern compatible iPhones use USB-C power adapters around the **20W level** for fast charging.

> **20W STYLE • USB-C • COMPACT • BUDGET FRIENDLY**

**Spend less on the spare charger without going back to an old slow USB brick.**

**A+ is a market quality tier — not Apple certification. This is not a genuine Apple product.**`,
    features: [
      "Much more affordable than the genuine Apple adapter",
      "20W-class charging is suited to compatible modern iPhones",
      "USB-C output works with suitable USB-C to Lightning or USB-C cables",
      "Compact format is convenient for everyday carrying",
      "Ideal as a second or backup charger",
      "Useful for home, work, travel and university",
    ],
    specifications: [
      { label: "Product Type", value: "A+ / Compatible Charger" },
      { label: "Intended Use", value: "iPhone Charging" },
      { label: "Advertised Power", value: "20W*" },
      { label: "Output Port", value: "USB-C" },
      { label: "Brand", value: "Generic / Compatible" },
      { label: "Genuine Apple Product", value: "No" },
    ],
    compatibility: [
      "Compatible iPhones with suitable USB-C cable",
      "Everyday / backup charging setups",
      "Home, work, travel and university",
    ],
    inTheBox: ["A+ 20W USB-C Fast Charger for iPhone"],
    image: "/gadget/products/adapter-iphone-aplus-20w.webp",
  },
  {
    name: "A+ 30W USB-C Fast Charger for Google Pixel",
    slug: "google-pixel-30w-aplus-charger",
    brand: "A+ Compatible",
    sku: "VG-CH-PX30W-APLUS",
    category: "charger",
    price: 3499,
    compareAtPrice: 4799,
    rating: 4.6,
    reviewCount: 24,
    featured: false,
    badge: "30W Pixel Value Pick",
    stockStatus: "in-stock",
    shortDescription:
      "A budget-friendly charging option for Pixel users. This A+ 30W USB-C adapter is designed for compatible Pixel phones without the premium price of Google's original charger.",
    details: `# Your Pixel Needs the Right Type of Charger

A Pixel doesn't get its best charging experience simply because a charger has a USB-C hole.

Google recommends **USB Power Delivery**, with **PPS support** being particularly important for the intended fast-charging experience on supported Pixel devices.

> **The highlight: a more affordable Pixel-focused charger for everyday use.**

# Great as a Spare Charger

Keep your original charger at home and use the A+ unit:

- At university
- At the office
- In a travel bag
- Beside your bed
- As an emergency backup

# Know What You're Buying

This is an **A+ compatible product**, not a charger manufactured by Google.

That distinction should be clear on Buy n Try instead of hiding it behind the Google name.

> **30W-CLASS • USB-C • PIXEL COMPATIBLE • BUDGET OPTION**

**Pixel-friendly charging without pretending a copy is original.**`,
    features: [
      "Lower-cost alternative to an original Google adapter",
      "30W-class USB-C design suits modern Pixel charging setups",
      "Useful as a secondary home, office or travel adapter",
      "USB-C output works with compatible C-to-C cables",
      "Compact everyday charging solution",
      "Clear A+ positioning means customers know which quality tier they're purchasing",
    ],
    specifications: [
      { label: "Product Type", value: "A+ / Compatible Pixel Charger" },
      { label: "Advertised Output", value: "30W*" },
      { label: "Connector", value: "USB-C" },
      { label: "Intended Devices", value: "Google Pixel / Compatible USB-C Devices" },
      { label: "Genuine Google Product", value: "No" },
    ],
    compatibility: [
      "Compatible Google Pixel phones",
      "Compatible USB-C devices",
      "Home, office and travel spare charger setups",
    ],
    inTheBox: ["A+ 30W USB-C Fast Charger for Google Pixel"],
    image: "/gadget/products/adapter-google-30w-aplus.webp",
  },
  {
    name: "Google 30W USB-C Power Charger – Original",
    slug: "google-pixel-30w-original-charger",
    brand: "Google",
    sku: "VG-CH-PX30W-ORG",
    category: "charger",
    price: 5999,
    compareAtPrice: 7999,
    rating: 4.9,
    reviewCount: 33,
    featured: true,
    badge: "Original Google • PD + PPS",
    stockStatus: "in-stock",
    shortDescription:
      "Made for the Pixel ecosystem. Google's original 30W USB-C charger uses PD 3.0 + PPS for efficient fast charging across compatible Pixel phones and USB-C devices.",
    details: `# Made for Pixel. Not Just Made to Fit the Port.

The **Original Google 30W USB-C Power Charger** isn't simply another Type-C brick.

It supports **USB Power Delivery 3.0 with PPS**, the charging standard Google recommends for supported Pixel phones.

> **The highlight: genuine Google charging hardware with the proper PD + PPS power profiles.**

# Smart Power Instead of One Fixed Output

The charger provides several negotiated power levels, allowing a compatible device to request the power profile it needs instead of blindly receiving one fixed voltage.

That makes it useful across:

- **Google Pixel phones**
- **Pixel accessories**
- **USB-C tablets**
- **Other USB-C PD-compatible devices**

# Ready for Travel

Its **100–240V input** supports common international mains ranges when paired with the appropriate plug/socket arrangement.

> **30W • PD 3.0 • PPS • ORIGINAL GOOGLE • USB-C**

**If you bought Pixel for the Google experience, this is the charger that completes it.**`,
    features: [
      "Original Google hardware",
      "30W maximum output",
      "USB PD 3.0 + PPS support",
      "Made around Pixel's preferred charging standards",
      "Works with other compatible USB-C devices",
      "100–240V input supports travel-friendly use",
      "Single USB-C design keeps the adapter compact and simple",
    ],
    specifications: [
      { label: "Brand", value: "Google" },
      { label: "Product", value: "30W USB-C Power Charger" },
      { label: "Maximum Power", value: "30W" },
      { label: "Protocol", value: "USB PD 3.0 + PPS" },
      { label: "Port", value: "USB-C" },
      { label: "Input", value: "100–240V, 50/60Hz" },
      { label: "PD Output", value: "20V/1.5A, 15V/2A, 5V/9V at 3A" },
      { label: "PPS", value: "Up to 30W" },
      { label: "Approx. Weight", value: "92g" },
      { label: "Color", value: "White / Clearly White" },
    ],
    compatibility: [
      "Google Pixel phones",
      "Pixel accessories",
      "USB-C tablets",
      "Other USB-C PD-compatible devices",
    ],
    inTheBox: ["Google 30W USB-C Power Charger", "Safety / Warranty Guide"],
    image: "/gadget/products/adapter-google-30w-original.webp",
  },
  {
    name: "Samsung 25W PD Power Adapter EP-T2510 – Original",
    slug: "samsung-25w-original-fast-charger",
    brand: "Samsung",
    sku: "VG-CH-SM25W-ORG",
    category: "charger",
    price: 2899,
    compareAtPrice: 3999,
    rating: 4.8,
    reviewCount: 47,
    featured: true,
    badge: "Original Samsung • 25W SFC",
    stockStatus: "in-stock",
    shortDescription:
      "Get the Super Fast Charging your compatible Galaxy was designed for. Original Samsung EP-T2510 delivers 25W USB-C PD 3.0 PPS charging with Samsung's built-in safety protections.",
    details: `# See “Super Fast Charging” for the Right Reason

The **Original Samsung 25W Power Adapter** supports Samsung's **Super Fast Charging** standard through USB Power Delivery 3.0.

> **The highlight: genuine Samsung 25W PD + PPS charging—not just a charger with a Samsung-looking shell.**

# Made for Modern Galaxy Devices

Connect a compatible USB-C to USB-C cable and supported Galaxy phones can negotiate charging at up to **25W**.

That makes it ideal for:

- Galaxy S devices
- Compatible Galaxy A-series devices
- Galaxy Note models
- Other supported USB-C devices

# Small, Efficient and Protected

Samsung's current EP-T2510 design is slimmer and uses modern power technology, while its protection systems address **overcurrent, short circuit and high-temperature conditions**.

> **25W SFC • PD 3.0 PPS • USB-C • ORIGINAL SAMSUNG**

**The charger to choose when you want your Galaxy charging the way Samsung intended.**`,
    features: [
      "Genuine Samsung hardware",
      "Up to 25W Super Fast Charging on compatible devices",
      "PD 3.0 PPS charging",
      "USB-C output",
      "Safety protection against overcurrent, short circuits and high temperature",
      "Compact modern design",
      "Compatible with a broad range of USB-C devices",
    ],
    specifications: [
      { label: "Brand", value: "Samsung" },
      { label: "Model", value: "EP-T2510" },
      { label: "Power", value: "25W Max" },
      { label: "Fast Charging", value: "Samsung Super Fast Charging" },
      { label: "Protocol", value: "PD 3.0 PPS" },
      { label: "Port", value: "USB Type-C" },
      { label: "Input", value: "100–240V" },
      { label: "Weight", value: "Approx. 51.6g" },
      { label: "Dimensions", value: "38 × 66.9 × 22mm" },
      { label: "Color", value: "Black / variant dependent" },
    ],
    compatibility: [
      "Compatible Galaxy S devices",
      "Compatible Galaxy A-series devices",
      "Galaxy Note models",
      "Other supported USB-C devices",
    ],
    inTheBox: ["Samsung 25W Power Adapter", "Leaflet"],
    image: "/gadget/products/adapter-samsung-25w-original.webp",
  },
  {
    name: "A+ 25W USB-C Fast Charger for Samsung",
    slug: "samsung-25w-aplus-fast-charger",
    brand: "A+ Compatible",
    sku: "VG-CH-SM25W-APLUS",
    category: "charger",
    price: 1499,
    compareAtPrice: 2299,
    rating: 4.6,
    reviewCount: 39,
    featured: false,
    badge: "25W A+ Value Pick",
    stockStatus: "in-stock",
    shortDescription:
      "Want 25W-style Galaxy charging at a lower price? This A+ USB-C adapter is the budget-focused option for compatible Samsung and Type-C devices.",
    details: `# The Affordable Samsung-Charging Option

Not every customer is shopping for the genuine EP-T2510.

The **A+ 25W Charger for Samsung** is aimed at customers who simply want an affordable charger for everyday use.

> **The highlight: lower-cost 25W-style charging for your Galaxy setup.**

# Ideal as a Backup

Keep one:

- At work
- In your travel bag
- At university
- Beside your bed
- As an emergency spare

# Clear Quality Tier

Buy n Try clearly labels this product **A+ / compatible**, rather than calling it an original Samsung charger.

That gives customers a real choice:

**Original Samsung → premium genuine option**
**A+ → more affordable compatible option**

> **25W-CLASS • USB-C • A+ QUALITY • VALUE OPTION**

**A+ is a market quality tier — not Samsung certification.**`,
    features: [
      "More affordable than Samsung's genuine adapter",
      "Compact USB-C charging format",
      "Useful as an everyday or spare charger",
      "Designed for compatible Samsung/Android phones",
      "Available in common 25W-style configurations",
      "Good value for customers who understand it is not genuine Samsung",
    ],
    specifications: [
      { label: "Product Type", value: "A+ Compatible Charger" },
      { label: "Advertised Power", value: "25W*" },
      { label: "Port", value: "USB-C" },
      { label: "Intended Use", value: "Samsung / Compatible USB-C Devices" },
      { label: "Genuine Samsung", value: "No" },
      { label: "Brand", value: "Generic / A+" },
    ],
    compatibility: [
      "Compatible Samsung Galaxy devices",
      "Compatible USB-C Android phones",
      "Everyday and backup charging",
    ],
    inTheBox: ["A+ 25W USB-C Fast Charger for Samsung"],
    image: "/gadget/products/adapter-samsung-25w-aplus.webp",
  },
  {
    name: "ROMOSS AU45T 45W Dual-Port Car Charger – USB-C + USB-A",
    slug: "romoss-45w-dual-port-fast-charger",
    brand: "ROMOSS",
    sku: "VG-CH-RM45W",
    category: "charger",
    price: 3999,
    compareAtPrice: 5499,
    rating: 4.7,
    reviewCount: 22,
    featured: true,
    badge: "45W • USB-C + USB-A",
    stockStatus: "in-stock",
    shortDescription:
      "Turn your car socket into a fast-charging hub. ROMOSS AU45T delivers up to 45W through USB-C and USB-A with PD/QC support in a compact metal body.",
    details: `# Your Drive Time Can Become Charging Time

The **ROMOSS AU45T** turns a standard car power socket into a proper fast-charging source.

With **up to 45W output**, even shorter drives can become useful top-up time for compatible phones and tablets.

> **The highlight: 45W charging from a tiny charger that barely takes up space in the dashboard.**

# USB-C and USB-A Together

You don't have to choose one cable generation.

The AU45T provides:

- **1 × USB-C**
- **1 × USB-A**

That means you can keep a modern USB-C device and an older USB-A cable in the same car setup.

# Built for Cars, Not Desks

It accepts **12–24V vehicle input**, making it suitable for many cars and compatible vehicle power sockets.

Exact documentation lists **PD and QC charging support**, with up to 45W available from supported output configurations.

> **45W • PD + QC • USB-C + USB-A • 12–24V**

**Plug it in once and make every drive part of your charging routine.**

**This is a car charger — not a wall adapter.**`,
    features: [
      "Up to 45W charging for compatible devices",
      "USB-C + USB-A ports handle modern and older cables",
      "Can charge two devices from one car socket",
      "PD and QC support",
      "12–24V vehicle compatibility",
      "Compact metal construction",
      "Approx. 32.5g weight and 43.5 × 26 × 26mm body keep it unobtrusive",
    ],
    specifications: [
      { label: "Brand", value: "ROMOSS" },
      { label: "Model", value: "AU45T" },
      { label: "Type", value: "Car Charger" },
      { label: "Max Power", value: "45W" },
      { label: "USB-C", value: "1" },
      { label: "USB-A", value: "1" },
      { label: "Protocols", value: "PD + QC 3.0" },
      { label: "Vehicle Input", value: "12–24V DC" },
      { label: "Dimensions", value: "Approx. 43.5 × 26 × 26mm" },
      { label: "Weight", value: "Approx. 32.5g" },
      { label: "Color", value: "Silver" },
    ],
    compatibility: [
      "Cars and vehicles with 12–24V sockets",
      "Compatible USB-C phones and tablets",
      "Compatible USB-A devices",
    ],
    inTheBox: ["ROMOSS AU45T Car Charger"],
    image: "/gadget/products/adapter-romoss-45w.webp",
  },
  {
    name: "Magnetic Charging Dock for Samsung Gear S2 / S3",
    slug: "samsung-galaxy-watch-wireless-charger",
    brand: "Compatible",
    sku: "VG-CH-GEAR-DOCK",
    category: "charger",
    price: 2499,
    compareAtPrice: 3499,
    rating: 4.5,
    reviewCount: 18,
    featured: false,
    badge: "Gear Watch Magnetic Dock",
    stockStatus: "in-stock",
    shortDescription:
      "Lost your original Gear charger? This magnetic replacement dock keeps compatible Samsung Gear watches aligned while charging and gives your watch a dedicated bedside or desk charging spot.",
    details: `# Your Watch Needs More Than a Random Wireless Pad

Older Samsung Gear watches use a dedicated watch-charging setup.

This **Magnetic Gear Watch Charging Dock** gives the watch a stable cradle instead of forcing you to balance it on an incompatible wireless pad.

> **The highlight: place the watch on the dock and let the magnetic design keep it positioned for charging.**

# Better for the Bedside or Desk

Instead of leaving the watch face-down beside a loose cable, the charging cradle gives it a fixed place at:

- Your bedside
- Office desk
- Workstation
- Travel setup

# A Practical Replacement

It's especially useful if your original charging dock was:

- Lost
- Damaged
- Left at another location
- Needed as a second charger

> **MAGNETIC DOCK • DEDICATED WATCH CHARGING • COMPACT**

**Drop the watch onto its charger when the day is done.**

**This is a generic compatible replacement dock — not Samsung-manufactured hardware.**`,
    features: [
      "Magnetic alignment helps keep compatible Gear watches positioned",
      "Dedicated cradle is easier to use than generic flat wireless pads",
      "Ideal replacement for a lost original charger",
      "Useful as a second home/office charging station",
      "Compact enough for travel",
      "Common versions include a Micro-USB charging cable",
    ],
    specifications: [
      { label: "Product Type", value: "Replacement Watch Charging Dock" },
      { label: "Charging", value: "Magnetic / Inductive" },
      { label: "Power Connection", value: "Micro-USB on common version" },
      { label: "Color", value: "Black" },
      { label: "Brand", value: "Generic Compatible" },
      { label: "Samsung Original", value: "No" },
    ],
    compatibility: [
      "Samsung Gear S2",
      "Gear S2 Classic",
      "Gear S3 Frontier",
      "Gear S3 Classic",
      "Gear Sport",
    ],
    inTheBox: ["Magnetic Charging Dock", "Micro-USB Charging Cable"],
    image: "/gadget/products/charger-samsung-watch.webp",
  },
  {
    name: "USB-C Magnetic Charger for Apple Watch – Plastic Puck",
    slug: "apple-watch-type-c-magnetic-charger",
    brand: "Compatible",
    sku: "VG-CH-AW-USBC",
    category: "charger",
    price: 1999,
    compareAtPrice: 2799,
    rating: 4.6,
    reviewCount: 29,
    featured: false,
    badge: "Magnetic • USB-C",
    stockStatus: "in-stock",
    shortDescription:
      "A simple spare charger for your Apple Watch setup. Snap the magnetic puck onto a compatible watch and power it from a modern USB-C adapter at home, work or while travelling.",
    details: `# One More Charger Means One Less Thing to Remember

Moving your Apple Watch charger between your bedroom, office and travel bag gets annoying quickly.

This **USB-C Magnetic Apple Watch Charger** is designed as an affordable spare.

> **The highlight: magnetic snap-on convenience with a modern USB-C connection.**

# Let the Magnet Handle the Positioning

Place the puck against the back of a compatible Apple Watch and the magnetic design helps position the watch over the charging area.

No exposed charging pins.

No tiny connector to plug into the watch itself.

# Made for Modern USB-C Setups

The USB-C plug works with compatible USB-C wall adapters, power banks and other suitable power sources.

That makes it easy to keep one charger permanently:

- Beside your bed
- At your desk
- In your travel bag
- At work

> **MAGNETIC • USB-C • COMPACT • SPARE CHARGER**

**Leave one where you actually need it.**

**Compatible plastic replacement charger — not an Original Apple charger. Not advertised as Apple Watch Fast Charging** (Apple's official fast-charge puck uses aluminum around the magnet).`,
    features: [
      "Magnetic puck makes watch placement straightforward",
      "USB-C plug works with modern compatible power adapters",
      "Useful second charger for work or travel",
      "Compact design takes little space in a bag",
      "No exposed charging contacts on the watch connection",
      "Lower-cost alternative to Apple's genuine charging cable",
    ],
    specifications: [
      { label: "Type", value: "Compatible Apple Watch Magnetic Charger" },
      { label: "Connector", value: "USB-C" },
      { label: "Charging", value: "Magnetic Inductive" },
      { label: "Puck Material", value: "Plastic" },
      { label: "Color", value: "White" },
      { label: "Apple Original", value: "No" },
    ],
    compatibility: [
      "Compatible Apple Watch Series / SE / Ultra models according to batch packaging",
    ],
    inTheBox: ["USB-C Magnetic Charger for Apple Watch (Plastic Puck)"],
    image: "/gadget/products/charger-apple-watch-tc.webp",
  },
  {
    name: "C6 4-in-1 120W Retractable Car Charger – Type-C + Lightning",
    slug: "c6-4in1-retractable-car-charger",
    brand: "C6",
    sku: "VG-CH-C6-4IN1",
    category: "charger",
    price: 2299,
    compareAtPrice: 3299,
    rating: 4.8,
    reviewCount: 41,
    featured: true,
    badge: "2 Built-In Cables • 4 Devices",
    stockStatus: "in-stock",
    shortDescription:
      "Stop filling your car with loose charging cables. C6 combines retractable Type-C + Lightning cables, USB-C + USB-A ports and fast charging for up to four devices from one car socket.",
    details: `# Your Car Doesn't Need Another Mess of Cables

One cable for your phone.

Another for your passenger.

Another hidden under the seat.

The **C6 4-in-1 Car Charger** solves that problem by building the most useful charging cables directly into the charger.

> **The highlight: Type-C + Lightning cables retract back into the charger when you're finished.**

# Four Charging Connections from One Socket

The C6 gives you:

- **Built-in retractable Type-C cable**
- **Built-in retractable Lightning cable**
- **USB-C port**
- **USB-A port**

So the driver, front passenger and even people in the back can have more charging options without four adapters filling the dashboard.

# Pull the Cable Out. Let It Retract When You're Done.

The retractable design keeps cables from permanently hanging around the center console.

Comparable C6-style models use cables around **80cm / 31.5 inches**, giving them enough reach for normal front and rear-seat use.

# Built for Cars and SUVs

The documented C6 supports **12–24V vehicle sockets**, making it suitable for many cars, SUVs and other compatible vehicles.

# A Little Visual Upgrade Too

The top also includes a **starry/RGB-style ambient lighting effect**, making the charger more visually interesting during night driving.

> **4-IN-1 • RETRACTABLE CABLES • TYPE-C + LIGHTNING • MARKETED UP TO 120W TOTAL**

# Charge the Phones. Hide the Cables.

The real advantage isn't a giant wattage number.

It's getting into the car, **pulling out the cable that's already there**, charging your phone and letting it disappear again when you're finished.

**Less cable mess. More charging options.**

**“Marketed up to 120W total fast charging” — not each device at 120W.**`,
    features: [
      "Built-in Type-C cable means Android/USB-C users don't need to carry a loose cable",
      "Built-in Lightning cable covers compatible older iPhones and Lightning devices",
      "USB-C + USB-A ports add two more charging connections",
      "Can power up to four devices from one car charger",
      "Retractable cables keep the center console much cleaner",
      "12–24V compatibility suits many cars and SUVs",
      "180° adjustable designs documented on this charger style help fit different dashboards",
      "Starry/RGB top light adds a visual touch at night",
      "Fast-charge protocols are supported on the documented C6 Pakistan variant",
    ],
    specifications: [
      { label: "Model", value: "C6" },
      { label: "Product Type", value: "4-in-1 Retractable Car Charger" },
      { label: "Advertised Total Power", value: "Marketed up to 120W total" },
      { label: "Built-In Cable 1", value: "USB-C" },
      { label: "Built-In Cable 2", value: "Lightning" },
      { label: "Extra Port 1", value: "USB-C" },
      { label: "Extra Port 2", value: "USB-A" },
      { label: "Devices", value: "Up to 4 Simultaneously" },
      { label: "Vehicle Input", value: "12–24V" },
      { label: "Adjustment", value: "Approx. 180° on documented design" },
      { label: "Body", value: "ABS + Metal" },
      { label: "Lighting", value: "Star / RGB Ambient Effect" },
    ],
    compatibility: [
      "iPhones",
      "Samsung Galaxy",
      "Google Pixel",
      "Xiaomi",
      "OPPO",
      "Realme",
      "Infinix",
      "Huawei",
      "Other compatible USB-C/Lightning devices",
    ],
    inTheBox: ["C6 4-in-1 Car Charger with Integrated Cables"],
    image: "/gadget/products/charger-c6-car-4in1.webp",
  },
];
