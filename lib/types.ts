import type { PortableTextBlock } from "@portabletext/types";

export type StockStatus = "in-stock" | "low-stock" | "out-of-stock";
export type ProductCategory = string;

export interface ProductReview {
  name?: string;
  rating?: number;
  date?: string;
  comment?: string;
  verified?: boolean;
  image?: string;
  isDemo?: boolean;
}

export type StoreImage = string;

export interface ProductVariant {
  _key?: string;
  name: string;
  sku?: string;
  price?: number;
  compareAtPrice?: number;
  stockStatus: StockStatus;
  image?: StoreImage;
  isDefault?: boolean;
}

export interface ProductVideo {
  url?: string;
  cloudinaryPublicId?: string;
  poster?: StoreImage;
}

export interface ProductFaqItem {
  _key?: string;
  question: string;
  answer: string;
}

export interface Product {
  _id: string;
  name: string;
  slug: string;
  category: ProductCategory;
  price: number;
  compareAtPrice?: number;
  images: StoreImage[];
  cloudinaryImages?: string[];
  shortDescription?: string;
  description?: PortableTextBlock[];
  features?: string[];
  specifications?: { label: string; value: string }[];
  compatibility?: string[];
  inTheBox?: string[];
  productVideo?: ProductVideo;
  variants?: ProductVariant[];
  productFaq?: ProductFaqItem[];
  sku?: string;
  brand?: string;
  stockStatus: StockStatus;
  rating?: number;
  reviewCount?: number;
  reviews?: ProductReview[];
  featured?: boolean;
  badge?: string;
  isDemo?: boolean;
}

export interface HeroSection {
  headline: string;
  subheadline?: string;
  backgroundImage?: StoreImage;
  backgroundVideo?: string;
  primaryCta?: { label?: string; href?: string };
  secondaryCta?: { label?: string; href?: string };
  stats?: { value?: string; label?: string }[];
  featuredProduct?: Product;
}

export interface HeroSlide {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  product: Product;
  sortOrder: number;
}

export interface Testimonial {
  customerName: string;
  reviewText: string;
  rating: number;
  product?: string;
  verified?: boolean;
  isDemo?: boolean;
}

export interface SiteSettings {
  brandName: string;
  tagline?: string;
  logo?: StoreImage;
  primaryColor?: string;
  secondaryColor?: string;
  theme?: "dark" | "light";
  headingFont?: "space-grotesk" | "sora" | "system";
  bodyFont?: "jakarta" | "inter" | "manrope" | "system";
  currency?: string;
  email?: string;
  phone?: string;
  address?: string;
  socialLinks?: { platform?: string; url?: string }[];
  freeShippingThreshold?: number;
  shippingFee?: number;
  returnPolicy?: string;
  warrantyInfo?: string;
  codEnabled?: boolean;
  whatsappNumber?: string;
  warrantyMonths?: number;
  returnWindowDays?: number;
  announcement?: {
    enabled?: boolean;
    message?: string;
    countdownEnabled?: boolean;
    startsAt?: string;
    endsAt?: string;
  };
  seo?: { title?: string; description?: string };
  homeSections?: { id: string; enabled: boolean }[];
}

export type ContentBlock =
  | { _type: "heading"; text?: string; level?: "h2" | "h3" | "h4" }
  | { _type: "paragraph"; text?: string }
  | {
      _type: "list";
      type?: "bullet" | "number";
      items?: string[];
    }
  | { _type: "callout"; title?: string; text?: string }
  | {
      _type: "relatedProducts";
      heading?: string;
      products?: Product[];
    }
  | { _type: "faq"; items?: { question: string; answer: string }[] }
  | { _type: "inlineImage"; image?: StoreImage; dimensions?: { width?: number; height?: number } }
  | { _type: "quote"; text?: string }
  | { _type: "cta"; label?: string; href?: string }
  | { _type: "contactForm"; heading?: string };

export interface Page {
  title: string;
  slug: string;
  pageType?: "static" | "blog";
  excerpt?: string;
  coverImage?: StoreImage;
  publishedAt?: string;
  author?: string;
  sections?: ContentBlock[];
    keywords?: string[];
    seo?: { title?: string; description?: string };
    isDemo?: boolean;
}

export interface OrderCustomer {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal?: string;
}

export interface OrderItem {
  slug?: string;
  name?: string;
  price?: number;
  quantity?: number;
  variantKey?: string;
  variantName?: string;
  variantSku?: string;
  lineTotal?: number;
}

export type OrderStatus =
  | "new"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface OrderStatusHistoryEntry {
  status: OrderStatus;
  note?: string;
  at?: string;
}

export interface Order {
  _id: string;
  orderId: string;
  customer?: OrderCustomer;
  items?: OrderItem[];
  payment?: string;
  subtotal?: number;
  shipping?: number;
  total?: number;
  status?: OrderStatus;
  statusUpdatedAt?: string;
  statusHistory?: OrderStatusHistoryEntry[];
  createdAt: string;
  isDemo?: boolean;
}

export type EmailEventKind =
  | "order-confirmation"
  | "post-purchase"
  | "abandoned-cart"
  | "win-back";

export type MessageStatus = "queued" | "sent" | "failed";

export interface BroadcastContact {
  id: string;
  phone: string;
  name?: string;
  city?: string;
  note?: string;
  source: "order" | "manual";
}

export interface MessageRecipient {
  phone: string;
  name?: string;
  status: MessageStatus;
  messageId?: string;
  sentAt?: string;
  error?: string;
}

export interface MessageCampaign {
  _id: string;
  name?: string;
  text: string;
  recipients: MessageRecipient[];
  sent: number;
  failed: number;
  queued: number;
  createdAt: string;
}

