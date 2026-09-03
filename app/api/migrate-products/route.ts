import { NextRequest, NextResponse } from "next/server";
import { getAdminProduct, listAdminProducts, publishAdminProduct, editorDocument } from "@/lib/db/admin-store";

function blocks(text: string) {
  return text.split("\n\n").map((p) => ({
    _type: "block" as const,
    style: "normal" as const,
    children: [{ _type: "span" as const, text: p.replace(/\n/g, " ") }],
  }));
}

const ITEMS = [
  {
    match: "hw17",
    title: "HW17 PRO+ Smartwatch \u2013 1.46\u2033 HD Display, Bluetooth Calling & Smart Features",
    shortDescription: "Modern HD smartwatch with Bluetooth calling, smart notifications, local music, fitness tracking, 100+ sports modes and a large 400mAh battery for smarter everyday use.",
    features: [
      "1.46\u2033 HD display",
      "320\u00d7382 resolution",
      "Bluetooth calling",
      "Smart call/message notifications",
      "Local music storage",
      "Local photo album",
      "E-book function",
      "3D menu interface",
      "100+ sports modes",
      "WearFit Pro support",
      "400mAh battery",
      "IP67-rated daily splash protection",
    ],
    fullDetails: "Smarter Features for Everyday Life\n\nThe HW17 PRO+ takes the everyday smartwatch experience a step further with a sharp 1.46-inch HD display, 320\u00d7382 resolution and a modern interface designed to keep calls, notifications, fitness information and useful tools conveniently on your wrist.\n\nBluetooth calling allows you to handle supported calls directly from the watch when paired with your smartphone, while intelligent notifications keep incoming calls and messages within easy reach. The HW17 PRO+ also supports local music and photo storage, allowing selected media to remain available on the watch without constantly reaching for your phone.\n\nIt also includes an e-book function, customizable scrolling text, a 3D-style menu and more than 100 advertised sports scenarios. A 400mAh battery provides additional capacity compared with many entry-level smartwatches, while WearFit Pro handles smartphone pairing and synchronization.\n\nPlease Note: The watch advertises an AI assistant/memo feature. Health and wellness readings are intended for general fitness reference and are not medical measurements.",
  },
  {
    match: "m10 pro",
    title: "Langsfit M10 Pro Ladies Smartwatch \u2013 Bluetooth Calling & Dual-Strap Design",
    shortDescription: "Elegant ladies smartwatch combining Bluetooth calling, activity and heart-rate tracking with a premium round design and interchangeable straps for everyday and formal wear.",
    features: [
      "Bluetooth calling",
      "Round full-touch design",
      "Heart-rate monitoring",
      "Activity tracking",
      "Smart connectivity",
      "Changeable watch faces",
      "Metal and silicone strap styling",
      "Fashion-focused ladies design",
    ],
    fullDetails: "Smart Technology Designed with Style in Mind\n\nThe Langsfit M10 Pro is made for customers who want smartwatch functionality without sacrificing the look of a traditional fashion accessory. Its elegant round case and decorative jewellery-inspired styling make it suitable for university, office wear, casual outings and more formal occasions.\n\nBluetooth calling keeps supported calls conveniently accessible from your wrist, while smartphone connectivity gives you easy access to everyday connected functions. Heart-rate monitoring and activity tracking help you follow your daily movement and general wellness trends throughout the day.\n\nOne of the M10 Pro\u2019s strongest selling points is versatility. Matching retail versions are supplied with both metal and silicone-style straps, letting the customer switch between a more premium jewellery look and a comfortable everyday style.\n\nPerfect for: Everyday wear, university, office, gifting and customers who prefer a traditional round watch instead of an Apple-style square smartwatch.",
  },
  {
    match: "l500",
    title: "Langsfit L500 Pro Bluetooth Calling Smartwatch \u2013 Dual Strap Edition",
    shortDescription: "Stylish round smartwatch with Bluetooth calling, full-touch controls, heart-rate and sports tracking, music control, magnetic charging and two interchangeable straps.",
    features: [
      "Bluetooth calling",
      "Built-in speaker & microphone",
      "Full-touch display",
      "Heart-rate monitoring",
      "Multiple sports modes",
      "Music control",
      "Magnetic charging",
      "Silicone strap + metal strap included",
      "Available in black, pink and silver variants",
    ],
    fullDetails: "One Watch for Both Smart and Formal Looks\n\nThe Langsfit L500 Pro combines the clean appearance of a traditional round watch with the connected features of a modern smartwatch. Its full-touch interface makes everyday navigation simple, while the round case gives it a more refined look than typical square fitness watches.\n\nA built-in microphone and speaker enable Bluetooth calling, allowing supported calls to be made, answered or rejected directly from your wrist while the watch is connected to your smartphone. Music controls also let you manage playback without repeatedly taking out your phone.\n\nFor everyday activity, the L500 Pro includes heart-rate monitoring and multiple sports modes. The package is commonly supplied with one silicone strap and one metal strap, making it easy to move between workouts, casual wear and more formal occasions. Magnetic charging keeps everyday charging simple.",
  },
  {
    match: "v20",
    title: "Langsfit V20 Pro AMOLED Smartwatch \u2013 Bluetooth Calling & NFC",
    shortDescription: "Feature-packed smartwatch with a large 2.09\u2033 curved AMOLED display, Bluetooth calling, NFC, fitness and sleep tracking, smart notifications and magnetic charging.",
    features: [
      "2.09\u2033 curved AMOLED display",
      "240\u00d7296 resolution",
      "Bluetooth calling",
      "NFC functionality",
      "Heart-rate monitoring",
      "Sleep tracking",
      "Fitness and step tracking",
      "Smart notifications",
      "Music/remote controls",
      "Bluetooth 5.3 + 3.0",
      "210mAh battery",
      "Magnetic charging",
      "Android & iOS support",
    ],
    fullDetails: "A Bigger AMOLED Experience for Everyday Connectivity\n\nThe Langsfit V20 Pro combines a large 2.09-inch curved AMOLED display with everyday calling, fitness and smart-connectivity features. Its spacious screen gives watch faces, notifications and activity information plenty of room while retaining a modern, streamlined appearance.\n\nBluetooth calling allows supported calls to be handled from your wrist, while message and push notifications help you stay connected throughout the day. The V20 Pro also includes heart-rate monitoring, sleep tracking, step/activity tracking and sports functionality for customers who want both communication and everyday fitness tools in one device.\n\nThe watch uses Bluetooth 5.3 + 3.0 connectivity and supports Android 5.0+ and iOS 10.0+. A 210mAh battery and magnetic charging system handle power.\n\nAccuracy Note: Some listings advertise standalone GPS and NFC payment. We recommend verifying these against your exact unit before promoting them, as budget smartwatch NFC is often more limited than Apple Pay or Google Wallet.",
  },
  {
    match: "max005",
    title: "Maixinn Max005 Curved AMOLED Smartwatch",
    shortDescription: "Modern curved-display smartwatch featuring AMOLED visuals, sleek edge-to-edge styling, everyday fitness tracking and smart connectivity in a lightweight wearable design.",
    features: [
      "Curved AMOLED display",
      "Modern edge-to-edge styling",
      "Fitness tracking",
      "Smart connectivity",
      "Customizable watch faces",
      "Everyday unisex design",
    ],
    fullDetails: "A Clean Curved Design That Stands Out\n\nThe Maixinn Max005 is built around its most noticeable feature: a modern curved AMOLED display that gives the watch a cleaner, more premium appearance than conventional flat-screen budget smartwatches.\n\nIts slim, contemporary design works well for everyday wear while providing smartwatch connectivity and fitness-tracking functionality for customers who want something stylish without moving into premium-brand pricing.\n\nThe curved body gives watch faces and on-screen information a more seamless edge-to-edge appearance, making this model particularly attractive for customers buying primarily on design.\n\nNote: We will update this listing with full specifications once verified against the physical unit.",
  },
  {
    match: "hx no1",
    title: "HX NO1 AMOLED Smartwatch \u2013 Bluetooth Calling & Fitness Tracking",
    shortDescription: "Premium round smartwatch with a sharp 1.43\u2033 AMOLED display, Bluetooth calling, smart notifications, health and activity tracking, customizable faces and Bluetooth 5.3 connectivity.",
    features: [
      "1.43\u2033 AMOLED full-touch display",
      "466\u00d7466 resolution",
      "Bluetooth calling",
      "Bluetooth 5.3 + BT3.0",
      "Smart notifications",
      "Heart-rate monitoring",
      "Sleep tracking",
      "Multiple sports modes",
      "Customizable watch faces",
      "Rotating crown/navigation",
      "Android & iOS connectivity",
    ],
    fullDetails: "Classic Round Design with a Sharp AMOLED Display\n\nThe HX NO1 combines traditional round-watch styling with a crisp 1.43-inch AMOLED full-touch display. Its 466\u00d7466 resolution provides a sharp interface for watch faces, notifications, activity information and everyday controls.\n\nBluetooth connectivity allows the HX NO1 to work closely with a compatible Android or iOS smartphone, including Bluetooth call handling and smart notifications. A rotating side control makes navigating watch faces and menus more natural without relying exclusively on touchscreen gestures.\n\nFor everyday activity and wellness tracking, the HX NO1 supports heart-rate monitoring, sleep tracking and multiple sport/activity functions. Smartphone synchronization also provides weather information and customizable watch faces.\n\nImportant: This watch carries an IP67 rating, but its manual advises against use in rain, while washing hands, swimming, showering or around steam. It is not marketed as waterproof.",
  },
  {
    match: "mg300",
    title: "MG300 Bluetooth Calling Smartwatch \u2013 Health & Fitness Tracking",
    shortDescription: "Versatile round smartwatch with Bluetooth calling, built-in speaker, smart notifications, multiple sports modes and essential health and activity tracking for Android and iOS.",
    features: [
      "Bluetooth calling",
      "Built-in speaker",
      "Voice assistant",
      "Android & iOS compatibility",
      "Multiple sports modes",
      "Heart-rate monitoring",
      "SpO\u2082 monitoring",
      "Sleep tracking",
      "Step & calorie tracking",
      "Smart notifications",
      "Music controls",
      "Magnetic charging",
      "WearFit Pro app support",
    ],
    fullDetails: "Connected Convenience in a Classic Round Design\n\nThe MG300 brings calling, notifications, fitness information and everyday smartwatch controls together in a traditional round-watch design that\u2019s easy to wear at work, university, workouts or casual outings.\n\nBluetooth calling and a built-in speaker allow supported calls to be handled directly from the watch when paired with your smartphone. The MG300 also supports voice-assistant functionality and works with both Android and iOS devices.\n\nFor daily fitness and wellness, it includes heart-rate monitoring, blood-oxygen monitoring, sleep tracking, step counting and calorie tracking, together with multiple sports modes. This makes the MG300 useful for customers who want straightforward everyday activity information without purchasing a premium smartwatch.\n\nAlso includes WearFit Pro connectivity, full-touch interface, Bluetooth music controls, call/message reminders, magnetic charging, alarms, stopwatch, calculator and find-device functionality.\n\nPlease Note: Wellness measurements are intended for general lifestyle and fitness reference and are not medical readings.",
  },
  {
    match: "gt8",
    title: "KALOBEE GT8 Buds 2-in-1 Smartwatch with Built-In TWS Earbuds",
    shortDescription: "Innovative 2-in-1 smartwatch and wireless-earbuds combo with built-in TWS storage, smart notifications, wellness tracking, customizable watch faces and Bluetooth connectivity.",
    features: [
      "Smartwatch + integrated TWS earbuds",
      "Earbuds stored inside watch body",
      "Bluetooth 3.0 / 5.3",
      "300mAh watch battery",
      "25mAh \u00d7 2 earbud batteries",
      "Heart-rate monitoring",
      "SpO\u2082 monitoring",
      "Sleep tracking",
      "Activity/wellness tools",
      "Customizable watch faces",
      "Powerband app support",
      "39mm stainless-steel case",
      "22mm silicone strap",
    ],
    fullDetails: "Your Smartwatch and Earbuds \u2014 Together on Your Wrist\n\nThe KALOBEE GT8 Buds solves one of the most common everyday problems with wireless earbuds: figuring out where you left the case. Instead, the GT8 integrates its TWS earbuds directly into the smartwatch, giving you a watch and wireless audio solution in one compact wearable.\n\nRemove the earbuds when you want to listen to music or take supported calls, then place them back inside the watch when you\u2019re finished. The earbud storage system supports automatic call handling through the earbuds along with music control and everyday watch functions.\n\nKALOBEE\u2019s specification page lists Bluetooth 3.0/5.3, a 300mAh watch battery plus 25mAh batteries in each earbud, customizable watch faces and Powerband app support. Wellness functionality includes heart-rate, SpO\u2082, sleep and blood-pressure tracking together with sedentary and drink-water reminders.\n\nThe watch uses a 39mm stainless-steel case with a silicone strap, giving it a more substantial watch-like appearance than many inexpensive plastic smartwatch-and-earbud combinations.\n\nNote: Described as IP67 life-waterproof by KALOBEE. Suitable for normal everyday splash exposure; avoid submersion.",
  },
  {
    match: "hw21",
    title: "HEATZ HW21 AMOLED Smartwatch \u2013 Rotating Bezel & Health Tracking",
    shortDescription: "Premium round smartwatch with a vibrant 1.43\u2033 AMOLED Always-On Display, rotating bezel, customizable watch faces, multi-sport tracking and essential health monitoring in a durable zinc-alloy design.",
    features: [
      "1.43\u2033 AMOLED full-touch display",
      "Always-On Display",
      "Physical rotating bezel",
      "Premium zinc-alloy body",
      "Customizable DIY watch faces",
      "Heart-rate monitoring",
      "Blood-oxygen / SpO\u2082 tracking",
      "Sleep monitoring",
      "Multi-sport activity modes",
      "22mm strap size",
      "Approximately 5\u20137 days advertised regular use",
      "Up to 15\u201320 days advertised standby time",
    ],
    fullDetails: "Classic Watch Styling Meets a Modern AMOLED Experience\n\nThe HEATZ HW21 combines the familiar elegance of a traditional round watch with the convenience of a modern smartwatch. Built around a sharp 1.43-inch AMOLED touchscreen, it delivers rich colours, clear information and an Always-On Display that lets you check the time at a glance.\n\nWhat makes the HW21 particularly satisfying to use is its rotating bezel. Instead of relying entirely on touchscreen gestures, the bezel provides a more natural way to navigate through watch faces and everyday controls while giving the watch a premium, traditional feel.\n\nIts zinc-alloy construction creates a refined metallic finish suitable for everything from everyday casual wear to university, office and formal occasions. A standard 22mm strap size also makes the design comfortable and versatile for daily use.\n\nThe HW21 helps you keep track of everyday wellness and activity with heart-rate monitoring, blood-oxygen tracking, sleep monitoring and multi-sport activity modes. Customizable DIY watch faces let you personalize the screen to suit your outfit, mood or style.\n\nHEATZ advertises approximately 5\u20137 days of normal use and up to 15\u201320 days of standby time.\n\nPlease Note: Smartwatch wellness readings are intended for general fitness and lifestyle reference and should not be considered medical measurements.",
  },
];

