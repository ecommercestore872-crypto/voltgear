import assert from "node:assert/strict";
import { test } from "node:test";
import { POST } from "./route";

function request(origin: string, body: unknown) {
  return new Request("https://buyntryy.com/api/consent/aggregate", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("anonymous consent metrics accept only same-origin low-cardinality choices", async () => {
  const original = console.info;
  const logs: string[] = [];
  console.info = (line: string) => logs.push(line);
  try {
    assert.equal((await POST(request("https://buyntryy.com", { event: "shown" }))).status, 204);
    assert.equal((await POST(request("https://buyntryy.com", { event: "saved", choice: "advertising" }))).status, 204);
    assert.equal((await POST(new Request("http://localhost:3100/api/consent/aggregate", {
      method: "POST", headers: { origin: "http://127.0.0.1:3100", host: "127.0.0.1:3100", "content-type": "application/json" },
      body: JSON.stringify({ event: "opened" }),
    }))).status, 204);
    assert.equal((await POST(request("https://other.example", { event: "saved", choice: "all" }))).status, 403);
    assert.equal((await POST(request("https://buyntryy.com", { event: "saved", choice: "all", email: "private" }))).status, 400);
    assert.deepEqual(logs.map((line) => JSON.parse(line)), [
      { v: 1, kind: "consent_aggregate", event: "shown" },
      { v: 1, kind: "consent_aggregate", event: "saved", choice: "advertising" },
      { v: 1, kind: "consent_aggregate", event: "opened" },
    ]);
  } finally {
    console.info = original;
  }
});
