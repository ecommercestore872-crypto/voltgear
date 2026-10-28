import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { AdminHydrationBoundary } from "@/components/admin/admin-hydration-boundary";

test("actual admin boundary retains server-rendered children", () => {
  const html = renderToString(createElement(AdminHydrationBoundary, null,
    createElement("main", null, "Synthetic admin server content")));
  assert.match(html, /<main>Synthetic admin server content<\/main>/);
  assert.doesNotMatch(html, /Loading admin/);
});