export async function GET(req: NextRequest) {
  const debug = req.nextUrl.searchParams.get("debug") === "1";
  const products = await listAdminProducts();

  if (debug) {
    return NextResponse.json({
      count: products.length,
      products: products.map((p) => ({ slug: p.slug, name: p.name, _id: p._id })),
    });
  }

  const results: object[] = [];
  try {
    for (const item of ITEMS) {
      const matchKey = item.match.toLowerCase();
      const product = products.find(
        (p) =>
          p.name.toLowerCase().includes(matchKey) ||
          p.slug.toLowerCase().includes(matchKey.replace(/\s+/g, "-"))
      );

      if (!product) {
        results.push({ matched: item.match, _error: "Not Found in DB" });
        continue;
      }

      const full = await getAdminProduct(product._id);
      if (!full) {
        results.push({ matched: item.match, _error: "Could not fetch full record" });
        continue;
      }

      const doc = editorDocument(full);
      doc.name = item.title;
      doc.shortDescription = item.shortDescription;
      doc.description = blocks(item.fullDetails);
      doc.features = item.features;

      const pub = await publishAdminProduct(full._id, doc);
      results.push({
        slug: full.slug,
        matched: item.match,
        title: doc.name,
        success: pub.ok,
        error: pub.ok ? undefined : (pub as { error?: string }).error,
      });
    }

    return NextResponse.json({ success: true, results });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: msg });
  }
}
