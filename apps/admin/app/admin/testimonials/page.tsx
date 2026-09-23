import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { listAdminTestimonials } from "@/lib/db/admin-store";

export const metadata: Metadata = {
  title: "Testimonials",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminTestimonialsPage() {
  const testimonials = await listAdminTestimonials();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Testimonials</h1>
        <Button asChild>
          <Link href="/admin/testimonials/new">New testimonial</Link>
        </Button>
      </div>
      <ul className="divide-y rounded-lg border">
        {testimonials.map((t) => (
          <li key={String(t.id)}>
            <Link
              href={`/admin/testimonials/${t.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-muted/40"
            >
              <span>
                <span className="block font-medium">
                  {String(t.customer_name)}
                </span>
                <span className="line-clamp-1 text-xs text-muted-foreground">
                  {String(t.review_text)}
                </span>
              </span>
              <span className="text-xs capitalize text-muted-foreground">
                {t.draft
                  ? `${t.status} · draft`
                  : String(t.status ?? "published")}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
