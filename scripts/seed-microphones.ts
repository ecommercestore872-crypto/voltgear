import { createClient as createSupabase } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

import { readSupabaseEnv } from "../packages/shared/lib/db/migration-rules";

function loadEnvLocal() {
  const file = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const supabaseEnv = readSupabaseEnv({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
});

const supabase = createSupabase(supabaseEnv.url, supabaseEnv.serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const MICROPHONES_DATA = [
  {
    name: "Jmary BY-V10 Wireless Lavalier Microphone (Type-C / Lightning)",
    slug: "jmary-by-v10-wireless-microphone",
    brand: "Jmary Audio",
    sku: "VG-MC-BYV10",
    category: "microphones",
    price: 6499,
    compareAtPrice: 8999,
    rating: 4.8,
    reviewCount: 37,
    featured: true,
    badge: "2.4GHz Plug & Play",
    stockStatus: "in-stock",
    shortDescription: "Ultra-compact 2.4GHz wireless lavalier microphone with active noise cancellation, 50-meter line-of-sight range, 9-hour battery life, and direct Type-C/Lightning connector.",
    features: [
      "2.4GHz digital wireless transmission with zero pairing latency",
      "Built-in intelligent DSP active noise reduction chip for crystal clear vocal recording",
      "9 hours of continuous recording per single charge",
      "Plug-and-play receiver requires no extra apps or Bluetooth setup",
      "Ultra lightweight 9.5g transmitter clip-on lapel microphone"
    ],
    specifications: [
      { label: "Wireless Frequency", value: "2.4 GHz Digital" },
      { label: "Operating Range", value: "Up to 50 Meters" },
      { label: "Battery Life", value: "9 Hours (Tx)" },
      { label: "Frequency Response", value: "20 Hz - 16 kHz" }
    ],
    compatibility: ["Android Smartphones (Type-C)", "iPhone 15/16 Series", "iPads & Laptops"],
    inTheBox: [
      "Jmary BY-V10 Transmitter Mic",
      "Type-C Receiver Dongle",
      "Foam Windscreen",
      "Charging Cable",
      "User Manual"
    ],
    image: "/gadget/products/mic-jmary-v10.webp"
  },
  {
    name: "Jmary V20 Wireless Dual Channel Microphone System",
    slug: "jmary-v20-wireless-dual-microphone",
    brand: "Jmary Audio",
    sku: "VG-MC-JMV20",
    category: "microphones",
    price: 8999,
    compareAtPrice: 11999,
    rating: 4.9,
    reviewCount: 45,
    featured: true,
    badge: "Dual Mic Kit",
    stockStatus: "in-stock",
    shortDescription: "Dual channel wireless lavalier microphone kit with two clip-on transmitters, 2.4GHz anti-interference chip, pass-through phone charging, and omnidirectional pickup.",
    features: [
      "Dual transmitter microphones for two-person interviews and podcasts",
      "Receiver features pass-through USB-C port to charge phone while recording",
      "Smart noise reduction filter isolates background ambient noise",
      "360-degree omnidirectional high-sensitivity condenser capsule",
      "Up to 50 meters stable wireless transmission distance"
    ],
    specifications: [
      { label: "Channels", value: "Dual Channel (2 Transmitters + 1 Receiver)" },
      { label: "Range", value: "50 Meters Line-of-Sight" },
      { label: "Battery Runtime", value: "9 Hours per Transmitter" },
      { label: "Audio Signal", value: "2.4GHz Digital Wireless" }
    ],
    compatibility: ["Interviews & Podcasts", "Vlogging & Live Streaming", "iOS & Android"],
    inTheBox: [
      "2x Jmary V20 Wireless Transmitters",
      "1x Wireless Receiver",
      "2x Foam Windscreens",
      "Dual USB-C Charging Cable",
      "User Guide"
    ],
    image: "/gadget/products/mic-jmary-v20.webp"
  },
  {
    name: "Jmary V30 Pro Dual Wireless Microphone Kit with Charging Case",
    slug: "jmary-v30-pro-wireless-microphone",
    brand: "Jmary Audio",
    sku: "VG-MC-JMV30P",
    category: "microphones",
    price: 12999,
    compareAtPrice: 16999,
    rating: 4.9,
    reviewCount: 52,
    featured: true,
    badge: "36h Power Case",
    stockStatus: "in-stock",
    shortDescription: "Flagship dual wireless microphone system featuring 100-meter range, magnetic 600mAh charging storage case providing 36 hours total battery life, and OLED indicator.",
    features: [
      "Portable magnetic charging case provides 36 hours of total operational runtime",
      "100-meter ultra-long wireless distance with anti-interference frequency hopping",
      "3-level customizable AI noise reduction modes",
      "Integrated real-time earphone monitoring jack on receiver",
      "Rotatable magnetic collar clip and furry windscreen for outdoor recording"
    ],
    specifications: [
      { label: "Battery Life", value: "36 Hours Total (with 600mAh Charging Case)" },
      { label: "Wireless Range", value: "Up to 100 Meters" },
      { label: "Monitoring", value: "3.5mm Real-Time Audio Monitor Jack" },
      { label: "Latency", value: "< 15ms Ultra Low Latency" }
    ],
    compatibility: ["Pro Vlogging", "YouTube & TikTok Content", "DSLR Cameras & Mobile"],
    inTheBox: [
      "2x Jmary V30 Pro Transmitters",
      "1x Multi-Port Receiver",
      "1x Wireless Charging Case",
      "2x Furry Windscreens",
      "3.5mm Camera Cable",
      "User Manual"
    ],
    image: "/gadget/products/mic-jmary-v30.webp"
  },
  {
    name: "Jmary V-3 Combo Wireless Lapel Mic Set",
    slug: "jmary-v3-combo-wireless-microphone",
    brand: "Jmary Audio",
    sku: "VG-MC-JMV3C",
    category: "microphones",
    price: 7499,
    compareAtPrice: 9999,
    rating: 4.7,
    reviewCount: 29,
    featured: false,
    badge: "Universal 3-in-1",
    stockStatus: "in-stock",
    shortDescription: "Universal 3-in-1 wireless lapel mic combo set featuring Lightning, Type-C, and 3.5mm TRS receiver connectors for instant camera, iPhone, and Android pairing.",
    features: [
      "Universal 3-in-1 receiver with Type-C, Lightning, and 3.5mm audio jack connectors",
      "One-click active noise cancellation toggle button",
      "Integrated 80mAh rechargeable battery inside microphone transmitter",
      "Crisp HD vocal reproduction with low distortion",
      "Anti-slip metal lapel clip attachment"
    ],
    specifications: [
      { label: "Connectors", value: "Type-C, Lightning & 3.5mm TRS" },
      { label: "Range", value: "30 Meters" },
      { label: "Battery Life", value: "7 Hours Continuous" }
    ],
    compatibility: ["iPhones", "Android Phones", "DSLR Cameras", "Laptops & PCs"],
    inTheBox: [
      "Jmary V-3 Combo Transmitter",
      "3-in-1 Universal Receiver",
      "Type-C Charging Cable",
      "User Guide"
    ],
    image: "/gadget/products/mic-jmary-v3combo.webp"
  },
  {
    name: "Nepho NP-57 Wireless Lavalier Microphone",
    slug: "nepho-np-57-wireless-microphone",
    brand: "Nepho",
    sku: "VG-MC-NP57",
    category: "microphones",
    price: 2999,
    compareAtPrice: 3999,
    rating: 4.6,
    reviewCount: 22,
    featured: false,
    badge: "Budget Choice",
    stockStatus: "in-stock",
    shortDescription: "Budget-friendly 2.4GHz wireless lapel microphone with plug-and-play receiver, acoustic noise reduction, and 8-hour working time for mobile content creators.",
    features: [
      "Budget 2.4GHz wireless clip-on microphone for smartphone vlogging",
      "Acoustic noise reduction algorithm filter for clear speech",
      "8 hours battery life per charge",
      "20 meters wireless transmission distance",
      "Compact lightweight collar clip design"
    ],
    specifications: [
      { label: "Working Distance", value: "20 Meters" },
      { label: "Battery Runtime", value: "8 Hours" },
      { label: "Weight", value: "11g Ultra Light" }
    ],
    compatibility: ["Type-C & Lightning Smartphones", "Mobile Content"],
    inTheBox: [
      "Nepho NP-57 Transmitter Mic",
      "Receiver Dongle",
      "Charging Cable",
      "User Manual"
    ],
    image: "/gadget/products/mic-nepho-np57.webp"
  },
  {
    name: "Nepho NP-59 Wireless Lapel Mic System",
    slug: "nepho-np-59-wireless-microphone",
    brand: "Nepho",
    sku: "VG-MC-NP59",
    category: "microphones",
    price: 3499,
    compareAtPrice: 4699,
    rating: 4.7,
    reviewCount: 31,
    featured: false,
    badge: "Reverb Control",
    stockStatus: "in-stock",
    shortDescription: "Wireless lapel microphone system with built-in reverb sound effect mode, noise reduction chip, 25-meter range, and 10-hour battery capacity.",
    features: [
      "Built-in reverb sound effect toggle mode for singing and voiceovers",
      "DSP noise reduction isolation chip",
      "Up to 25 meters wireless range",
      "10 hours battery life with quick USB-C charging",
      "High sensitivity omnidirectional microphone pickup"
    ],
    specifications: [
      { label: "Special Modes", value: "Reverb Effect + Noise Cancellation" },
      { label: "Range", value: "25 Meters" },
      { label: "Battery Life", value: "10 Hours" }
    ],
    compatibility: ["Live Streaming", "Online Classes", "Karaoke & Vlogging"],
    inTheBox: [
      "Nepho NP-59 Wireless Mic",
      "Receiver Dongle",
      "Foam Windscreen",
      "Charging Cable"
    ],
    image: "/gadget/products/mic-nepho-np59.webp"
  },
  {
    name: "Nepho NP-61 Dual Wireless Microphone System",
    slug: "nepho-np-61-dual-wireless-microphone",
    brand: "Nepho",
    sku: "VG-MC-NP61",
    category: "microphones",
    price: 4499,
    compareAtPrice: 5999,
    rating: 4.8,
    reviewCount: 26,
    featured: false,
    badge: "Dual Mic Set",
    stockStatus: "in-stock",
    shortDescription: "Dual channel wireless lavalier microphone system with 2 lapel transmitters, charging storage case, intelligent noise suppression, and 30m distance.",
    features: [
      "Dual wireless transmitters for 2-person simultaneous audio recording",
      "Compact storage charging case for safety and portability",
      "Intelligent noise suppression chip filters wind and background hum",
      "Plug-and-play auto connection",
      "Low latency 25ms response time"
    ],
    specifications: [
      { label: "Configuration", value: "Dual Channel (2 Mics + 1 Receiver)" },
      { label: "Wireless Distance", value: "30 Meters" },
      { label: "Case Battery", value: "450mAh Charging Box" }
    ],
    compatibility: ["Dual Podcasts", "Field Interviews", "TikTok & YouTube"],
    inTheBox: [
      "2x Nepho NP-61 Transmitters",
      "1x Wireless Receiver",
      "1x Portable Charging Case",
      "Charging Cable",
      "User Manual"
    ],
    image: "/gadget/products/mic-nepho-np61.webp"
  },
  {
    name: "J10 Wireless Lavalier Microphone",
    slug: "j10-wireless-lavalier-microphone",
    brand: "J Series",
    sku: "VG-MC-J10",
    category: "microphones",
    price: 2299,
    compareAtPrice: 3199,
    rating: 4.5,
    reviewCount: 34,
    featured: false,
    badge: "Mini Capsule",
    stockStatus: "in-stock",
    shortDescription: "Ultra mini round capsule wireless lavalier microphone with 2.4GHz transmission, 20m range, 6 hours battery life, and automatic phone pairing.",
    features: [
      "Mini circular capsule design unobtrusive on clothing",
      "20-meter line-of-sight wireless range",
      "6 hours battery duration per full charge",
      "Plug-and-play receiver dongle for smartphones",
      "Acoustic pop filter windscreen included"
    ],
    specifications: [
      { label: "Microphone Shape", value: "Mini Round Capsule" },
      { label: "Range", value: "20 Meters" },
      { label: "Battery", value: "6 Hours" }
    ],
    compatibility: ["Smartphones", "Mobile Video Recording"],
    inTheBox: [
      "J10 Mini Wireless Mic",
      "Receiver Dongle",
      "Charging Cable",
      "User Guide"
    ],
    image: "/gadget/products/mic-j10.webp"
  },
  {
    name: "J68 Wireless Dual Lavalier Microphone System",
    slug: "j68-wireless-dual-microphone",
    brand: "J Series",
    sku: "VG-MC-J68",
    category: "microphones",
    price: 3299,
    compareAtPrice: 4499,
    rating: 4.7,
    reviewCount: 41,
    featured: false,
    badge: "LED Display Case",
    stockStatus: "in-stock",
    shortDescription: "Dual channel wireless lavalier microphone system featuring digital LED battery display charging case, active noise cancellation, and 25m distance.",
    features: [
      "Digital LED display on charging case shows exact battery percentage",
      "Dual microphone transmitters for multi-person recording",
      "Built-in active noise reduction DSP chip",
      "Instant automatic frequency pairing",
      "Up to 25 meters working range"
    ],
    specifications: [
      { label: "Display", value: "Digital LED Battery Level Indicator" },
      { label: "Channels", value: "Dual Wireless Transmitters" },
      { label: "Range", value: "25 Meters" }
    ],
    compatibility: ["Android & iOS Devices", "Vlogging & Live Streaming"],
    inTheBox: [
      "2x J68 Wireless Microphones",
      "1x Receiver",
      "1x LED Display Charging Case",
      "USB Cable",
      "User Manual"
    ],
    image: "/gadget/products/mic-j68.webp"
  },
  {
    name: "J22 Noise Canceling Wireless Lapel Microphone",
    slug: "j22-noise-canceling-wireless-microphone",
    brand: "J Series",
    sku: "VG-MC-J22",
    category: "microphones",
    price: 2799,
    compareAtPrice: 3799,
    rating: 4.6,
    reviewCount: 28,
    featured: false,
    badge: "4-in-1 Multi Adapter",
    stockStatus: "in-stock",
    shortDescription: "Versatile 4-in-1 wireless lapel microphone system with multi-head receiver adapter (Type-C, Lightning, USB-A), smart noise cancellation, and 7-hour battery.",
    features: [
      "4-in-1 multi-adapter receiver works natively with phones, laptops, and PCs",
      "Smart noise reduction processor suppresses wind and background rumble",
      "7 hours of continuous battery operation",
      "20 meters wireless transmission distance",
      "Lightweight clip-on metal collar clamp"
    ],
    specifications: [
      { label: "Adapter Types", value: "Type-C, Lightning & USB-A" },
      { label: "Battery Life", value: "7 Hours" },
      { label: "Distance", value: "20 Meters" }
    ],
    compatibility: ["iPhones", "Android Phones", "Laptops & PC Computers"],
    inTheBox: [
      "J22 Wireless Lapel Mic",
      "4-in-1 Multi Receiver",
      "Charging Cable",
      "User Manual"
    ],
    image: "/gadget/products/mic-j22.webp"
  }
];

async function seed() {
  console.log(`Starting insertion of ${MICROPHONES_DATA.length} microphone products into Supabase...`);

  for (const prod of MICROPHONES_DATA) {
    const sanityId = `seed-${prod.slug}`;
    console.log(`Upserting: ${prod.name} (${prod.slug})`);

    const { data, error } = await supabase
      .from("products")
      .upsert(
        {
          sanity_id: sanityId,
          name: prod.name,
          slug: prod.slug,
          brand: prod.brand,
          sku: prod.sku,
          category: prod.category,
          price: prod.price,
          compare_at_price: prod.compareAtPrice,
          short_description: prod.shortDescription,
          description: [{ _type: "paragraph", text: prod.shortDescription }],
          features: prod.features,
          specifications: prod.specifications,
          compatibility: prod.compatibility,
          in_the_box: prod.inTheBox,
          stock_status: prod.stockStatus,
          rating: prod.rating,
          review_count: prod.reviewCount,
          featured: prod.featured,
          badge: prod.badge,
          status: "published",
          cloudinary_images: [],
        },
        { onConflict: "slug" }
      )
      .select("id")
      .single();

    if (error || !data) {
      console.error(`Error inserting product ${prod.slug}:`, error);
      continue;
    }

    const productId = data.id;

    // Clear existing images for this product and insert new image path
    await supabase.from("product_images").delete().eq("product_id", productId);
    const { error: imgErr } = await supabase.from("product_images").insert({
      product_id: productId,
      url: prod.image,
      sort_order: 0,
      source: "local",
    });

    if (imgErr) {
      console.error(`Error inserting image for ${prod.slug}:`, imgErr);
    } else {
      console.log(`Successfully seeded ${prod.name} with image ${prod.image}`);
    }
  }

  console.log("Microphones seeding process completed!");
}

seed().catch((err) => {
  console.error("Fatal seed error:", err);
  process.exit(1);
});
