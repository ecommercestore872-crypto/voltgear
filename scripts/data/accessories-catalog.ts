/**
 * Accessories catalog — Universal Active Stylus Pen researched copy.
 * Lead with multi-device universality, not Apple Pencil alternative.
 * No research citations in customer-facing copy. No battery hours until box check.
 */

export type AccessorySeed = {
  name: string;
  slug: string;
  brand: string;
  sku: string;
  category: "accessories";
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

export const ACCESSORIES_KEEP_SLUGS = ["universal-active-stylus-pen"] as const;

export const ACCESSORIES_DATA: AccessorySeed[] = [
  {
    name: "Universal Active Stylus Pen – iPad, Android, iPhone & Touchscreen",
    slug: "universal-active-stylus-pen",
    brand: "Universal",
    sku: "VG-ACC-STYLUS",
    category: "accessories",
    price: 1999,
    compareAtPrice: 2999,
    rating: 4.7,
    reviewCount: 28,
    featured: true,
    badge: "One Pen • Multiple Screens",
    stockStatus: "in-stock",
    shortDescription:
      "Stop buying a different stylus for every device. This rechargeable Universal Stylus Pen gives you precise pen-like control across compatible iPads, Android devices, iPhones and touchscreen laptops.",
    details: `# One Pen. More Than One Screen.

Your tablet shouldn't need one pen while your phone and touchscreen laptop need another.

The **Universal Active Stylus Pen** is made for people who move between different devices throughout the day, giving you **more precise touchscreen control across compatible capacitive screens** without locking you into one ecosystem.

> **The highlight: One rechargeable stylus for compatible iPad, Android, iPhone and touchscreen devices.**

# Write Instead of Typing Everything

Typing is useful.

But sometimes writing something down is simply faster.

Use the stylus for:

- **Class notes**
- **PDF annotations**
- **Quick reminders**
- **Digital signatures**
- **Handwritten study notes**
- **Document markup**
- **Brainstorming**

Its fine conductive tip gives you more deliberate control than trying to write with your fingertip.

# Draw with More Control

For sketches, diagrams and basic digital artwork, a stylus gives you a much more natural hand position than drawing directly with your finger.

That makes it useful for:

- **Sketching**
- **Diagrams**
- **Canva work**
- **Photo editing**
- **Design ideas**
- **Storyboards**
- **Creative apps**

> **Your finger taps. A stylus lets you point, write and draw.**

# No Bluetooth Setup for Everyday Use

Common versions of this universal active stylus are designed to start working **without Bluetooth pairing** for normal touchscreen interaction.

Turn it on and begin using it with a compatible capacitive screen.

That means:

**No pairing menu. No app installation. No complicated setup.**

# Recharge with USB-C

Instead of replacing disposable batteries, current active versions use a **built-in rechargeable battery with USB Type-C charging**.

So the same modern cable standard already used by many phones and accessories can keep your stylus powered.

# Lightweight Enough for Notes All Day

Common versions use an **aluminum-alloy body** that keeps the pen slim and lightweight while still feeling more substantial than a cheap plastic stylus.

Documented generic versions often weigh around **14–15g**, making the pen easy to keep inside a backpack, tablet sleeve or pencil case.

> **UNIVERSAL COMPATIBILITY • PRECISION TIP • USB-C • NO BLUETOOTH REQUIRED**

# Your Screen Already Does More. Now Control It Better.

The biggest reason to buy this pen isn't one complicated specification.

It's replacing awkward finger input with **a more precise, natural way to write, navigate, sketch and annotate across multiple devices.**

**Pick up the pen. Touch the screen. Start creating.**`,
    features: [
      "One stylus works across multiple compatible touchscreen devices instead of locking you to one brand",
      "Fine conductive tip gives more precise control than using your fingertip",
      "Useful for handwritten notes, PDFs, signatures, diagrams and everyday navigation",
      "Works well for basic sketching, Canva work, photo editing and creative applications",
      "No Bluetooth pairing required for normal operation on common universal versions",
      "USB-C rechargeable design means no disposable batteries",
      "Lightweight aluminum construction stays comfortable during longer note-taking sessions",
      "Suitable for students, office users, creators and anyone using several touchscreen devices",
    ],
    specifications: [
      { label: "Product", value: "Universal Active Stylus Pen" },
      { label: "Type", value: "Active Capacitive Stylus" },
      { label: "Compatibility", value: "Most Compatible Capacitive Touchscreens" },
      {
        label: "Supported Platforms",
        value: "iOS / iPadOS / Android / Windows Touch Devices",
      },
      { label: "Tip", value: "Precision Conductive Tip" },
      { label: "Charging", value: "USB Type-C" },
      { label: "Bluetooth Required", value: "No for Basic Operation" },
      {
        label: "Body",
        value: "Aluminum Alloy + Plastic on common versions",
      },
      { label: "Weight", value: "Approx. 14–15g on common documented variant" },
      { label: "Use", value: "Writing, Drawing, Navigation, Annotation" },
      { label: "Color", value: "White / Black depending stock" },
    ],
    compatibility: [
      "iPads with compatible capacitive screens",
      "iPhones",
      "Android Smartphones",
      "Android Tablets",
      "Windows Touchscreen Laptops",
      "Other Compatible Capacitive Touchscreens",
    ],
    inTheBox: [
      "Universal Active Stylus Pen",
      "USB Type-C Charging Cable",
      "User Manual — if included",
    ],
    image: "/gadget/products/stylus-universal-active.webp",
  },
];
