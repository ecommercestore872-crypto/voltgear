export const FORBIDDEN_AUTOPILOT_COPY = [
  "ONLINE",
  "OFFLINE",
  "SHADOW",
  "hours saved",
  "100% synced",
  "Autonomous commerce engine",
  "updated successfully",
  "Telemetry Active",
];

export type AutomationBlock = {
  id: "dispatch" | "rescue" | "settlement" | "reorder" | "ads";
  title: string;
  purpose: string;
  truth: string;
  controlLabel: string;
  controlHref: string;
};

export const AUTOMATION_BLOCKS: AutomationBlock[] = [
  {
    id: "dispatch",
    title: "Order to dispatch",
    purpose: "Book PostEx when phone, address, and city look valid.",
    truth: "Only AUTO_READY new/processing orders. Off until you turn Auto-book on, or press Book ready now.",
    controlLabel: "Open an order and Book with PostEx",
    controlHref: "/admin/orders",
  },
  {
    id: "rescue",
    title: "Delivery rescue",
    purpose: "Read PostEx tracking and mark delivered when the courier reports delivered.",
    truth: "No customer self-service portal. Failed deliveries stay shipped until you change them.",
    controlLabel: "Refresh tracking on this page, or change status on the order",
    controlHref: "/admin/orders",
  },
  {
    id: "settlement",
    title: "COD settlement",
    purpose: "Match a courier payout file to orders that already have tracking.",
    truth: "PostEx does not send payouts here. Upload a CSV (tracking, collected, fee).",
    controlLabel: "Upload payout CSV on this page",
    controlHref: "/admin/autopilot/settings",
  },
  {
    id: "reorder",
    title: "Inventory reorder",
    purpose: "Later: warn before you sell out.",
    truth: "Not running as Autopilot.",
    controlLabel: "Set Units on hand on a product",
    controlHref: "/admin/products",
  },
  {
    id: "ads",
    title: "Ad spend",
    purpose: "Later: suggest where to spend on ads.",
    truth: "Ad accounts are not connected.",
    controlLabel: "See catalog price and units",
    controlHref: "/admin/autopilot/ads",
  },
];

export function countPostexTracked(
  orders: { isDemo?: boolean; postexTrackingNumber?: string | null }[]
): number {
  return orders.filter((o) => !o.isDemo && Boolean((o.postexTrackingNumber ?? "").trim())).length;
}

export function unitsLabel(quantity: number | null | undefined): string {
  if (quantity == null || !Number.isFinite(quantity)) return "Unlimited";
  return String(quantity);
}

export type CatalogFact = {
  id: string;
  name: string;
  price: number;
  units: string;
  href: string;
};

export function catalogFacts(
  products: {
    id: string;
    name: string;
    price: number;
    quantity?: number | null;
    status?: string;
    isDemo?: boolean;
  }[]
): CatalogFact[] {
  return products
    .filter((p) => !p.isDemo && p.status === "published")
    .map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      units: unitsLabel(p.quantity),
      href: `/admin/products/${p.id}`,
    }));
}
