import { NextResponse } from "next/server";
import { getAdminProduct, listAdminProducts, publishAdminProduct, editorDocument } from "@/lib/db/admin-store";

function toPortableText(text: string) {
  return text.split("\n\n").map((p) => ({
    _type: "block" as const,
    style: "normal" as const,
    children: [{ _type: "span" as const, text: p.replace(/\n/g, " ") }],
  }));
}

const ITEMS = [
  {
    match: "apple logo",
    title: "Series 11 Smartwatch \u2013 Apple Logo Startup | AMOLED Display | Bluetooth Calling",
    shortDescription: "A premium Series 11 smartwatch featuring a large AMOLED display, Bluetooth calling, smart notifications, fitness tracking, wireless charging and Apple-logo startup \u2014 designed for stylish everyday connectivity with Android and iOS.",
    features: [
      "Large AMOLED / high-resolution full-screen display",
      "Edge-to-edge Apple-style rectangular design",
      "Apple logo displayed when powering on/off",
      "Bluetooth calling",
      "Calls, messages and supported app notifications",
      "Android and iOS compatibility",
      "Magnetic/wireless charging",
      "Multiple sports modes",
      "Heart rate, steps, distance, calories and sleep tracking",
      "Music and connected-phone functions",
      "Interchangeable strap system",
    ],
    fullDetails: "Premium Style. Smart Everyday Features. One Watch.\n\nBring a premium smartwatch look to your everyday routine with the Series 11 Smartwatch. Designed around a large edge-to-edge AMOLED-style display and a sleek metal-finish body, it combines modern styling with the everyday features most people actually want from a smartwatch.\n\nSwitch it on and the watch displays its distinctive Apple-logo startup screen, while the responsive full-screen interface makes calls, notifications, fitness information and everyday controls easy to access from your wrist. Matching online listings confirm Bluetooth calling, smartphone notifications and compatibility with both Android and iOS devices.\n\nWhether you're heading to university, work, the gym or simply going out, the Series 11 is designed to work as both a practical wearable and a stylish everyday accessory. Bluetooth calling lets you handle supported calls through the watch when connected to your phone, while app notifications help you stay updated without repeatedly reaching for your mobile.\n\nFor activity tracking, matching listings advertise multiple sports modes together with functions including heart-rate monitoring, step and distance tracking, calorie tracking and sleep monitoring.\n\nWireless/magnetic charging keeps the setup simple, while interchangeable straps let you change the look depending on your outfit or occasion.",
  },
  {
    match: "mini zw",
    title: "Mi Ni ZW10 DO Elegant Diamond Series 2-in-1 Ladies Smartwatch",
    shortDescription: "Elegant ladies smartwatch with Bluetooth calling, full-touch display, smart notifications, health & activity tracking, multiple sports modes and interchangeable styling for everyday wear.",
    features: [
      "Bluetooth calling",
      "Built-in speaker",
      "Full-touch smartwatch display",
      "Smart call & app notifications",
      "Heart-rate monitoring",
      "Blood-oxygen monitoring",
      "Step & calorie tracking",
      "Sleep monitoring",
      "Multiple sports modes",
      "Voice-assistant support",
      "Customizable watch faces",
      "Remote camera control",
      "Magnetic charging",
      "Android & iOS compatibility",
      "Elegant crystal-inspired ladies design",
    ],
    fullDetails: "Where Smart Technology Meets Elegant Style\n\nThe Mi Ni ZW10 DO Elegant Diamond Series is designed for women who want the convenience of a smartwatch without giving up a polished, jewellery-inspired look. Its crystal-detailed square design gives it a premium appearance that works just as naturally with everyday outfits as it does with more formal wear.\n\nConnect the ZW10 to a compatible Android or iOS smartphone to access Bluetooth calling, smart notifications and everyday connected features directly from your wrist. The watch also includes a built-in speaker and voice-assistant support, helping you stay connected while keeping your phone in your bag or pocket.\n\nFor everyday fitness and wellness tracking, the ZW10 supports heart-rate monitoring, blood-oxygen monitoring, step counting, calorie tracking and sleep monitoring. Multiple sports modes make it useful for keeping an eye on daily movement and workout activity.\n\nA responsive full-touch interface keeps navigation simple, while customizable watch faces let you change the appearance of your watch to match your mood or outfit. Compatible versions also support remote camera control and music functions through the connected smartphone.\n\nPerfect For: Daily wear, university, office use, workouts, casual outings and gifting.\n\nPlease Note: Health and wellness readings from this smartwatch are intended for general fitness reference and are not medical measurements.",
  },
  {
    match: "a58 plus",
    title: "A58 Plus Smart Watch \u2013 Bluetooth Calling & Fitness Tracking",
    shortDescription: "Stylish everyday smartwatch with Bluetooth calling, a large touch display, smart notifications, activity tracking, multiple sports modes and Android & iOS compatibility.",
    features: [
      "Bluetooth calling",
      "Large 49mm IPS display",
      "320 \u00d7 240 resolution",
      "Bluetooth 5.0",
      "Smart notifications",
      "Multiple sports modes",
      "Heart-rate monitoring",
      "Blood-oxygen monitoring",
      "Sleep monitoring",
      "Step counter",
      "Calorie tracking",
      "Water-resistant design",
      "Android & iOS compatibility",
      "Approximately 5\u20137 days advertised battery life",
    ],
    fullDetails: "Smart Connectivity Made Simple\n\nThe A58 Plus Smart Watch brings everyday connectivity, fitness tracking and modern styling together in an affordable wearable designed for daily use.\n\nConnect the watch to your Android or iOS smartphone through Bluetooth and handle supported calls directly from your wrist. Smart notifications keep important phone updates within easy reach, making the A58 Plus convenient for university, office, workouts and everyday travel.\n\nThe watch also gives you useful activity and wellness information throughout the day, including heart-rate monitoring, blood-oxygen monitoring, step counting, calorie tracking and sleep monitoring. Multiple sports modes help you keep track of different activities and workouts.\n\nIts large IPS display provides plenty of space for watch faces, activity information and everyday controls, while a water-resistant design gives additional protection against normal day-to-day exposure.\n\nPlease Note: Health and wellness readings are designed for general fitness reference and should not be treated as professional medical measurements.",
  },
  {
    match: "howear",
    title: "HOWEAR HW-S10 Call Android Smartwatch \u2013 SIM, Camera, GPS & Apps",
    shortDescription: "Standalone Android smartwatch with SIM calling, Wi-Fi, GPS, rotating camera and downloadable apps \u2014 bringing smartphone-style functionality directly to your wrist.",
    features: [
      "Standalone SIM support",
      "Android operating system",
      "Direct calling from the watch",
      "Wi-Fi connectivity",
      "Bluetooth connectivity",
      "Built-in GPS positioning",
      "Rotating camera",
      "Photo & supported video-call functionality",
      "Downloadable Android applications",
      "Music & video playback",
      "Smart notifications",
      "Heart-rate monitoring",
      "Blood-oxygen monitoring",
      "Sleep monitoring",
      "Step, distance & calorie tracking",
      "Magnetic charging",
    ],
    fullDetails: "More Than a Smartwatch \u2014 A Mini Android Device on Your Wrist\n\nThe HOWEAR HW-S10 Call is designed for customers who want much more than basic notifications and fitness tracking. With its own SIM capability, Android operating system, Wi-Fi, GPS and integrated camera, it delivers a smartphone-style experience in a compact wearable design.\n\nInsert a compatible Nano-SIM to make supported calls directly from the watch without keeping your smartphone connected. Wi-Fi and cellular connectivity also give supported versions access to online services and downloadable applications.\n\nThe HW-S10 Call includes a rotating camera that can be used for photos, video and supported video-calling applications. Android functionality provides access to a broader selection of apps than a conventional Bluetooth-only smartwatch, including commonly advertised social, video and communication applications.\n\nBuilt-in GPS positioning adds location and activity functionality, while Bluetooth connectivity allows the watch to work alongside other compatible devices.\n\nFor everyday activity tracking, the watch includes step, distance and calorie tracking together with advertised wellness functions including heart-rate, blood-oxygen and sleep monitoring.",
  },
  {
    match: "m99",
    title: "M99 Android Smartwatch \u2013 2.4\u2033 AMOLED, SIM, GPS & Rotating Camera",
    shortDescription: "Powerful Android smartwatch with a huge 2.4\u2033 AMOLED display, standalone SIM connectivity, rotating camera, GPS, Wi-Fi, NFC and downloadable apps for a true phone-on-your-wrist experience.",
    features: [
      "Large 2.4\u2033 AMOLED touchscreen",
      "Android operating system",
      "Standalone SIM connectivity",
      "Direct calling",
      "Wi-Fi connectivity",
      "GPS navigation/location support",
      "NFC functionality",
      "190\u00b0 rotating camera",
      "Photo & video capture",
      "Supported video calling",
      "Downloadable applications",
      "Bluetooth connectivity",
      "Music & video playback",
      "Heart-rate monitoring",
      "Blood-oxygen monitoring",
      "Sleep tracking",
      "Step, distance & calorie tracking",
      "IP67-rated protection advertised on common variants",
    ],
    fullDetails: "A Smartwatch That Thinks More Like a Smartphone\n\nThe M99 takes the traditional smartwatch concept much further by combining a large touchscreen, Android software, standalone cellular connectivity and a rotating camera in one powerful wearable.\n\nIts impressive 2.4-inch AMOLED display gives applications, maps, messages, videos and watch faces far more room than a conventional smartwatch screen. The high-resolution display also makes the M99 particularly suited to customers who want multimedia and app functionality on their wrist.\n\nAdd a compatible SIM card and the M99 can operate more independently from your smartphone, supporting cellular calls and mobile connectivity according to the network bands supported by your particular version.\n\nA distinctive 190\u00b0 rotating camera allows the camera angle to be adjusted for photos, videos and supported video-call applications without awkwardly positioning your wrist.\n\nBecause the M99 runs Android, supported versions can download and run applications rather than being restricted to the fixed functions found on ordinary Bluetooth watches. Wi-Fi, GPS and NFC further expand what the watch can do, from online connectivity to navigation and compatible contactless functions.",
  },
];

export async function GET() {
  const results = [];
  try {
    const products = await listAdminProducts();
    for (const item of ITEMS) {
      const matchKey = item.match.toLowerCase();
      const product = products.find((p) => p.name.toLowerCase().includes(matchKey) || p.slug.includes(matchKey));
      
      if (product) {
        const full = await getAdminProduct(product._id);
        if (full) {
          const doc = editorDocument(full);
          doc.name = item.title;
          doc.shortDescription = item.shortDescription;
          doc.description = toPortableText(item.fullDetails);
          doc.features = item.features;
          
          const pub = await publishAdminProduct(full._id, doc);
          results.push({ slug: full.slug, matched: item.match, title: doc.name, success: pub.ok });
        }
      } else {
        results.push({ matched: item.match, _error: "Not Found in DB" });
      }
    }
    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Unknown error" });
  }
}
