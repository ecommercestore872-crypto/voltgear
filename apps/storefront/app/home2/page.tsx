import { redirect } from "next/navigation";

/** Legacy preview URL — Biometic home now lives at `/`. */
export default function Home2RedirectPage() {
  redirect("/");
}
