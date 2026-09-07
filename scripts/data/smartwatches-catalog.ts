/**
 * Smartwatches catalog — researched product copy for Buy n Try.
 * Do not mix similarly named models. No research notes in customer-facing copy.
 * Heart rate / SpO2 / sleep / stress = wellness/fitness estimates only.
 */

export type SmartwatchSeed = {
  name: string;
  slug: string;
  brand: string;
  sku: string;
  category: "smartwatch";
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

export const SMARTWATCHES_KEEP_SLUGS = [
  "series-11-apple-logo-smartwatch",
  "mini-zw-do-10-smartwatch",
  "keloobe-sk-47-smartwatch",
  "a-58-plus-smartwatch",
  "smart-watch-ultra-samsung",
  "howear-5g-hw-10-smartwatch",
  "smart-watch-android-m99",
  "heatz-hw-21-smartwatch",
  "howwear-hw-17-pro-plus-smartwatch",
  "langsfit-m-10-pro-smartwatch",
  "langsfit-l500-pro-smartwatch",
  "langsfit-v20-pro-smartwatch",
  "max005-curved-smartwatch",
  "hx-no1-ultra-thin-amoled-smartwatch",
  "mg300-round-bluetooth-calling-smartwatch",
  "kalobee-gt8-buds-2-in-1-smartwatch",
] as const;

export const SMARTWATCHES_DATA: SmartwatchSeed[] = [
  {
    name: "Series 11 Smartwatch Clone – Apple-Style Logo + AMOLED",
    slug: "series-11-apple-logo-smartwatch",
    brand: "Series 11",
    sku: "VG-SW-S11",
    category: "smartwatch",
    price: 18500,
    compareAtPrice: 24999,
    rating: 4.8,
    reviewCount: 38,
    featured: true,
    badge: "Apple-Style Logo + AMOLED",
    stockStatus: "in-stock",
    shortDescription:
      "Get the familiar premium watch look without genuine Apple Watch pricing. Series 11 combines an Apple-style startup logo, bright AMOLED display, Bluetooth calling and multiple smart features in a metal-body design.",
    details: `# Turn It On. The Experience Starts with the Logo.

The **Series 11 Smartwatch Clone** is made for customers who want the visual feel of a premium Apple-style watch without stepping into genuine Apple Watch pricing.

Its most eye-catching feature appears immediately: an **Apple-style startup logo**, followed by a large edge-to-edge smartwatch interface.

> **The highlight: Premium Apple-inspired styling + startup logo + AMOLED display.**

# A Screen Made to Be Seen

The documented variant uses a **large AMOLED full-touch display with Always-On Display support**, giving watch faces, calls and notifications a much richer appearance than basic LCD watches.

# Take Calls from Your Wrist

With a built-in microphone and speaker, **Bluetooth Calling** lets you answer or place supported calls after pairing the watch with your phone.

Use it while driving, walking, working or whenever reaching for the phone is inconvenient.

# Change the Look Without Changing the Watch

Common packages include **two interchangeable straps**, letting you switch the style depending on your outfit or activity.

> **AMOLED • APPLE-STYLE BOOT LOGO • BLUETOOTH CALLING • DUAL STRAPS**

**The appeal is simple: premium-looking smartwatch style at a much lower entry price.**

*Replica/clone smartwatch. Not manufactured, licensed or endorsed by Apple.*`,
    features: [
      "Apple-style startup logo gives the watch its strongest visual hook",
      "AMOLED display makes watch faces and menus look richer",
      "Bluetooth calling lets you handle supported calls from your wrist",
      "Always-On Display keeps important information visible",
      "Multiple straps let you change the look",
      "Works with compatible Android and iPhone devices",
    ],
    specifications: [
      { label: "Product Type", value: "Series 11 Clone Smartwatch" },
      { label: "Case Style", value: "Approx. 46mm Apple-Inspired" },
      { label: "Display", value: "AMOLED on documented variant" },
      { label: "Always-On Display", value: "Supported" },
      { label: "Bluetooth Calling", value: "Yes" },
      { label: "Speaker / Mic", value: "Built-In" },
      { label: "Charging", value: "Magnetic / Wireless-Style Charger" },
      { label: "Battery", value: "Approx. 1–2 days advertised" },
      { label: "Compatibility", value: "Android + iOS" },
      { label: "Genuine Apple Product", value: "No" },
    ],
    compatibility: [
      "Android smartphones",
      "iPhones",
      "Tablets with Bluetooth",
      "Other compatible Bluetooth devices",
    ],
    inTheBox: [
      "Series 11 Smartwatch",
      "2 × Straps",
      "Magnetic Charging Cable",
      "User Manual",
    ],
    image: "/gadget/products/smartwatch-series11-apple-logo.png",
  },
  {
    name: "MiNi ZW10 DO Diamond 2-in-1 Ladies Smartwatch Set",
    slug: "mini-zw-do-10-smartwatch",
    brand: "MiNi",
    sku: "VG-SW-ZWDO10",
    category: "smartwatch",
    price: 4999,
    compareAtPrice: 6999,
    rating: 4.7,
    reviewCount: 24,
    featured: true,
    badge: "Smart Watch + Diamond Watch",
    stockStatus: "in-stock",
    shortDescription:
      "Why choose between smart and elegant? MiNi ZW10 DO combines a touchscreen smartwatch with a sparkling diamond-style analog watch, giving you two looks in one gift-ready set.",
    details: `# One Box. Two Completely Different Looks.

The **MiNi ZW10 DO** is not just another smartwatch.

Its biggest advantage is the **2-in-1 concept**: a modern touchscreen smartwatch for connected everyday use plus a **diamond-accented luxury analog watch** for occasions where you want something more traditional.

> **The highlight: Smartwatch for the day. Elegant diamond-style watch for the outfit.**

# Made to Feel Like a Gift

The jewelry-inspired styling makes the ZW10 especially appealing for birthdays, Eid, anniversaries and personal gifting.

It feels more complete than handing someone a plain smartwatch box.

# Stay Connected Without Losing the Style

The smartwatch side supports **Bluetooth calling, notifications, activity tracking and customizable watch faces**.

Pair it with a compatible iPhone or Android device and keep important phone information closer to your wrist.

# More Than Just Steps

The documented version includes wellness and activity functions such as **heart-rate, SpO₂, sleep, step and sports tracking** presented as general wellness and fitness estimates.

> **2-IN-1 • DIAMOND STYLE • BLUETOOTH CALLS • LADIES GIFT SET**

**One for the smart features. One for when the outfit deserves something special.**`,
    features: [
      "Two watches make the package feel substantially more valuable",
      "Diamond-style analog watch creates a strong gifting angle",
      "Bluetooth calling keeps the smartwatch useful every day",
      "Custom watch faces let you personalize the digital side",
      "Fitness and activity tracking adds everyday functionality",
      "iPhone and Android compatibility",
      "SOS feature advertised on documented listing",
    ],
    specifications: [
      { label: "Model", value: "MiNi ZW10 DO" },
      { label: "Product Type", value: "2-in-1 Ladies Watch Set" },
      { label: "Smartwatch Display", value: "1.78″ HD claimed on exact DO listing" },
      { label: "Bluetooth Calling", value: "Yes" },
      { label: "Sports Modes", value: "10+ advertised" },
      { label: "Water Resistance", value: "IP67 advertised" },
      { label: "Compatibility", value: "Android + iOS" },
      { label: "Charging", value: "Magnetic" },
      { label: "Safety Feature", value: "SOS advertised" },
    ],
    compatibility: [
      "Android smartphones",
      "iPhones",
      "Tablets with Bluetooth",
    ],
    inTheBox: [
      "MiNi ZW10 DO Smartwatch",
      "Diamond-Style Analog Watch",
      "Smartwatch Strap",
      "Magnetic Charger",
      "Documentation",
    ],
    image: "/gadget/products/smartwatch-mini-zw-do10.png",
  },
  {
    name: "KALOBEE SK42 Round AMOLED Calling Smartwatch",
    slug: "keloobe-sk-47-smartwatch",
    brand: "KALOBEE",
    sku: "VG-SW-SK47",
    category: "smartwatch",
    price: 6499,
    compareAtPrice: 8999,
    rating: 4.6,
    reviewCount: 19,
    featured: false,
    badge: "Round AMOLED Premium",
    stockStatus: "in-stock",
    shortDescription:
      "Prefer a watch that still looks like a watch? KALOBEE SK42 combines a premium round AMOLED display, Bluetooth calling, voice-assistant support and everyday wellness tracking.",
    details: `# Smart Features Without the Square-Tech Look

The **KALOBEE SK42** is built for customers who want smartwatch functionality but still prefer the appearance of a classic round wristwatch.

Its **AMOLED round display** gives the screen deeper blacks and richer watch faces while the metal-style body keeps the design suitable for both casual and formal wear.

> **The highlight: premium round-watch styling with a proper AMOLED display.**

# Calls Without Reaching for Your Phone

After Bluetooth pairing, supported calls can be handled from the watch using the integrated speaker and microphone.

# Make the Dial Match Your Style

The SK42 supports downloadable/custom watch faces through **FitCloudPro**, allowing the watch to look sporty one day and more traditional the next.

# Useful Everyday Tracking

The watch provides activity tracking plus heart-rate, SpO₂ and sleep-related **wellness and fitness estimates**, alongside notifications and sports modes.

> **ROUND AMOLED • BLUETOOTH CALLS • VOICE ASSISTANT • CUSTOM FACES**

**For customers who want smart features without wearing another square screen on their wrist.**`,
    features: [
      "Premium round AMOLED display stands out from square clone watches",
      "Bluetooth calling with built-in speaker and microphone",
      "Voice assistant support for quick hands-free actions",
      "FitCloudPro companion app for watch faces and sync",
      "Everyday activity and wellness/fitness estimate tracking",
      "Magnetic charging",
      "Android 5.0+ and iOS 10.0+ compatibility",
    ],
    specifications: [
      { label: "Brand", value: "KALOBEE" },
      { label: "Model", value: "SK42" },
      { label: "Display", value: "AMOLED" },
      { label: "Form", value: "Round" },
      { label: "Bluetooth Calling", value: "Yes" },
      { label: "Bluetooth", value: "5.0 listed" },
      { label: "Voice Assistant", value: "Yes" },
      { label: "Companion App", value: "FitCloudPro" },
      { label: "Compatibility", value: "Android 5.0+ / iOS 10.0+" },
      { label: "Charging", value: "Magnetic" },
    ],
    compatibility: [
      "Android 5.0+",
      "iOS 10.0+",
      "FitCloudPro-compatible phones",
    ],
    inTheBox: [
      "KALOBEE SK42 Smartwatch",
      "Strap",
      "Magnetic Charging Cable",
      "User Documentation",
    ],
    image: "/gadget/products/smartwatch-keloobe-sk47.png",
  },
  {
    name: "A58 Plus 49mm Bluetooth Calling Smartwatch",
    slug: "a-58-plus-smartwatch",
    brand: "A58",
    sku: "VG-SW-A58P",
    category: "smartwatch",
    price: 5499,
    compareAtPrice: 7999,
    rating: 4.7,
    reviewCount: 42,
    featured: false,
    badge: "49MM + 5–7 Day Battery",
    stockStatus: "in-stock",
    shortDescription:
      "Big screen, Bluetooth calls and less frequent charging. A58 Plus combines a 49mm display, activity tracking and up to 5–7 days advertised battery life at an accessible price.",
    details: `# More Screen Makes a Smartwatch Easier to Use

The **A58 Plus** gives you a large **49mm watch format**, making notifications, watch faces and controls easier to read than on smaller budget watches.

> **The highlight: big-display smartwatch convenience without big-watch pricing.**

# Take Calls from Your Wrist

Bluetooth calling lets you answer supported calls through the watch once connected to your smartphone.

# Charge Less Often

The current listing advertises approximately **5–7 days of battery life**, although real-world time depends heavily on call use, screen brightness and notification frequency.

# Keep the Basics on Your Wrist

Activity features include steps, calories, sleep and heart-rate/SpO₂-style **wellness and fitness estimates** alongside multiple sports modes.

> **49MM • BLUETOOTH CALLING • 5–7 DAY CLAIM • ANDROID + iOS**

**Large enough to feel useful, affordable enough to be an easy first smartwatch.**`,
    features: [
      "49mm format makes the screen easier to read day to day",
      "Bluetooth 5.0 with Bluetooth calling support",
      "Up to 5–7 days advertised battery life",
      "Multiple sports modes for everyday activity tracking",
      "Wellness/fitness estimates including heart rate and SpO₂-style readings",
      "Works with Android and iOS phones",
      "No SIM required — pairs with your phone",
    ],
    specifications: [
      { label: "Model", value: "A58 Plus" },
      { label: "Display Size", value: "49mm" },
      { label: "Screen Type", value: "IPS" },
      { label: "Resolution", value: "320 × 240 listed" },
      { label: "Bluetooth", value: "5.0" },
      { label: "Bluetooth Calling", value: "Yes" },
      { label: "Battery Life", value: "5–7 days advertised" },
      { label: "Sports Modes", value: "Multiple" },
      { label: "Compatibility", value: "Android + iOS" },
      { label: "SIM", value: "No" },
    ],
    compatibility: [
      "Android smartphones",
      "iPhones",
      "Tablets with Bluetooth",
    ],
    inTheBox: [
      "A58 Plus Smartwatch",
      "Strap",
      "Charging Cable",
      "User Documentation",
    ],
    image: "/gadget/products/smartwatch-a58-plus.png",
  },
  {
    name: "Watch Ultra 7-Strap Smartwatch – Samsung-Style Design",
    slug: "smart-watch-ultra-samsung",
    brand: "Ultra Style",
    sku: "VG-SW-ULTRA-S",
    category: "smartwatch",
    price: 24999,
    compareAtPrice: 32999,
    rating: 4.8,
    reviewCount: 56,
    featured: true,
    badge: "7 Straps • Ultra Style",
    stockStatus: "in-stock",
    shortDescription:
      "One watch, seven different looks. This Samsung Ultra-inspired smartwatch bundle gives you multiple straps, Bluetooth smart features and a bold rugged-style design without genuine Galaxy Watch Ultra pricing.",
    details: `# Change the Watch Without Changing the Watch

The main reason to buy this **Ultra-style smartwatch bundle** is simple:

**seven interchangeable straps.**

One watch can look sporty, casual or completely different depending on the band you choose.

> **The highlight: 7 straps in one box.**

# Inspired by the Galaxy Watch Ultra Look

The bold round/cushion-style appearance is aimed at customers who like Samsung's rugged Ultra design but are shopping in the budget smartwatch category.

# Everyday Smart Features

Generic versions are sold with Bluetooth connectivity, phone notifications, fitness tracking and Android/iOS compatibility.

Wellness readings such as heart rate, SpO₂ and sleep are presented as **general wellness and fitness estimates**.

> **ULTRA LOOK • 7 STRAPS • BLUETOOTH • FITNESS FEATURES**

**The real value isn't pretending it's Samsung—the value is getting the Ultra-inspired look plus a whole strap collection.**

*Generic/replica smartwatch. Not a genuine Samsung Galaxy Watch Ultra.*`,
    features: [
      "Seven interchangeable straps in one documented bundle",
      "Bold Ultra-inspired cushion/round design language",
      "Bluetooth connectivity for notifications and smart features",
      "Everyday activity and wellness/fitness estimate tracking",
      "Compatible with Android and iOS phones",
      "Not a genuine Samsung Galaxy Watch Ultra",
    ],
    specifications: [
      { label: "Product Type", value: "Generic Ultra-Style Smartwatch" },
      { label: "Design", value: "Samsung Galaxy Watch Ultra Inspired" },
      { label: "Straps", value: "7 on documented bundle" },
      { label: "Connectivity", value: "Bluetooth" },
      { label: "GPS", value: "Not verified" },
      { label: "Compatibility", value: "Android + iOS" },
      { label: "Genuine Samsung", value: "No" },
    ],
    compatibility: [
      "Android smartphones",
      "iPhones",
      "Tablets with Bluetooth",
    ],
    inTheBox: [
      "Watch Ultra Style Smartwatch",
      "7 × Interchangeable Straps",
      "Charging Cable",
      "User Documentation",
    ],
    image: "/gadget/products/smartwatch-ultra-samsung.png",
  },
  {
    name: "HOWEAR HW10 AMOLED Smartwatch – ChatGPT + Bluetooth Calling",
    slug: "howear-5g-hw-10-smartwatch",
    brand: "HOWEAR",
    sku: "VG-SW-HW10",
    category: "smartwatch",
    price: 8999,
    compareAtPrice: 11999,
    rating: 4.5,
    reviewCount: 15,
    featured: false,
    badge: "AMOLED + ChatGPT",
    stockStatus: "in-stock",
    shortDescription:
      "More than a notification watch. HOWEAR HW10 combines a bright AMOLED display, Bluetooth calling, voice-assistant/ChatGPT functions and everyday wellness tracking in a premium Ultra-style body.",
    details: `# A Smartwatch That Does More Than Count Steps

The **HOWEAR HW10** stands out because it combines the normal smartwatch basics with **AI/ChatGPT-style voice functionality** on supported variants.

> **The highlight: AMOLED screen + calls + AI assistant features.**

# Take Calls Directly from the Watch

Its built-in speaker and microphone support Bluetooth calls after pairing.

# AMOLED Makes the Interface Look Better

Exact HW10 Pro2/Ultra2 variants use **large AMOLED displays**, improving contrast and color compared with cheap TFT screens.

# Everyday Smart Functions

Current listings include notifications, music control, camera control, weather, voice assistant and wellness tracking such as heart rate, SpO₂ and sleep as **general wellness and fitness estimates**.

> **AMOLED • BT CALLING • CHATGPT • VOICE ASSISTANT**

**A better fit for customers who want their budget smartwatch to feel more interactive.**`,
    features: [
      "AMOLED display for richer watch faces and menus",
      "Bluetooth calling with built-in speaker and mic",
      "ChatGPT / AI features on documented variants",
      "Voice assistant support",
      "NFC supported on Pro2 variants",
      "IP67 water resistance on documented variants",
      "Android and iOS compatibility",
    ],
    specifications: [
      { label: "Brand", value: "HOWEAR" },
      { label: "Series", value: "HW10" },
      { label: "Display", value: "AMOLED" },
      { label: "Bluetooth Calling", value: "Yes" },
      { label: "ChatGPT / AI", value: "Supported on documented variants" },
      { label: "Voice Assistant", value: "Yes" },
      { label: "NFC", value: "Supported on Pro2" },
      { label: "Water Resistance", value: "IP67 on documented variants" },
      { label: "Compatibility", value: "Android + iOS" },
      { label: "Cellular 5G", value: "Not verified" },
    ],
    compatibility: [
      "Android smartphones",
      "iPhones",
      "Tablets with Bluetooth",
    ],
    inTheBox: [
      "HOWEAR HW10 Smartwatch",
      "Strap",
      "Charging Cable",
      "User Documentation",
    ],
    image: "/gadget/products/smartwatch-howear-5g-hw10.png",
  },
  {
    name: "M99 Android SIM Smartwatch – Rotating Camera + 4G",
    slug: "smart-watch-android-m99",
    brand: "M99",
    sku: "VG-SW-M99",
    category: "smartwatch",
    price: 16999,
    compareAtPrice: 21999,
    rating: 4.8,
    reviewCount: 31,
    featured: true,
    badge: "Android Watch + SIM + Camera",
    stockStatus: "in-stock",
    shortDescription:
      "More mini-phone than ordinary smartwatch. M99 runs Android with Nano-SIM connectivity, Wi-Fi, GPS, app support and a rotating camera so it can work far more independently from your phone.",
    details: `# This Watch Doesn't Need Your Phone for Everything

Most smartwatches become very limited once the paired phone is out of range.

The **M99 Android Smartwatch** is different because it runs a full Android-based system and supports a **Nano-SIM**.

> **The highlight: Put a SIM in the watch and use it much more like a tiny phone.**

# Apps Right on Your Wrist

The M99 can use an app market / Google-style app environment depending on variant, allowing supported Android apps to run directly on the watch.

# A Camera Built Into the Watch

The standout hardware feature is the **pull-out rotating camera**, letting you take photos or video directly from the watch.

# Wi-Fi + GPS + Cellular

The documented version includes **4G, Wi-Fi and GPS**, allowing much more standalone functionality than ordinary Bluetooth-only watches.

> **ANDROID 10 • NANO SIM • ROTATING CAMERA • GPS • Wi-Fi**

# Built for the Person Who Wants the Most Features

The M99 is bulky compared with a simple fitness watch—but that is because it is trying to do much more.

**Calls, apps, internet and camera—all from the wrist.**`,
    features: [
      "Runs Android 10 for more independent wrist computing",
      "Nano-SIM slot with documented 4G connectivity",
      "2.4″ AMOLED display at 720 × 720 on documented variant",
      "Rotating / pull-out camera — 8MP on detailed variant",
      "Wi-Fi plus GPS / BeiDou / GLONASS / AGPS listed",
      "Bluetooth 4.2 connectivity",
      "2100mAh battery on detailed variant",
    ],
    specifications: [
      { label: "Model", value: "M99" },
      { label: "OS", value: "Android 10" },
      { label: "Display", value: "2.4″ AMOLED" },
      { label: "Resolution", value: "720 × 720 on documented variant" },
      { label: "SIM", value: "Nano-SIM" },
      { label: "Network", value: "4G Full Netcom documented" },
      { label: "Camera", value: "Rotating / Pull-Out, 8MP on detailed variant" },
      { label: "Wi-Fi", value: "Yes" },
      { label: "GPS", value: "GPS / BeiDou / GLONASS / AGPS listed" },
      { label: "Bluetooth", value: "4.2" },
      { label: "Battery", value: "2100mAh on detailed variant" },
    ],
    compatibility: [
      "Standalone Android OS with Nano-SIM",
      "Pairs / syncs with Android phones",
      "Pairs / syncs with iPhones where supported",
    ],
    inTheBox: [
      "M99 Android Smartwatch",
      "Strap",
      "Magnetic Charging Cable",
      "SIM Slot Tool",
      "User Documentation",
    ],
    image: "/gadget/products/smartwatch-android-m99.png",
  },
  {
    name: "HEATZ HW21 1.43″ AMOLED Smartwatch – Rotating Bezel",
    slug: "heatz-hw-21-smartwatch",
    brand: "HEATZ",
    sku: "VG-SW-HW21",
    category: "smartwatch",
    price: 4499,
    compareAtPrice: 5999,
    rating: 4.7,
    reviewCount: 27,
    featured: true,
    badge: "Rotating Bezel + AMOLED",
    stockStatus: "in-stock",
    shortDescription:
      "Control the watch with more than just swipes. HEATZ HW21 combines a 1.43″ AMOLED screen, physical rotating bezel, Always-On Display and up to 5–7 days of advertised use.",
    details: `# Sometimes a Physical Control Just Feels Better

Touchscreens are convenient, but endlessly swiping through tiny menus is not always ideal.

The **HEATZ HW21** adds a **rotating bezel**, letting you navigate supported watch functions with a tactile twist.

> **The highlight: Physical rotating bezel around a bright round AMOLED screen.**

# Rich AMOLED Visuals

The 1.43″ AMOLED display provides deeper blacks, richer colors and Always-On functionality.

# Less Charging, More Wearing

HEATZ advertises around **5–7 days of typical use and 15–20 days standby**.

# Wellness and Sleep Tracking

Built-in sensors support heart-rate, SpO₂ and sleep-related tracking as **general wellness and fitness estimates** for everyday awareness.

> **1.43″ AMOLED • ROTATING BEZEL • AOD • 5–7 DAYS**

**It looks more like a traditional watch because you can actually interact with the bezel.**`,
    features: [
      "Physical rotating bezel for tactile navigation",
      "1.43″ AMOLED full-touch display",
      "Always-On Display support",
      "Zinc alloy case construction",
      "5–7 days typical use / 15–20 days standby advertised",
      "Customizable watch faces",
      "Wellness/fitness estimate tracking for heart rate, SpO₂ and sleep",
    ],
    specifications: [
      { label: "Brand", value: "HEATZ" },
      { label: "Model", value: "HW21" },
      { label: "Display", value: "1.43″ AMOLED" },
      { label: "Always-On", value: "Yes" },
      { label: "Navigation", value: "Rotating Bezel + Touch" },
      { label: "Case", value: "Zinc Alloy" },
      { label: "Battery", value: "5–7 days normal use advertised" },
      { label: "Standby", value: "15–20 days advertised" },
      { label: "Watch Faces", value: "Customizable" },
    ],
    compatibility: [
      "Android smartphones",
      "iPhones",
      "Tablets with Bluetooth",
    ],
    inTheBox: [
      "HEATZ HW21 Smartwatch",
      "Strap",
      "Magnetic Charging Dock",
      "User Documentation",
    ],
    image: "/gadget/products/smartwatch-heatz-hw21.png",
  },
  {
    name: "HW17 PRO+ AMOLED Calling Smartwatch – ChatGPT + 400mAh",
    slug: "howwear-hw-17-pro-plus-smartwatch",
    brand: "HW17",
    sku: "VG-SW-HW17PP",
    category: "smartwatch",
    price: 7999,
    compareAtPrice: 10999,
    rating: 4.6,
    reviewCount: 22,
    featured: false,
    badge: "AMOLED + 400mAh",
    stockStatus: "in-stock",
    shortDescription:
      "A bright AMOLED smartwatch built for longer everyday use. HW17 PRO+ combines a 1.46″ display, Bluetooth calling, AI/voice functions and a large 400mAh advertised battery.",
    details: `# Bright Screen. Bigger Battery.

The **HW17 PRO+** focuses on two things customers immediately understand:

**a vibrant AMOLED screen and a 400mAh battery.**

> **The highlight: 1.46″ AMOLED + 400mAh battery in a round smartwatch design.**

# Calls from the Wrist

Built-in Bluetooth calling lets you answer supported calls through the watch.

# AI Features on Newer Versions

Current HW17 PRO+ supplier listings advertise **voice assistant and ChatGPT functionality**, giving the watch a more interactive feel.

# Sport and Wellness Functions

It also includes activity tracking, notifications and common heart-rate/sleep-style **wellness and fitness estimates**.

> **AMOLED • BT CALLING • CHATGPT • 400mAh**

**AMOLED screen and a 400mAh battery at budget-watch money.**`,
    features: [
      "1.46″ AMOLED display for richer everyday visuals",
      "Bluetooth calling with built-in speaker and mic",
      "ChatGPT / AI advertised on current variants",
      "Voice assistant support",
      "400mAh advertised battery capacity",
      "IP67 water resistance advertised",
      "OEM branding — verify the physical box on arrival",
    ],
    specifications: [
      { label: "Model", value: "HW17 PRO+" },
      { label: "Display", value: "1.46″ AMOLED" },
      { label: "Bluetooth Calling", value: "Yes" },
      { label: "AI / ChatGPT", value: "Advertised on current variant" },
      { label: "Voice Assistant", value: "Yes" },
      { label: "Battery", value: "400mAh advertised" },
      { label: "Water Resistance", value: "IP67 advertised" },
      { label: "Brand", value: "OEM / Verify Physical Box" },
    ],
    compatibility: [
      "Android smartphones",
      "iPhones",
      "Tablets with Bluetooth",
    ],
    inTheBox: [
      "HW17 PRO+ Smartwatch",
      "Strap",
      "Magnetic Charger",
      "User Documentation",
    ],
    image: "/gadget/products/smartwatch-howwear-hw17-pro-plus.png",
  },
  {
    name: "Langsfit M10 Pro Ladies Smartwatch – Metal + Silicone Straps",
    slug: "langsfit-m-10-pro-smartwatch",
    brand: "Langsfit",
    sku: "VG-SW-M10P",
    category: "smartwatch",
    price: 9499,
    compareAtPrice: 12999,
    rating: 4.7,
    reviewCount: 18,
    featured: false,
    badge: "2 Looks in 1 Watch",
    stockStatus: "in-stock",
    shortDescription:
      "Office-ready metal bracelet or comfortable silicone strap—you choose. Langsfit M10 Pro combines elegant round styling, smart notifications and fitness functions in a women-focused design.",
    details: `# From Formal to Casual in Seconds

The strongest feature of the **Langsfit M10 Pro** isn't another sensor.

It's the fact that the watch can completely change personality depending on the strap.

> **The highlight: Metal strap for the outfit. Silicone strap for everyday use.**

# Designed More Like Jewelry

The round case and decorative finish give the M10 Pro a more traditional ladies-watch look than square Ultra-style smartwatches.

# Smart When You Need It

After Bluetooth pairing you can receive supported notifications and access music control, remote camera functions, steps and basic fitness features.

Wellness readings are **general wellness and fitness estimates**, not medical measurements.

> **ROUND DESIGN • DUAL STRAPS • SMART NOTIFICATIONS • FITNESS**

**One smartwatch that doesn't force you to wear the same style every day.**`,
    features: [
      "Round ladies-focused design with jewelry-inspired styling",
      "Metal and silicone straps for two distinct looks",
      "Bluetooth connectivity for notifications and music control",
      "Everyday steps and fitness tracking",
      "Wellness/fitness estimate readings",
      "Android and iOS compatibility",
    ],
    specifications: [
      { label: "Brand", value: "Langsfit" },
      { label: "Model", value: "M10 Pro" },
      { label: "Design", value: "Round Ladies Smartwatch" },
      { label: "Connectivity", value: "Bluetooth" },
      { label: "Mobile Network", value: "No" },
      { label: "GPS", value: "No verified standalone GPS" },
      { label: "NFC", value: "No on stronger retail listing" },
      { label: "Compatibility", value: "Android + iOS" },
      { label: "Straps", value: "Metal + Silicone on common package" },
    ],
    compatibility: [
      "Android smartphones",
      "iPhones",
      "Tablets with Bluetooth",
    ],
    inTheBox: [
      "Langsfit M10 Pro Smartwatch",
      "Metal Strap",
      "Silicone Strap",
      "Charging Cable",
      "User Documentation",
    ],
    image: "/gadget/products/smartwatch-langsfit-m10-pro.png",
  },
  {
    name: "Langsfit L500 Pro 2.1″ Round Calling Smartwatch – Dual Straps",
    slug: "langsfit-l500-pro-smartwatch",
    brand: "Langsfit",
    sku: "VG-SW-L500P",
    category: "smartwatch",
    price: 8499,
    compareAtPrice: 11499,
    rating: 4.6,
    reviewCount: 16,
    featured: false,
    badge: "2.1″ Round + Dual Straps",
    stockStatus: "in-stock",
    shortDescription:
      "Big round display, Bluetooth calls and two different strap styles. Langsfit L500 Pro moves easily between office, casual and fitness use without changing watches.",
    details: `# One Watch for Work and the Weekend

The **L500 Pro** combines a large round screen with a **metal strap and silicone strap** on commonly sold bundles.

> **The highlight: change from formal metal to comfortable sport styling in seconds.**

# A Big Curved Display

A detailed exact variant lists a **2.1″ curved full-touch screen**, giving the watch a strong wrist presence and easy-to-read interface.

# Call Straight from the Watch

Bluetooth Calling lets you make or receive supported calls while paired with your smartphone.

# Everyday Smart Controls

Notifications, music control, camera control, watch faces, sports and basic wellness functions round out the everyday feature set.

Heart-rate and similar readings are **wellness and fitness estimates**.

> **2.1″ DISPLAY • BT CALLING • METAL + SILICONE • ROUND DESIGN**

**Same watch. Completely different look.**`,
    features: [
      "Up to 2.1″ curved round display on documented variant",
      "Bluetooth calling for supported phone conversations",
      "Music control and sports modes",
      "Metal and silicone dual-strap package",
      "300mAh battery on detailed variant",
      "Magnetic charging",
      "Wellness/fitness estimate tracking",
    ],
    specifications: [
      { label: "Brand", value: "Langsfit" },
      { label: "Model", value: "L500 Pro" },
      { label: "Display", value: "Up to 2.1″ curved on documented variant" },
      { label: "Bluetooth Calling", value: "Yes" },
      { label: "Music Control", value: "Yes" },
      { label: "Sports Modes", value: "Yes" },
      { label: "Battery", value: "300mAh on detailed variant" },
      { label: "Charging", value: "Magnetic" },
      { label: "Straps", value: "Metal + Silicone" },
    ],
    compatibility: [
      "Android smartphones",
      "iPhones",
      "Tablets with Bluetooth",
    ],
    inTheBox: [
      "Langsfit L500 Pro Smartwatch",
      "Metal Strap",
      "Silicone Strap",
      "Magnetic USB Charger",
      "User Documentation",
    ],
    image: "/gadget/products/smartwatch-langsfit-l500-pro.png",
  },
  {
    name: "Langsfit V20 Pro 2.09″ AMOLED Smartwatch – NFC + Calling",
    slug: "langsfit-v20-pro-smartwatch",
    brand: "Langsfit",
    sku: "VG-SW-V20P",
    category: "smartwatch",
    price: 7499,
    compareAtPrice: 9999,
    rating: 4.7,
    reviewCount: 12,
    featured: false,
    badge: "2.09″ AMOLED + NFC",
    stockStatus: "in-stock",
    shortDescription:
      "Big AMOLED visuals meet everyday connectivity. Langsfit V20 Pro combines a 2.09″ curved AMOLED display, Bluetooth calling, NFC functions and activity tracking.",
    details: `# The Screen Is the First Thing You'll Notice

The **Langsfit V20 Pro** is built around a large **2.09″ curved AMOLED display**.

That extra screen space gives watch faces, calls and menus much stronger visual impact.

> **The highlight: oversized curved AMOLED screen at a budget-smartwatch price.**

# Calls from Your Wrist

Bluetooth calling gives you quick access to supported phone conversations after pairing.

# NFC and Everyday Tools

The documented variant includes **NFC functionality**, alongside notifications, alarms, music, remote camera control and fitness functions.

Wellness readings are **general wellness and fitness estimates**.

> **2.09″ AMOLED • NFC • BT CALLING • BT 5.3**

**Buy this one for the screen first—the smart features come with it.**`,
    features: [
      "2.09″ curved AMOLED display for strong visual impact",
      "Bluetooth 5.3 + BT 3.0 dual-mode connectivity",
      "Bluetooth calling support",
      "NFC on the documented variant",
      "210mAh battery",
      "CO-FIT companion app (variant dependent)",
      "Android 5.0+ / iOS 10.0+ compatibility",
    ],
    specifications: [
      { label: "Brand", value: "Langsfit" },
      { label: "Model", value: "V20 Pro" },
      { label: "Display", value: "2.09″ Curved AMOLED" },
      { label: "Resolution", value: "240 × 296 listed" },
      { label: "Bluetooth", value: "BT5.3 + BT3.0" },
      { label: "Bluetooth Calling", value: "Yes" },
      { label: "NFC", value: "Yes" },
      { label: "Battery", value: "210mAh" },
      { label: "App", value: "CO-FIT / variant dependent" },
      { label: "Compatibility", value: "Android 5.0+ / iOS 10.0+" },
      { label: "Standalone GPS", value: "Not verified" },
    ],
    compatibility: [
      "Android 5.0+",
      "iOS 10.0+",
      "CO-FIT compatible phones",
    ],
    inTheBox: [
      "Langsfit V20 Pro Smartwatch",
      "Strap",
      "Charging Cable",
      "User Documentation",
    ],
    image: "/gadget/products/smartwatch-langsfit-v20-pro.webp",
  },
  {
    name: "Max005 Curved Display Bluetooth Calling Smartwatch – Dual Straps",
    slug: "max005-curved-smartwatch",
    brand: "Max005",
    sku: "VG-SW-MAX005",
    category: "smartwatch",
    price: 3999,
    compareAtPrice: 5499,
    rating: 4.5,
    reviewCount: 14,
    featured: false,
    badge: "Curved Edge Display",
    stockStatus: "in-stock",
    shortDescription:
      "Flat smartwatch screens are everywhere. Max005 stands out with a distinctive curved-edge display, metal-body styling, Bluetooth calling and two interchangeable straps.",
    details: `# The Curve Is the Reason to Look Twice

The **Max005** has a screen shape that immediately separates it from ordinary flat-faced budget watches.

The curved edge gives watch faces and menus a more flowing, modern appearance.

> **The highlight: curved display design that looks different before you even open a menu.**

# Full-Metal Styling

Current exact listings pair the curved dial with a **metal-body appearance**, making the Max005 feel more premium than basic plastic watches.

# Calls + Fitness Basics

Bluetooth calling, music control, sports tracking and general wellness measurements make it practical beyond the design.

Heart-rate and SpO₂-style readings are **wellness and fitness estimates**.

# Two Straps, Two Looks

Common exact packages advertise **two straps**, adding more styling flexibility.

> **CURVED SCREEN • METAL BODY • BT CALLING • 2 STRAPS**

**The screen doesn't stop flat at the edge.**`,
    features: [
      "Distinctive curved-edge HD display",
      "Full-metal styling for a more premium look",
      "Bluetooth calling support",
      "Two straps on the documented bundle",
      "Music control from the wrist",
      "Heart-rate / SpO₂-style wellness and fitness estimates",
    ],
    specifications: [
      { label: "Model", value: "Max005" },
      { label: "Display", value: "Curved HD Display" },
      { label: "Bluetooth Calling", value: "Yes" },
      { label: "Body", value: "Full-Metal Styling" },
      { label: "Straps", value: "2 on documented bundle" },
      { label: "Wellness", value: "Heart Rate / SpO₂ advertised as estimates" },
      { label: "Music Control", value: "Yes" },
      { label: "Brand", value: "Max005 / Generic" },
    ],
    compatibility: [
      "Android smartphones",
      "iPhones",
      "Tablets with Bluetooth",
    ],
    inTheBox: [
      "Max005 Curved Smartwatch",
      "2 × Straps",
      "Charging Cable",
      "User Documentation",
    ],
    image: "/gadget/products/smartwatch-max005.webp",
  },
  {
    name: "HX NO.1 Ultra-Thin 1.43″ AMOLED Calling Smartwatch",
    slug: "hx-no1-ultra-thin-amoled-smartwatch",
    brand: "HX",
    sku: "VG-SW-HXNO1",
    category: "smartwatch",
    price: 5999,
    compareAtPrice: 7999,
    rating: 4.6,
    reviewCount: 11,
    featured: false,
    badge: "Ultra-Thin AMOLED",
    stockStatus: "in-stock",
    shortDescription:
      "For people who dislike bulky smartwatches. HX NO.1 combines a slim round body, sharp 1.43″ 466×466 AMOLED display, Bluetooth calling and extensive sports tracking.",
    details: `# Smartwatches Don't Have to Look Thick and Bulky

The **HX NO.1** focuses heavily on a slimmer traditional-watch profile.

> **The highlight: ultra-thin round design around a crisp 466×466 AMOLED display.**

# Sharp AMOLED Screen

The 1.43″ AMOLED panel delivers **466×466 resolution**, giving small text and watch faces unusually strong detail for this class.

# Calls and Notifications

Bluetooth calling, notifications and customizable dials cover everyday connected-watch use.

# Lots of Exercise Profiles

Detailed listings advertise **147 sports modes**, giving users a wide selection of activity categories.

Wellness readings are **general wellness and fitness estimates**.

# Everyday Splash Protection Only

Although IP67 is listed, market this watch for **splash-rated / everyday protection only** — not for swimming, showers or heavy water exposure.

> **1.43″ AMOLED • 466×466 • BT 5.3 • ULTRA-THIN**

**Look at how thin this is from the side.**`,
    features: [
      "Ultra-thin round design for a lighter wrist feel",
      "1.43″ AMOLED display at 466 × 466",
      "Bluetooth 5.3 + BT 3.0 connectivity",
      "Bluetooth calling support",
      "220mAh battery",
      "Up to 147 sports modes on documented variant",
      "Splash-rated / everyday water protection only — not for swimming",
    ],
    specifications: [
      { label: "Model", value: "HX NO.1" },
      { label: "Display", value: "1.43″ AMOLED" },
      { label: "Resolution", value: "466 × 466" },
      { label: "Bluetooth", value: "5.3 + BT3.0" },
      { label: "Bluetooth Calling", value: "Yes" },
      { label: "Battery", value: "220mAh" },
      { label: "Water Rating", value: "IP67 listed — splash / everyday only" },
      { label: "Sports Modes", value: "Up to 147 on documented variant" },
      { label: "Charging", value: "USB / magnetic variant-dependent" },
    ],
    compatibility: [
      "Android smartphones",
      "iPhones",
      "Tablets with Bluetooth",
    ],
    inTheBox: [
      "HX NO.1 Smartwatch",
      "Strap",
      "Charging Cable",
      "User Documentation",
    ],
    image: "/gadget/products/smartwatch-hx-no1.webp",
  },
  {
    name: "MG300 49mm Round Bluetooth Calling Smartwatch",
    slug: "mg300-round-bluetooth-calling-smartwatch",
    brand: "MG300",
    sku: "VG-SW-MG300",
    category: "smartwatch",
    price: 4299,
    compareAtPrice: 5999,
    rating: 4.5,
    reviewCount: 13,
    featured: false,
    badge: "49MM Round Calling Watch",
    stockStatus: "in-stock",
    shortDescription:
      "Classic round styling with modern phone features. MG300 combines a large 49mm watch body, Bluetooth calling, activity tracking and smart notifications for everyday wrist convenience.",
    details: `# For People Who Want a Bigger Traditional Watch Look

The **MG300** gives smartwatch functions a more familiar round-watch presentation rather than copying the square Apple Watch format.

> **The highlight: large 49mm round design + Bluetooth calling.**

# Leave the Phone in Your Pocket

Bluetooth calling lets you handle supported calls through the built-in speaker and microphone after pairing.

# Keep Important Information on the Wrist

Notifications, sports data, steps, sleep and general wellness tracking help reduce how often you need to unlock your phone.

Heart-rate and similar readings are **wellness and fitness estimates**.

# Built for Both Android and iPhone

Current Pakistan listings document compatibility with both platforms.

> **49MM • ROUND DISPLAY • BT CALLING • FITNESS TRACKING**

**Want smartwatch features without the square smartwatch look?**`,
    features: [
      "Large 49mm round case for a traditional watch look",
      "Bluetooth calling with speaker and microphone",
      "Bluetooth 5.0–5.1 depending on listing",
      "Voice assistant support",
      "IP67 water resistance listed",
      "WearFit Pro companion app on detailed variant",
      "Android and iOS compatibility",
    ],
    specifications: [
      { label: "Model", value: "MG300" },
      { label: "Case Size", value: "49mm on detailed Pakistan listing" },
      { label: "Design", value: "Round" },
      { label: "Bluetooth Calling", value: "Yes" },
      { label: "Bluetooth", value: "5.0–5.1 depending listing" },
      { label: "Voice Assistant", value: "Yes" },
      { label: "Water Resistance", value: "IP67 listed" },
      { label: "App", value: "WearFit Pro on detailed variant" },
      { label: "Compatibility", value: "Android + iOS" },
    ],
    compatibility: [
      "Android smartphones",
      "iPhones",
      "WearFit Pro compatible phones",
    ],
    inTheBox: [
      "MG300 Smartwatch",
      "Strap",
      "Charging Cable",
      "User Documentation",
    ],
    image: "/gadget/products/smartwatch-mg300.webp",
  },
  {
    name: "KALOBEE GT8 BUDS 2-in-1 Smartwatch with Built-In Earbuds",
    slug: "kalobee-gt8-buds-2-in-1-smartwatch",
    brand: "KALOBEE",
    sku: "VG-SW-GT8B",
    category: "smartwatch",
    price: 11999,
    compareAtPrice: 15999,
    rating: 4.9,
    reviewCount: 20,
    featured: true,
    badge: "Earbuds Hidden Inside",
    stockStatus: "in-stock",
    shortDescription:
      "Your earbuds are literally inside your watch. KALOBEE GT8 BUDS combines a round smartwatch and true wireless earbuds in one 2-in-1 design, so your audio is always on your wrist.",
    details: `# Open the Watch. Your Earbuds Are Inside.

This is the feature that sells the **KALOBEE GT8 BUDS** immediately.

The smartwatch itself acts as **storage and charging space for a pair of compact wireless earbuds**.

> **The highlight: smartwatch + TWS earbuds combined into one device on your wrist.**

# Stop Forgetting Your Earbuds Case

Normally you carry:

- A smartwatch
- Two earbuds
- A charging case

The GT8 turns those separate items into **one wearable system**.

Leave home with the watch and your earbuds automatically come with you.

# Take Them Out When You Need Audio

Use the earbuds for music, videos and compatible calls, then return them to the watch when you're finished.

# Still a Proper Smartwatch

The GT8 also includes Bluetooth calling/smart functions, sleep, heart-rate, SpO₂ and blood-pressure-style **wellness and fitness estimates**, plus activity reminders.

Its stainless-steel case gives the round watch a more conventional premium appearance.

> **SMARTWATCH • BUILT-IN TWS • BT 5.3 • STAINLESS STEEL**

# The Earbuds Case You Can't Forget

The biggest GT8 benefit isn't hidden in a specification sheet.

It's that **your earbuds live on your wrist**.

**Wear the watch. Carry the earbuds automatically.**`,
    features: [
      "Earbuds store directly inside the smartwatch",
      "No separate earbuds charging case to remember",
      "2-in-1 design reduces the number of gadgets you carry",
      "Bluetooth 3.0 / 5.3 supported for watch and earbud connectivity",
      "300mAh smartwatch battery",
      "25mAh × 2 earbud batteries",
      "Stainless-steel round case at 39mm / 11.5mm thick",
      "Fitness and wellness/fitness estimate features",
      "Powerband companion app",
      "IP67 life waterproof rating with silicone strap",
    ],
    specifications: [
      { label: "Brand", value: "KALOBEE" },
      { label: "Model", value: "GT8 BUDS" },
      { label: "Product Type", value: "Smartwatch + TWS Earbuds" },
      { label: "Watch Bluetooth", value: "BT3.0 / BT5.3" },
      { label: "Watch Battery", value: "300mAh" },
      { label: "Earbud Battery", value: "25mAh × 2" },
      { label: "Case", value: "Stainless Steel" },
      { label: "Watch Size", value: "39mm" },
      { label: "Thickness", value: "11.5mm" },
      { label: "App", value: "Powerband" },
      { label: "Water Resistance", value: "IP67 Life Waterproof" },
      { label: "Strap", value: "Silicone" },
    ],
    compatibility: [
      "Android smartphones",
      "iPhones",
      "Powerband-compatible phones",
      "Bluetooth audio devices",
    ],
    inTheBox: [
      "KALOBEE GT8 BUDS Smartwatch",
      "2 × Integrated Wireless Earbuds",
      "Strap",
      "Charging Cable",
      "Documentation",
    ],
    image: "/gadget/products/smartwatch-kalobee-gt8-buds.webp",
  },
];
