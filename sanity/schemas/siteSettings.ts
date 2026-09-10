/* eslint-disable @typescript-eslint/no-explicit-any */
export const siteSettings = {
  name: "siteSettings",
  title: "Site Settings",
  type: "document",
  fields: [
    {
      name: "brandName",
      title: "Brand Name",
      type: "string",
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: "tagline",
      title: "Tagline",
      type: "string",
    },
    {
      name: "logo",
      title: "Logo",
      type: "image",
      description: "Recommended: transparent PNG, square",
    },
    {
      name: "primaryColor",
      title: "Primary Brand Color (hex)",
      type: "string",
      description: "e.g. #2563eb — used for buttons and accents",
    },
    {
      name: "secondaryColor",
      title: "Secondary Brand Color (hex)",
      type: "string",
      description: "e.g. #0ea5e9",
    },
    {
      name: "theme",
      title: "Color Theme",
      type: "string",
      options: {
        list: [
          {
            title: "Dark Premium (electric blue accents)",
            value: "dark",
          },
          {
            title: "Light Minimal (white/black)",
            value: "light",
          },
        ],
        layout: "radio",
      },
      initialValue: "dark",
      description:
        "Base theme. Brand colors above override the accent color on top of it. Visitors can switch dark/bright from the navbar toggle; this is the default for first-time visitors.",
    },
    {
      name: "headingFont",
      title: "Heading Font",
      type: "string",
      options: {
        list: [
          { title: "Space Grotesk (techy, geometric)", value: "space-grotesk" },
          { title: "Sora (bold, modern)", value: "sora" },
          { title: "System Sans", value: "system" },
        ],
        layout: "radio",
      },
      initialValue: "sora",
    },
    {
      name: "bodyFont",
      title: "Body Font",
      type: "string",
      options: {
        list: [
          { title: "Plus Jakarta Sans (friendly, readable)", value: "jakarta" },
          { title: "Inter (clean, readable)", value: "inter" },
          { title: "Manrope (friendly, readable)", value: "manrope" },
          { title: "System Sans", value: "system" },
        ],
        layout: "radio",
      },
      initialValue: "jakarta",
    },
    {
      name: "currency",
      title: "Currency",
      type: "string",
      initialValue: "PKR",
      options: {
        list: ["PKR", "USD"],
      },
    },
    {
      name: "email",
      title: "Contact Email",
      type: "string",
    },
    {
      name: "phone",
      title: "Phone",
      type: "string",
    },
    {
      name: "address",
      title: "Address",
      type: "text",
      rows: 2,
    },
    {
      name: "socialLinks",
      title: "Social Links",
      type: "array",
      of: [
        {
          type: "object",
          name: "social",
          fields: [
            { name: "platform", title: "Platform", type: "string",
              description: "Icons are shown for: Facebook, Instagram, X (Twitter), TikTok, YouTube, LinkedIn, WhatsApp, Pinterest, GitHub, Website. Other values fall back to a globe icon.",
              options: {
                list: ["facebook", "instagram", "x", "youtube", "tiktok", "linkedin", "whatsapp", "pinterest", "github", "website"],
                allowCustomValue: true,
              },
            },
            { name: "url", title: "URL", type: "url" },
          ],
        },
      ],
    },
    {
      name: "headerLinks",
      title: "Header / Hamburger Links",
      type: "array",
      of: [
        {
          type: "object",
          name: "link",
          fields: [
            { name: "label", title: "Label", type: "string" },
            { name: "href", title: "URL", type: "string" },
          ],
        },
      ],
      description: "Links to display inside the site's hamburger menu on all devices.",
    },
    {
      name: "freeShippingThreshold",
      title: "Free Shipping Threshold (PKR)",
      type: "number",
      description: "Orders above this amount ship free",
    },
    {
      name: "shippingFee",
      title: "Standard Shipping Fee (PKR)",
      type: "number",
      description: "Flat fee charged below the free-shipping threshold",
    },
    {
      name: "returnPolicy",
      title: "Return Policy (short summary)",
      type: "string",
      description: "Legacy free-text note. The structured 'Return Window (days)' field below is what the storefront displays.",
    },
    {
      name: "warrantyInfo",
      title: "Warranty Info (short summary)",
      type: "string",
      description: "Legacy free-text note. The structured 'Warranty Duration (months)' field below is what the storefront displays.",
    },
    {
      name: "warrantyMonths",
      title: "Warranty Duration (months)",
      type: "number",
      description: "E.g. 24 for a 2-year warranty. Leave empty if warranty terms are not yet confirmed — the storefront will not display any duration claim.",
      validation: (Rule: any) =>
        Rule.min(1).warning("Must be a positive number of months"),
    },
    {
      name: "returnWindowDays",
      title: "Return Window (days)",
      type: "number",
      description: "E.g. 7 or 30. Leave empty if return terms are not yet confirmed — the storefront will not display any return-period claim.",
      validation: (Rule: any) =>
        Rule.min(1).warning("Must be a positive number of days"),
    },
    {
      name: "codEnabled",
      title: "Cash on Delivery",
      type: "boolean",
      initialValue: true,
      description: "Whether cash on delivery is offered at checkout.",
    },
    {
      name: "whatsappNumber",
      title: "WhatsApp Number",
      type: "string",
      description: "E.g. +92 300 0000000. Used for customer assistance links.",
    },
    {
      name: "announcement",
      title: "Announcement Bar",
      type: "object",
      description:
        "Optional announcement shown across the top of every page. A countdown is only shown while the promotion window is active.",
      fields: [
        {
          name: "enabled",
          title: "Show Announcement",
          type: "boolean",
          initialValue: false,
        },
        {
          name: "message",
          title: "Message",
          type: "string",
          description: "E.g. 'Free shipping on orders over Rs 5,000'",
        },
        {
          name: "countdownEnabled",
          title: "Show Countdown",
          type: "boolean",
          initialValue: false,
          description: "Only shown while the promotion window below is active.",
        },
        {
          name: "startsAt",
          title: "Starts At",
          type: "datetime",
          description: "Promotion start (countdown hidden before this).",
        },
        {
          name: "endsAt",
          title: "Ends At",
          type: "datetime",
          description: "Promotion end (countdown disappears after this — it never restarts).",
        },
      ],
      initialValue: { enabled: false, countdownEnabled: false },
    },
    {
      name: "homeBestsellersTitle",
      title: "Homepage Bestsellers Title",
      type: "string",
      description: "Fallback if empty: 'Best Sellers'",
    },
    {
      name: "homeOffersTitle",
      title: "Homepage Offers Title",
      type: "string",
      description: "Fallback if empty: 'Best Offers'",
    },
    {
      name: "homeCategoriesTitle",
      title: "Homepage Categories Title",
      type: "string",
      description: "Fallback if empty: 'Shop by Categories'",
    },
    {
      name: "homeFeaturedEyebrow",
      title: "Homepage Featured Eyebrow",
      type: "string",
      description: "Fallback if empty: 'Featured'",
    },
    {
      name: "homeFeaturedTitle",
      title: "Homepage Featured Title",
      type: "string",
      description: "Fallback if empty: 'Staff pick'",
    },
    {
      name: "homeFeaturedSubtitle",
      title: "Homepage Featured Subtitle",
      type: "string",
      description: "Fallback if empty: 'One standout product worth a closer look — clear price, ready to buy.'",
    },
    {
      name: "seo",
      title: "SEO",
      type: "object",
      fields: [
        { name: "title", title: "Default Meta Title", type: "string" },
        {
          name: "description",
          title: "Default Meta Description",
          type: "text",
          rows: 2,
        },
      ],
    },
  ],
  preview: {
    select: { title: "brandName" },
  },
};
