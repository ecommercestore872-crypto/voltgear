import type { Metadata } from "next";

import { BetaHomePage } from "@/components/beta/beta-home-page";
import { fetchSiteSettings } from "@/lib/db/store";
import { storeAlternatesLanguages } from "@/lib/seo-rules";
import type { SiteSettings } from "@/lib/types";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  let settings: SiteSettings | null = null;
  try {
    settings = await fetchSiteSettings();
  } catch {
    settings = null;
  }
  const title =
    settings?.seo?.title ||
    "Beta | Buy n Try — Earbuds, Airbuds, Smartwatches & Chargers";
  const description =
    settings?.seo?.description ||
    "Shop earbuds, airbuds, smartwatches, power banks and chargers at Buy n Try. Cash on delivery nationwide.";
  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: "/beta",
      languages: storeAlternatesLanguages("/beta").languages,
    },
    robots: { index: false, follow: false },
  };
}

export default async function BetaPage() {
  return (
    <div className="beta-enhancement-wrapper">
      <style dangerouslySetInnerHTML={{ __html: `
        /* 
         * PREMIUM DARK TECH AESTHETIC (Cyber Forest) 
         * Complements the organic green theme but pushes it into 
         * a modern, high-contrast, glowing tech space.
         */
        :root, body, .gadget-theme {
          --g-cream: #060908 !important;       
          --g-cream-deep: #0a110f !important;  
          --g-charcoal: #e1ede9 !important;    
          
          --g-forest: #00E676 !important;      
          --g-forest-mid: #00C853 !important;  
          --g-sage: #142921 !important;        
          
          --g-taupe: #688f80 !important;       
          --g-sand: #0a110f !important;        
          --g-leaf: #00E676 !important;
          --g-olive: #0b1a15 !important;       
          --g-line: rgba(0, 230, 118, 0.12) !important;
          --g-card-border: rgba(0, 230, 118, 0.15) !important;

          --g-sale: #FF1744 !important;        
          --g-terracotta: #FF1744 !important;
          --g-amber: #00E5FF !important;       
          --g-amber-hover: #18FFFF !important;
          
          --g-blush: #080d0b !important;
          
          background-color: var(--g-cream) !important;
          color: var(--g-charcoal) !important;
        }

        header, .bg-\\[var\\(--g-cream\\)\\]\\/95, .gadget-navbar {
          background-color: rgba(6, 9, 8, 0.85) !important;
          border-bottom: 1px solid var(--g-line) !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
        }

        .gadget-glass, .gadget-glass-deep, .gadget-surface {
          background: rgba(10, 17, 15, 0.6) !important;
          border: 1px solid var(--g-card-border) !important;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6) !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
        }

        .gadget-hover-lift {
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s ease !important;
        }
        .gadget-hover-lift:hover {
          border-color: rgba(0, 230, 118, 0.5) !important;
          box-shadow: 0 0 24px rgba(0, 230, 118, 0.12), 0 12px 40px rgba(0, 0, 0, 0.6) !important;
          transform: translateY(-4px) scale(1.02) !important;
        }

        .gadget-btn-primary {
          background: linear-gradient(135deg, #00C853 0%, #00E676 100%) !important;
          color: #000 !important;
          box-shadow: 0 0 15px rgba(0, 230, 118, 0.25) !important;
          font-weight: 800 !important;
          border: none !important;
          transition: all 0.2s ease !important;
        }
        .gadget-btn-primary:hover {
          background: linear-gradient(135deg, #00E676 0%, #69F0AE 100%) !important;
          box-shadow: 0 0 25px rgba(0, 230, 118, 0.4) !important;
          transform: translateY(-2px) !important;
        }
        
        .gadget-btn-secondary {
          background: rgba(0, 230, 118, 0.05) !important;
          border: 1px solid rgba(0, 230, 118, 0.3) !important;
          color: #00E676 !important;
          transition: all 0.2s ease !important;
        }
        .gadget-btn-secondary:hover {
          background: rgba(0, 230, 118, 0.1) !important;
          border: 1px solid rgba(0, 230, 118, 0.6) !important;
        }

        /* Subtle grid background to look like a tech site */
        body {
          background-image: linear-gradient(rgba(0, 230, 118, 0.03) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(0, 230, 118, 0.03) 1px, transparent 1px) !important;
          background-size: 40px 40px !important;
          background-position: center top !important;
        }
      `}} />
      <BetaHomePage />
    </div>
  );
}
