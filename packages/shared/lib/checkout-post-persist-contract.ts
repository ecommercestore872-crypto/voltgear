import type { OrderItem } from "@/lib/types";

export type CheckoutPostPersistInput = {
  orderId: string;
  request: Request;
  body: Record<string, unknown>;
  consent: string | null | undefined;
  appliedPromo: string | null;
  gift: boolean;
  isDemo: boolean;
  lines: OrderItem[];
  subtotal: number;
  finalShipping: number;
  finalTotal: number;
  discount: number;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    province?: string;
    city: string;
    postal?: string;
  };
};
