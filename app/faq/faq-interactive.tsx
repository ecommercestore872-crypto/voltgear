"use client";

import { useState } from "react";
import {
  ClipboardList,
  Truck,
  CreditCard,
  ShieldCheck,
  MapPin,
  Briefcase,
  User,
  Plus,
  Minus
} from "lucide-react";
import { cn } from "@/lib/utils";

const FAQ_CATEGORIES = [
  { id: "orders", title: "Orders", count: 8, icon: ClipboardList },
  { id: "shipping", title: "Shipping", count: 7, icon: Truck },
  { id: "payments", title: "Payments", count: 6, icon: CreditCard },
  { id: "warranty", title: "Warranty & Returns", count: 6, icon: ShieldCheck },
  { id: "support", title: "Product Support", count: 10, icon: MapPin }, // using MapPin as placeholder for location-support or similar
  { id: "bulk", title: "Bulk Orders", count: 4, icon: Briefcase },
  { id: "account", title: "Account", count: 5, icon: User },
];

const FAQS_BY_CATEGORY: Record<string, { id: string; question: string; answer: string }[]> = {
  orders: [
    {
      id: "q_orders_1",
      question: "How long does delivery take?",
      answer: "We deliver across Pakistan in 1–2 business days for major cities and 2–4 business days for other areas.\n\nOnce your order is dispatched, you will receive a tracking link via SMS and email to monitor your delivery in real time."
    },
    {
      id: "q_orders_2",
      question: "Do you offer Cash on Delivery?",
      answer: "Yes, we offer Cash on Delivery (COD) nationwide across Pakistan for all eligible orders. You can select this option at checkout."
    },
    {
      id: "q_orders_3",
      question: "How can I track my order?",
      answer: "Use the tracking link sent to your email and SMS. Alternatively, log into your account and view your order history for real-time updates."
    },
    {
      id: "q_orders_4",
      question: "What is your warranty policy?",
      answer: "All Buy n Try products come with a 1 Year Official Warranty against manufacturing defects.\n\nIf you face any issue, simply contact our support team with your order details and we'll arrange a replacement or repair.\n\nNote: Warranty does not cover physical damage, misuse, or normal wear and tear."
    },
    {
      id: "q_orders_5",
      question: "Can I return a damaged product?",
      answer: "Absolutely. If you receive a damaged product, please inform us within 7 days of delivery with photographic evidence, and we will initiate a hassle-free return and replacement."
    },
    {
      id: "q_orders_6",
      question: "Are your chargers compatible with iPhone and Android devices?",
      answer: "Yes, we stock PD chargers and cables that support both iOS (Apple) and Android devices. Please check individual product descriptions for specific compatibility limits (e.g. 20W vs 65W)."
    },
    {
      id: "q_orders_7",
      question: "Do you accept bulk or corporate orders?",
      answer: "Yes! We cater to corporate supplies and B2B bulk ordering. Please navigate to the 'Bulk Orders' section and submit an inquiry for a custom quotation."
    },
    {
      id: "q_orders_8",
      question: "How quickly does support respond?",
      answer: "Our dedicated support team aims to reply within 15-30 minutes during standard business hours."
    }
  ],
  // Fallbacks for other categories just to prevent crashing, in a real app these would be populated from CMS
  shipping: [],
  payments: [],
  warranty: [],
  support: [],
  bulk: [],
  account: []
};

export function FaqInteractive() {
  const [activeCategory, setActiveCategory] = useState("orders");
  const [openFaq, setOpenFaq] = useState<string | null>("q_orders_1");

  const activeFaqs = FAQS_BY_CATEGORY[activeCategory] || FAQS_BY_CATEGORY["orders"];

  return (
    <div className="flex flex-col gap-10">
      {/* Category Tabs Row (Horizontal Scroll on Mobile) */}
      <div className="flex overflow-x-auto pb-4 gap-4 hide-scrollbar snap-x snap-mandatory lg:grid lg:grid-cols-7 lg:gap-4 lg:overflow-visible lg:pb-0">
        {FAQ_CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                setOpenFaq(null); // Reset open accordion on category change
              }}
              className={cn(
                "snap-start shrink-0 w-36 lg:w-auto flex flex-col items-center justify-center p-5 rounded-2xl border transition-all duration-200",
                isActive
                  ? "bg-white border-primary shadow-sm drop-shadow-sm text-primary"
                  : "bg-white border-border/50 hover:border-primary/40 text-muted-foreground hover:bg-primary/5"
              )}
            >
              <cat.icon className={cn("h-6 w-6 mb-3", isActive ? "text-primary" : "text-[#7DBAB6]")} />
              <span className="text-sm font-bold text-foreground">{cat.title}</span>
              <span className="text-[11px] font-medium text-muted-foreground mt-0.5">{cat.count} Questions</span>
            </button>
          );
        })}
      </div>

      {/* Accordion List */}
      <div className="max-w-4xl mx-auto w-full flex flex-col gap-3">
        {activeFaqs.map((faq) => {
          const isOpen = openFaq === faq.id;
          return (
            <div
              key={faq.id}
              className={cn(
                "w-full rounded-2xl border bg-white overflow-hidden transition-all duration-300",
                isOpen ? "border-border shadow-sm border-l-[6px] border-l-primary" : "border-border/60 hover:border-border"
              )}
            >
              <button
                onClick={() => setOpenFaq(isOpen ? null : faq.id)}
                className="w-full text-left px-5 py-5 flex items-start gap-4 items-center focus:outline-none"
              >
                <div
                  className={cn(
                    "flex-shrink-0 flex items-center justify-center w-8 h-8 rounded shrink-0",
                    isOpen
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-white border text-primary border-primary/20"
                  )}
                >
                  {isOpen ? <Minus className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                <span className="text-base font-bold text-foreground leading-tight">{faq.question}</span>
              </button>
              
              <div
                className={cn(
                  "overflow-hidden transition-all duration-300",
                  isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                )}
              >
                 <div className="px-5 pb-6 pl-[4.25rem] text-sm text-muted-foreground leading-relaxed">
                   {/* Handle newlines in answers */}
                   {faq.answer.split("\n\n").map((para, i) => (
                     <p key={i} className={i > 0 ? "mt-4" : ""}>{para}</p>
                   ))}
                 </div>
              </div>
            </div>
          );
        })}
        {activeFaqs.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm border border-dashed rounded-xl">
             No specific questions matched for this category yet.
          </div>
        )}
      </div>
    </div>
  );
}
