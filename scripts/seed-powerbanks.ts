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

export const POWERBANKS_DATA = [
  {
    name: "Romoss PEA10A 10000mAh 22.5W Power Bank",
    slug: "romoss-pea10a-10000mah-22-5w",
    brand: "Romoss",
    sku: "VG-PB-PEA10A",
    category: "power-bank",
    price: 4299,
    compareAtPrice: 5999,
    rating: 4.8,
    reviewCount: 41,
    featured: true,
    badge: "22.5W Fast Charge",
    stockStatus: "in-stock",
    shortDescription: "High-speed 10,000mAh portable charger with 22.5W Two-Way Fast Charge, digital LED display, PD 3.0/QC 4.0 support, and multi-layer circuit protection.",
    features: [
      "22.5W Super Fast Two-Way Power Delivery (PD 3.0 & QC 4.0)",
      "High-density 10,000mAh Li-Polymer battery core",
      "Digital LED percentage display for real-time power tracking",
      "Triple output ports (USB-C, USB-A1, USB-A2) for simultaneous charging",
      "FitCharge 10-layer intelligent safety protection system"
    ],
    specifications: [
      { label: "Capacity", value: "10,000mAh (37Wh)" },
      { label: "Max Output Power", value: "22.5W Fast Charge" },
      { label: "Inputs", value: "Type-C (18W PD), Micro-USB (18W), Lightning (10W)" },
      { label: "Outputs", value: "Type-C (22.5W), 2x USB-A (22.5W / 18W)" },
      { label: "Dimensions", value: "142 x 69 x 16 mm (235g)" }
    ],
    compatibility: ["iPhone 12-16 Series", "Samsung Galaxy S/Note", "Google Pixel", "Xiaomi, Oppo, Vivo"],
    inTheBox: [
      "Romoss PEA10A 10000mAh Power Bank",
      "USB-C to USB-C Charging Cable",
      "User Manual & Safety Guide"
    ],
    image: "/gadget/products/powerbank-romoss-pea10a.webp"
  },
  {
    name: "Romoss PHC10 10000mAh Power Bank with Built-in Cables",
    slug: "romoss-phc10-10000mah-cables",
    brand: "Romoss",
    sku: "VG-PB-PHC10",
    category: "power-bank",
    price: 3999,
    compareAtPrice: 5299,
    rating: 4.7,
    reviewCount: 34,
    featured: false,
    badge: "Built-in Cables",
    stockStatus: "in-stock",
    shortDescription: "Ultra-convenient 10,000mAh power bank featuring 3 built-in cables (Lightning, Type-C, Micro-USB), 15W output, and slim travel-ready design.",
    features: [
      "Integrated 3-in-1 built-in cables: Type-C, Lightning & Micro-USB",
      "10,000mAh capacity provides 2-3 full phone charges",
      "Slim lightweight body designed to easily slip into pockets or bags",
      "Charge up to 4 devices simultaneously",
      "Airline approved safe travel battery construction"
    ],
    specifications: [
      { label: "Capacity", value: "10,000mAh (37Wh)" },
      { label: "Output Power", value: "5V/3A (15W Max)" },
      { label: "Integrated Cables", value: "Type-C, Lightning, Micro-USB" },
      { label: "Weight", value: "236g" }
    ],
    compatibility: ["iOS Devices", "Android Phones", "Smartwatches", "Earbuds Cases"],
    inTheBox: [
      "Romoss PHC10 Power Bank",
      "Integrated Charging Cable Set",
      "Instruction Manual"
    ],
    image: "/gadget/products/powerbank-romoss-phc10.webp"
  },
  {
    name: "Romoss Sense 6PS Pro 20000mAh 30W Power Bank",
    slug: "romoss-sense-6ps-pro-20000mah-30w",
    brand: "Romoss",
    sku: "VG-PB-S6PSP",
    category: "power-bank",
    price: 6999,
    compareAtPrice: 9499,
    rating: 4.9,
    reviewCount: 52,
    featured: true,
    badge: "30W PD Fast Charge",
    stockStatus: "in-stock",
    shortDescription: "Flagship 20,000mAh power bank delivering 30W Power Delivery fast charging for smartphones, iPads, and compact laptops with precision LED display.",
    features: [
      "30W High-Power PD Output capable of charging iPads & MacBook Air",
      "Massive 20,000mAh capacity provides 4-5 full phone refills",
      "Precision LED digital percentage readout",
      "3 Inputs (Type-C, Micro-USB, Lightning) & 3 Outputs",
      "Intelligent temperature control & surge protection"
    ],
    specifications: [
      { label: "Capacity", value: "20,000mAh (74Wh)" },
      { label: "Max Output", value: "30W Power Delivery" },
      { label: "Input Ports", value: "Type-C (30W), Micro-USB (18W), Lightning (18W)" },
      { label: "Output Ports", value: "Type-C PD 30W, 2x USB Quick Charge 22.5W" }
    ],
    compatibility: ["MacBook Air, iPad Pro", "iPhone 15/16 Pro", "Samsung S24 Ultra", "Tablets & Handhelds"],
    inTheBox: [
      "Romoss Sense 6PS Pro 20000mAh Power Bank",
      "High Speed USB-C Cable",
      "User Manual"
    ],
    image: "/gadget/products/powerbank-romoss-sense-6ps-pro.webp"
  },
  {
    name: "Romoss PSL 20 / Simple 20 20000mAh 22.5W Power Bank",
    slug: "romoss-psl20-20000mah-22-5w",
    brand: "Romoss",
    sku: "VG-PB-PSL20",
    category: "power-bank",
    price: 5499,
    compareAtPrice: 7499,
    rating: 4.8,
    reviewCount: 38,
    featured: false,
    badge: "20,000mAh Heavy Duty",
    stockStatus: "in-stock",
    shortDescription: "Heavy-duty 20,000mAh power bank engineered with 22.5W two-way fast charging, triple inputs, dual USB outputs, and long-life lithium battery cells.",
    features: [
      "22.5W Two-Way Quick Charge 3.0 & PD 3.0 protocol support",
      "High-capacity 20,000mAh power reserve for long trips",
      "3 Input options (Micro-USB, Lightning, USB Type-C)",
      "Multi-layer chip safety protection shielding against voltage spikes",
      "Durable heat-resistant PC+ABS outer shell"
    ],
    specifications: [
      { label: "Capacity", value: "20,000mAh (74Wh)" },
      { label: "Max Power", value: "22.5W" },
      { label: "Ports", value: "3 Inputs / 3 Outputs" },
      { label: "Dimensions", value: "167 x 80 x 32.8 mm" }
    ],
    compatibility: ["All iOS & Android Smartphones", "Bluetooth Accessories"],
    inTheBox: [
      "Romoss PSL 20 20000mAh Power Bank",
      "Charging Cable",
      "User Guide"
    ],
    image: "/gadget/products/powerbank-romoss-psl20.webp"
  },
  {
    name: "Romoss Sense 4S Mini 10000mAh Power Bank",
    slug: "romoss-sense-4s-mini-10000mah",
    brand: "Romoss",
    sku: "VG-PB-S4SM",
    category: "power-bank",
    price: 3499,
    compareAtPrice: 4799,
    rating: 4.6,
    reviewCount: 29,
    featured: false,
    badge: "Pocket Mini",
    stockStatus: "in-stock",
    shortDescription: "Ultra-compact palm-sized 10,000mAh power bank featuring 22.5W fast charge, dual USB outputs, and credit-card footprint.",
    features: [
      "Pocket-sized ultra portable body (fits in palm of hand)",
      "22.5W fast charging speed for rapid phone top-ups",
      "Dual USB-A & USB-C ports for charging two devices at once",
      "4-stage LED battery indicator lights",
      "Intelligent power auto-matching for delicate gadgets"
    ],
    specifications: [
      { label: "Capacity", value: "10,000mAh (37Wh)" },
      { label: "Max Output", value: "22.5W Fast Charge" },
      { label: "Size", value: "Credit card footprint (approx 91 x 62 x 23 mm)" },
      { label: "Weight", value: "198g" }
    ],
    compatibility: ["iPhone", "Samsung", "Earbuds", "Smartwatches"],
    inTheBox: [
      "Romoss Sense 4S Mini Power Bank",
      "USB-C Charging Cable",
      "Manual"
    ],
    image: "/gadget/products/powerbank-romoss-sense-4s-mini.webp"
  },
  {
    name: "Romoss PAC 10 10000mAh Wall Plug & Lanyard Power Bank",
    slug: "romoss-pac10-10000mah-wall-plug",
    brand: "Romoss",
    sku: "VG-PB-PAC10",
    category: "power-bank",
    price: 4899,
    compareAtPrice: 6499,
    rating: 4.8,
    reviewCount: 23,
    featured: true,
    badge: "AC Plug Combo",
    stockStatus: "in-stock",
    shortDescription: "Versatile 2-in-1 power bank with foldable AC wall plug, integrated lanyard charging cable, 22.5W PD output, and 10,000mAh capacity.",
    features: [
      "Built-in foldable AC wall plug (plugs directly into wall socket)",
      "Built-in lanyard charging cable for easy carrying and instant use",
      "22.5W PD & QC fast charging output",
      "10,000mAh battery reserve for all-day power",
      "Dual mode function: Acts as a wall charger and portable battery"
    ],
    specifications: [
      { label: "Capacity", value: "10,000mAh (37Wh)" },
      { label: "AC Input", value: "100-240V ~ 50/60Hz 0.5A Wall Plug" },
      { label: "DC Output", value: "22.5W PD / QC 3.0" },
      { label: "Built-in Cable", value: "Type-C / Lightning Lanyard Cable" }
    ],
    compatibility: ["Global Travel Use", "iPhone", "Android Phones"],
    inTheBox: [
      "Romoss PAC 10 Wall Plug Power Bank",
      "User Manual"
    ],
    image: "/gadget/products/powerbank-romoss-pac10.webp"
  },
  {
    name: "Baseus Adaman 20000mAh 22.5W Metal Power Bank",
    slug: "baseus-adaman-20000mah-22-5w",
    brand: "Baseus",
    sku: "VG-PB-BAD22",
    category: "power-bank",
    price: 8999,
    compareAtPrice: 11999,
    rating: 4.9,
    reviewCount: 46,
    featured: true,
    badge: "Alloy Shell",
    stockStatus: "in-stock",
    shortDescription: "Premium aluminum alloy 20,000mAh power bank featuring 22.5W SCP/PD fast charge, smart LED digital display, and multi-protocol compatibility.",
    features: [
      "Aircraft-grade aluminum alloy metallic casing with matte finish",
      "22.5W SCP (Huawei SuperCharge), PD 20W (iPhone), and QC 3.0",
      "Real-time digital LED screen displaying current, voltage & battery %",
      "20,000mAh capacity charges iPhone 15 up to 4.5 times",
      "Multi-protection safety matrix against overcurrent & heat"
    ],
    specifications: [
      { label: "Capacity", value: "20,000mAh (74Wh)" },
      { label: "Shell Material", value: "Aluminum Alloy Metal" },
      { label: "Max Output", value: "22.5W Fast Charge" },
      { label: "Display", value: "Voltage / Current / Percentage LED Screen" }
    ],
    compatibility: ["iPhone 12-16", "Huawei SCP", "Samsung Fast Charge", "Xiaomi"],
    inTheBox: [
      "Baseus Adaman 20000mAh Metal Power Bank",
      "USB-C Fast Cable",
      "Warranty Card & Manual"
    ],
    image: "/gadget/products/powerbank-baseus-adaman-20000.webp"
  },
  {
    name: "Baseus 65W 20000mAh Power Bank for Laptops",
    slug: "baseus-65w-20000mah-laptop-power-bank",
    brand: "Baseus",
    sku: "VG-PB-B65W20",
    category: "power-bank",
    price: 15999,
    compareAtPrice: 19999,
    rating: 5.0,
    reviewCount: 58,
    featured: true,
    badge: "65W Laptop PD",
    stockStatus: "in-stock",
    shortDescription: "High-performance 65W Power Delivery 20,000mAh power bank designed to fast charge MacBooks, Dell XPS, Surface Pro, tablets, and smartphones.",
    features: [
      "65W High Power Output via USB-C PD to fast charge laptops & Ultrabooks",
      "Bi-directional 60W fast recharging (refills power bank in 90 mins)",
      "20,000mAh high-density power cell",
      "Status LED display monitoring wattage output in real-time",
      "Supports PD 3.0, QC 4.0, AFC, SCP protocols"
    ],
    specifications: [
      { label: "Capacity", value: "20,000mAh (74Wh)" },
      { label: "USB-C Output", value: "5V/3A, 9V/3A, 12V/3A, 15V/3A, 20V/3.25A (65W Max)" },
      { label: "USB-A Output", value: "4.5V/5A, 5V/4.5A, 9V/3A, 12V/2.5A (30W Max)" },
      { label: "Recharge Speed", value: "60W Fast Input" }
    ],
    compatibility: ["MacBook Pro/Air", "Dell XPS, HP Spectre", "iPad Pro", "iPhone & Galaxy"],
    inTheBox: [
      "Baseus 65W 20000mAh Laptop Power Bank",
      "100W E-Mark Type-C to Type-C Cable",
      "User Manual"
    ],
    image: "/gadget/products/powerbank-baseus-65w-20000.webp"
  },
  {
    name: "WiWU 10000mAh 35W Retractable WI-P049 Power Bank & Wall Adapter",
    slug: "wiwu-10000mah-35w-retractable-wi-p049",
    brand: "WiWU",
    sku: "VG-PB-WI049",
    category: "power-bank",
    price: 7499,
    compareAtPrice: 9999,
    rating: 4.8,
    reviewCount: 31,
    featured: true,
    badge: "Retractable Cable",
    stockStatus: "in-stock",
    shortDescription: "Premium 35W PD power bank featuring built-in retractable Type-C cable, integrated wall charger plug, and digital percentage display.",
    features: [
      "35W PD High-Speed charging output for smartphones & iPads",
      "Built-in 70cm smooth retractable Type-C cable",
      "Integrated folding wall plug (functions as 35W wall charger & power bank)",
      "Digital LED percentage power display",
      "Global voltage support (100V-240V) with US/UK travel plug accessories"
    ],
    specifications: [
      { label: "Capacity", value: "10,000mAh / 38.5Wh" },
      { label: "PD Power", value: "35W Fast Charge" },
      { label: "Retractable Cable", value: "Built-in Type-C (Up to 35W Output)" },
      { label: "AC Input", value: "100-240V ~ 50/60Hz" }
    ],
    compatibility: ["iPhone 15/16 Pro", "iPad Air/Pro", "Samsung Galaxy S Series", "Android"],
    inTheBox: [
      "WiWU WI-P049 35W Retractable Power Bank",
      "Travel Plug Adapters",
      "User Manual"
    ],
    image: "/gadget/products/powerbank-wiwu-wip049.webp"
  },
  {
    name: "Wireless WMS10 10000mAh MagSafe Powerbank",
    slug: "wireless-wms10-10000mah-magsafe",
    brand: "Romoss / WMS",
    sku: "VG-PB-WMS10",
    category: "power-bank",
    price: 6499,
    compareAtPrice: 8499,
    rating: 4.7,
    reviewCount: 37,
    featured: true,
    badge: "MagSafe 15W",
    stockStatus: "in-stock",
    shortDescription: "Magnetic wireless 10,000mAh power bank engineered for iPhone MagSafe alignment with 15W wireless charging and 20W PD wired output.",
    features: [
      "Strong N52 magnetic lock designed specifically for MagSafe iPhones",
      "15W Fast Wireless Charging + 20W PD Type-C wired charging",
      "Compact ergonomic grip design that doesn't block phone camera lenses",
      "Charge wireless and wired devices simultaneously",
      "Intelligent temperature detection preventing phone overheating"
    ],
    specifications: [
      { label: "Capacity", value: "10,000mAh (37Wh)" },
      { label: "Wireless Output", value: "5W / 7.5W / 10W / 15W MagSafe" },
      { label: "Wired Output", value: "USB-C PD 20W" },
      { label: "Magnet Strength", value: "13N N52 Neodymium Magnets" }
    ],
    compatibility: ["iPhone 12, 13, 14, 15, 16 Series", "MagSafe Cases", "Qi Wireless Devices"],
    inTheBox: [
      "Wireless WMS10 10000mAh MagSafe Power Bank",
      "Type-C Charging Cable",
      "User Guide"
    ],
    image: "/gadget/products/powerbank-wms10-magsafe.webp"
  },
  {
    name: "WS C10 10000mAh Wireless Powerbank",
    slug: "ws-c10-10000mah-wireless-powerbank",
    brand: "WS Wireless",
    sku: "VG-PB-WSC10",
    category: "power-bank",
    price: 4999,
    compareAtPrice: 6499,
    rating: 4.6,
    reviewCount: 22,
    featured: false,
    badge: "Qi Wireless",
    stockStatus: "in-stock",
    shortDescription: "Sleek 10,000mAh wireless power bank with 15W Qi wireless pad, dual USB-A and Type-C outputs, and soft-touch rubberized body.",
    features: [
      "15W Qi-certified wireless charging pad surface",
      "10,000mAh capacity supplying 2-3 full phone recharges",
      "Soft-touch anti-slip rubberized coating",
      "Dual USB-A + Type-C wired outputs for simultaneous multi-device power",
      "LED battery indicator dots"
    ],
    specifications: [
      { label: "Capacity", value: "10,000mAh" },
      { label: "Wireless Output", value: "15W Max" },
      { label: "Wired Output", value: "22.5W Fast Charge" }
    ],
    compatibility: ["Qi Enabled Smartphones", "Earbuds Wireless Cases"],
    inTheBox: [
      "WS C10 Wireless Powerbank",
      "Charging Cable",
      "Manual"
    ],
    image: "/gadget/products/powerbank-ws-c10.webp"
  },
  {
    name: "Kniyo Wireless Powerbank 5000mAh 20W",
    slug: "kniyo-wireless-powerbank-5000mah-20w",
    brand: "Kniyo",
    sku: "VG-PB-KNIYO5K",
    category: "power-bank",
    price: 3899,
    compareAtPrice: 4999,
    rating: 4.6,
    reviewCount: 19,
    featured: false,
    badge: "Ultra Pocket 5K",
    stockStatus: "in-stock",
    shortDescription: "Ultra-slim 5,000mAh magnetic wireless power bank with 20W PD fast wired output, lightweight pocket snap-on design, and metallic trim.",
    features: [
      "Ultra-slim featherweight design (snaps seamlessly behind phone)",
      "15W Wireless + 20W PD Type-C fast charging",
      "5,000mAh emergency reserve providing 1 full phone charge",
      "Anti-scratch matte surface with metallic alloy border trim",
      "Foreign object detection (FOD) protection safety sensor"
    ],
    specifications: [
      { label: "Capacity", value: "5,000mAh (18.5Wh)" },
      { label: "Wireless Power", value: "15W Max" },
      { label: "Type-C Output", value: "PD 20W" },
      { label: "Thickness", value: "12mm Slim Profile" }
    ],
    compatibility: ["iPhone 12-16 MagSafe", "Qi Compatible Phones"],
    inTheBox: [
      "Kniyo 5000mAh Wireless Powerbank",
      "Type-C Cable",
      "User Manual"
    ],
    image: "/gadget/products/powerbank-kniyo-5000.webp"
  },
  {
    name: "Red Logo Wireless 50000mAh 15W Powerbank",
    slug: "red-logo-wireless-50000mah-15w",
    brand: "Red Logo",
    sku: "VG-PB-RED50K",
    category: "power-bank",
    price: 9999,
    compareAtPrice: 13999,
    rating: 4.8,
    reviewCount: 35,
    featured: true,
    badge: "50,000mAh Monster",
    stockStatus: "in-stock",
    shortDescription: "Extreme 50,000mAh monster capacity power bank with 15W wireless charging, quad USB outputs, built-in LED camping flashlight, and heavy-duty casing.",
    features: [
      "Massive 50,000mAh capacity provides 10-12 full smartphone charges",
      "15W top wireless charging pad surface",
      "Quad USB-A output ports + Type-C PD port for charging 5 devices simultaneously",
      "Bright multi-mode LED camping flashlight built into the chassis",
      "Heavy-duty protective casing with leatherette carry strap"
    ],
    specifications: [
      { label: "Capacity", value: "50,000mAh (185Wh)" },
      { label: "Wireless Output", value: "15W Wireless Pad" },
      { label: "Wired Outputs", value: "4x USB-A (22.5W) + 1x Type-C PD (20W)" },
      { label: "Extra Feature", value: "High-Lumen Dual LED Emergency Light" }
    ],
    compatibility: ["Smartphones, Tablets, Camping Gear, USB Fans, Cameras"],
    inTheBox: [
      "Red Logo Wireless 50000mAh Powerbank",
      "Heavy-Duty Fast Charging Cable",
      "Lanyard Strap & Manual"
    ],
    image: "/gadget/products/powerbank-red-logo-50000.webp"
  }
];

async function seed() {
  console.log(`Starting insertion of ${POWERBANKS_DATA.length} power bank products into Supabase...`);

  for (const prod of POWERBANKS_DATA) {
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

  console.log("Power Banks seeding process completed!");
}

seed().catch((err) => {
  console.error("Fatal seed error:", err);
  process.exit(1);
});
