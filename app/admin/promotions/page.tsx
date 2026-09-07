import { redirect } from "next/navigation";

/** Legacy mock UI — real coupons live under Discounts. */
export default function AdminPromotionsPage() {
  redirect("/admin/discounts");
}
