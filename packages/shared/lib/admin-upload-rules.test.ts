import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import sharp from "sharp";
import * as rules from "./admin-upload-rules";
import { AdminRequestError } from "./admin-request-error";
import * as outcomes from "./admin-upload-outcome";

function loadModule<T>(file: string, dependencies: Record<string, unknown>, globals: Record<string, unknown> = {}): T {
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, {
    exports, File, Buffer, URL, Request, Response, FormData, AbortController, setTimeout, clearTimeout, crypto: { randomUUID },
    console: { error: () => {} },
    require(name: string) {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency ${name}`);
      return dependencies[name];
    }, ...globals,
  });
  return exports as T;
}

const png = () => sharp({ create: { width: 2, height: 3, channels: 3, background: "#2381ba" } }).png().toBuffer();
const metadata = (name = "photo.jpg", type = "image/jpeg", size = 1) => ({ name, type, size });
function heicBytes(brand = "heic") {
  const bytes = Buffer.alloc(24);
  bytes.writeUInt32BE(24, 0);
  bytes.write("ftyp", 4); bytes.write(brand, 8); bytes.write("mif1", 16); bytes.write(brand, 20);
  return bytes;
}

type ProviderOptions = {
  auth?: boolean; configured?: boolean; cloudError?: boolean; cloudErrorCode?: number; storageError?: boolean;
  cloudResult?: unknown; storageUrl?: unknown; storageStatusCode?: number; storageThrow?: boolean; storageResult?: unknown;
};
function routeHarness(options: ProviderOptions = {}) {
  const calls: { cloud: { data: string; options: unknown }[]; storage: { path: string; buffer: Buffer; options: unknown }[]; deletes: number } = {
    cloud: [], storage: [], deletes: 0,
  };
  const result = Object.hasOwn(options, "cloudResult") ? options.cloudResult : {
    public_id: "fixture/photo", secure_url: "https://res.cloudinary.com/fixture/image/upload/photo.png", width: 2, height: 3, format: "png",
  };
  const bucket = {
    async upload(path: string, buffer: Buffer, uploadOptions: unknown) {
      calls.storage.push({ path, buffer, options: uploadOptions });
      if (options.storageThrow) throw new Error("private-provider-secret");
      if (Object.hasOwn(options, "storageResult")) return options.storageResult;
      return { error: options.storageError ? Object.assign(new Error("private-provider-secret"), { statusCode: options.storageStatusCode }) : null };
    },
    getPublicUrl: () => ({ data: { publicUrl: Object.hasOwn(options, "storageUrl") ? options.storageUrl : "https://fixture.supabase.co/storage/v1/object/public/product-images/photo.png" } }),
    remove() { calls.deletes++; throw new Error("Deletion forbidden"); },
  };
  const route = loadModule<{ POST: (request: Request) => Promise<Response>; DELETE: (request: Request) => Promise<Response> }>(
    "../../../apps/admin/app/api/admin/upload/route.ts", {
      "@/lib/admin-api-observability": { withAdminApiObservability: (_name: string, handler: unknown) => handler },
      "@/lib/admin": { isAdminRequest: () => options.auth !== false },
      "@/lib/admin-upload-rules": rules,
      "@/lib/admin-upload-outcome": outcomes,
      "@/lib/cloudinary": {
        CLOUDINARY_CLOUD_NAME: options.configured === false ? undefined : "fixture", CLOUDINARY_API_KEY: "fixture-key",
        CLOUDINARY_API_SECRET: "fixture-secret", CLOUDINARY_FOLDER: "ecommerce-store/products",
      },
      cloudinary: { v2: {
        config: () => {},
        uploader: {
          upload: async (data: string, uploadOptions: unknown) => {
            calls.cloud.push({ data, options: uploadOptions });
            if (options.cloudError) throw Object.assign(new Error("private-provider-secret"), { http_code: options.cloudErrorCode });
            return result;
          },
          destroy() { calls.deletes++; throw new Error("Deletion forbidden"); },
        },
      } },
      "next/server": { NextResponse: Response }, sharp,
      "@/lib/supabase/server": { getServiceClient: () => ({ storage: { from: () => bucket } }) },
    },
  );
  function request(file: File | string | null, folder: string | null = null) {
    const form = new FormData();
    if (file !== null) form.append("file", file);
    if (folder !== null) form.append("folder", folder);
    const request = new Request("https://admin.fixture/api/admin/upload", { method: "POST" });
    // Preserve the exact synthetic File to observe whether arrayBuffer was called.
    Object.defineProperty(request, "formData", { value: async () => form });
    return request;
  }
  return { route, calls, request };
}

describe("admin upload metadata and content checks", () => {
  it("accepts supported image metadata including phone files without MIME metadata", () => {
    for (const [ext, mime] of [["jpg", "image/jpeg"], ["jpeg", "image/jpeg"], ["png", "image/png"], ["webp", "image/webp"], ["gif", "image/gif"], ["avif", "image/avif"], ["heic", "image/heic"], ["heif", "image/heif"]]) {
      assert.equal(rules.validateAdminUploadMetadata(metadata(`photo.${ext}`, mime, rules.ADMIN_UPLOAD_MAX_BYTES)).mimeType, mime);
      assert.equal(rules.validateAdminUploadMetadata(metadata(`photo.${ext}`, "")).mimeType, mime);
    }
  });
  it("rejects empty, large, unsupported and MIME/extension mismatches", () => {
    for (const file of [metadata("a.jpg", "image/jpeg", 0), metadata("a.jpg", "image/jpeg", rules.ADMIN_UPLOAD_MAX_BYTES + 1),
      metadata("a.svg", "image/svg+xml"), metadata("a.html", "text/html"), metadata("a.mp4", "video/mp4"),
      metadata("a.png", "image/jpeg"), metadata("a.jpg", "application/octet-stream"), metadata("a.jpg", "image/jpeg", NaN)]) {
      assert.throws(() => rules.validateAdminUploadMetadata(file));
    }
  });
  it("treats signatures as consistency checks, not proof of complete image validity", () => {
    const image = rules.validateAdminUploadMetadata(metadata("a.png", "image/png"));
    assert.doesNotThrow(() => rules.validateAdminUploadSignature(Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]), image));
    assert.throws(() => rules.validateAdminUploadSignature(Buffer.from("<script>bad</script>"), image));
    const heic = rules.validateAdminUploadMetadata(metadata("a.heic", "image/heic"));
    assert.doesNotThrow(() => rules.validateAdminUploadSignature(heicBytes(), heic));
    assert.throws(() => rules.validateAdminUploadSignature(heicBytes("avif"), heic));
    const avif = rules.validateAdminUploadMetadata(metadata("a.avif", "image/avif"));
    assert.throws(() => rules.validateAdminUploadSignature(heicBytes(), avif));
  });
  it("rejects path traversal and unsafe provider URL values", () => {
    assert.equal(rules.adminUploadFolder(null, "ecommerce-store/products"), "ecommerce-store/products");
    assert.equal(rules.adminUploadFolder("admin/product_1", "default"), "admin/product_1");
    for (const folder of ["../shared", "/admin", "admin//shared", "admin/..", "folder?test", 1]) assert.throws(() => rules.adminUploadFolder(folder, "default"));
    for (const url of ["javascript:alert(1)", "http://fixture.test/a", "https://user:pass@fixture.test/a", "//fixture.test/a", undefined]) assert.equal(rules.isAdminUploadUrl(url), false);
  });
});

describe("admin upload API boundary with real raster decoding and mocked providers", () => {
  it("rejects unauthorized POST and DELETE before parsing, decoding or providers", async () => {
    const subject = routeHarness({ auth: false });
    const request = new Request("https://admin.fixture/api/admin/upload", { method: "POST" });
    Object.defineProperty(request, "formData", { value: () => { throw new Error("Must not parse"); } });
    assert.equal((await subject.route.POST(request)).status, 401);
    assert.equal((await subject.route.DELETE(request)).status, 401);
    assert.deepEqual(subject.calls, { cloud: [], storage: [], deletes: 0 });
  });
  it("blocks oversized payload headers before multipart parsing", async () => {
    const subject = routeHarness();
    const request = new Request("https://admin.fixture/api/admin/upload", { method: "POST", headers: { "content-length": "4600000" } });
    Object.defineProperty(request, "formData", { value: () => { throw new Error("Must not parse"); } });
    assert.equal((await subject.route.POST(request)).status, 413);
    assert.equal(subject.calls.cloud.length + subject.calls.storage.length, 0);
  });
  it("rejects invalid file metadata before reading arrayBuffer or calling providers", async () => {
    const subject = routeHarness();
    for (const file of [new File([], "empty.jpg", { type: "image/jpeg" }),
      new File([new Uint8Array(rules.ADMIN_UPLOAD_MAX_BYTES + 1)], "large.jpg", { type: "image/jpeg" }),
      new File(["unsafe"], "a.svg", { type: "image/svg+xml" }), new File(["unsafe"], "a.png", { type: "image/jpeg" })]) {
      Object.defineProperty(file, "arrayBuffer", { value: () => { throw new Error("Must not buffer invalid metadata"); } });
      const response = await subject.route.POST(subject.request(file));
      assert.equal(response.status, file.size > rules.ADMIN_UPLOAD_MAX_BYTES ? 413 : 400);
      assert.doesNotMatch(await response.text(), /Must not buffer/);
    }
    assert.equal(subject.calls.cloud.length + subject.calls.storage.length, 0);
  });
  it("handles malformed multipart, missing files and invalid folders safely", async () => {
    const subject = routeHarness();
    assert.equal((await subject.route.POST(new Request("https://fixture/upload", { method: "POST", body: "invalid" }))).status, 400);
    for (const value of [null, "not a file"]) assert.equal((await subject.route.POST(subject.request(value))).status, 400);
    assert.equal((await subject.route.POST(subject.request(new File([await png()], "a.png", { type: "image/png" }), "../shared"))).status, 400);
    assert.equal(subject.calls.cloud.length + subject.calls.storage.length, 0);
  });
  it("rejects HTML renamed as JPEG and truncated PNG that passes its header check", async () => {
    const subject = routeHarness();
    for (const [bytes, ext, mime] of [[Buffer.from("<script>bad</script>"), "jpg", "image/jpeg"], [Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]), "png", "image/png"]] as const) {
      const response = await subject.route.POST(subject.request(new File([bytes], `a.${ext}`, { type: mime })));
      assert.equal(response.status, 400);
    }
    assert.equal(subject.calls.cloud.length + subject.calls.storage.length, 0);
  });
  it("decodes valid JPEG, PNG, WebP, GIF and AVIF without altering uploaded bytes", async () => {
    for (const [ext, mime] of [["jpeg", "image/jpeg"], ["png", "image/png"], ["webp", "image/webp"], ["gif", "image/gif"], ["avif", "image/avif"]] as const) {
      const subject = routeHarness();
      const bytes = await sharp({ create: { width: 2, height: 3, channels: 3, background: "blue" } }).toFormat(ext).toBuffer();
      const response = await subject.route.POST(subject.request(new File([bytes], `a.${ext}`, { type: mime })));
      assert.equal(response.status, 200, `${ext}: ${await response.text()}`);
      assert.equal(subject.calls.storage.length, 0);
      assert.equal(subject.calls.cloud[0].data, `data:${mime};base64,${bytes.toString("base64")}`);
      assert.equal(JSON.stringify(subject.calls.cloud[0].options), JSON.stringify({ folder: "ecommerce-store/products", resource_type: "image" }));
    }
  });
  it("uses Storage only for validated rasters when Cloudinary is absent or explicitly rejects", async () => {
    for (const options of [{ configured: false }, { cloudError: true, cloudErrorCode: 400 }]) {
      const subject = routeHarness(options);
      const bytes = await png();
      const response = await subject.route.POST(subject.request(new File([bytes], "a.png", { type: "image/png" })));
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(body.width, 2); assert.equal(body.height, 3);
      assert.equal(subject.calls.storage.length, 1);
      assert.deepEqual(subject.calls.storage[0].buffer, bytes);
      assert.equal(JSON.stringify(subject.calls.storage[0].options), JSON.stringify({ contentType: "image/png", upsert: false }));
    }
  });
  it("does not duplicate an ambiguous timeout, network or server-error upload in Storage", async () => {
    for (const cloudErrorCode of [undefined, 408, 409, 500, 503]) {
      const subject = routeHarness({ cloudError: true, cloudErrorCode });
      const response = await subject.route.POST(subject.request(new File([await png()], "a.png", { type: "image/png" })));
      assert.equal(response.status, 502);
      assert.match(await response.text(), /uncertain/);
      assert.equal(subject.calls.storage.length, 0);
    }
  });
  it("does not fall back after malformed provider success or return unsafe URLs", async () => {
    for (const cloudResult of [null, undefined, {}, { secure_url: "javascript:alert(1)", public_id: "a" },
      { secure_url: "https://fixture.test/a", public_id: "a", width: "2", height: 3 }]) {
      const subject = routeHarness({ cloudResult });
      assert.equal((await subject.route.POST(subject.request(new File([await png()], "a.png", { type: "image/png" })))).status, 502);
      assert.equal(subject.calls.cloud.length, 1); assert.equal(subject.calls.storage.length, 0);
    }
  });
  it("only accepts HEIC/HEIF after successful provider WebP conversion; never stores raw originals", async () => {
    for (const ext of ["heic", "heif"]) {
      const subject = routeHarness({ cloudResult: { public_id: "fixture/a", secure_url: "https://res.cloudinary.com/fixture/a.webp", format: "webp", width: 2, height: 3 } });
      assert.equal((await subject.route.POST(subject.request(new File([heicBytes()], `a.${ext}`, { type: `image/${ext}` })))).status, 200);
      assert.equal((subject.calls.cloud[0].options as { format: string }).format, "webp");
      for (const options of [{ configured: false }, { cloudError: true, cloudErrorCode: 400 }, { cloudResult: { public_id: "a", secure_url: "https://fixture.test/a.heic", width: 2, height: 3, format: "heic" } }]) {
        const rejected = routeHarness(options);
        const response = await rejected.route.POST(rejected.request(new File([heicBytes()], `a.${ext}`, { type: `image/${ext}` })));
        assert.equal(response.status, "cloudResult" in options ? 502 : 503);
        assert.equal(rejected.calls.storage.length, 0);
      }
    }
  });
  it("reports uncertain Storage failures and malformed post-commit URLs without leaking provider errors", async () => {
    for (const options of [{ storageError: true }, { storageThrow: true }, { storageError: true, storageStatusCode: 503 }, { storageUrl: "javascript:alert(1)" }]) {
      const subject = routeHarness({ configured: false, ...options });
      const response = await subject.route.POST(subject.request(new File([await png()], "a.png", { type: "image/png" })));
      assert.equal(response.status, 502);
      const body = await response.text();
      assert.match(body, /uncertain.*before retrying/);
      assert.doesNotMatch(body, /private-provider-secret|javascript/);
      assert.equal(subject.calls.storage.length, 1);
    }
  });
  it("keeps explicit pre-commit Storage rejections distinct from uncertain outcomes", async () => {
    for (const storageStatusCode of [400, 401, 403, 404, 409, 413, 415, 422, 429]) {
      const subject = routeHarness({ configured: false, storageError: true, storageStatusCode });
      const response = await subject.route.POST(subject.request(new File([await png()], "a.png", { type: "image/png" })));
      assert.equal(response.status, 503);
      assert.doesNotMatch(await response.text(), /private-provider-secret/);
      assert.equal(subject.calls.storage.length, 1);
    }
  });
  it("treats malformed resolved Storage results as uncertain without retrying", async () => {
    for (const storageResult of [undefined, null, {}, "unexpected"]) {
      const subject = routeHarness({ configured: false, storageResult });
      const response = await subject.route.POST(subject.request(new File([await png()], "a.png", { type: "image/png" })));
      assert.equal(response.status, 502);
      assert.match(await response.text(), /uncertain/);
      assert.equal(subject.calls.storage.length, 1);
    }
  });
  it("fails authenticated DELETE closed for every identifier without touching providers", async () => {
    const subject = routeHarness();
    for (const query of ["", "?publicId=../shared", "?url=https://fixture.supabase.co/storage/v1/object/public/product-images/shared.png", "?publicId=fixture/shared"]) {
      const response = await subject.route.DELETE(new Request(`https://admin.fixture/api/admin/upload${query}`, { method: "DELETE" }));
      assert.equal(response.status, 409); assert.match(await response.text(), /unlinks.*reference-safe/);
    }
    assert.deepEqual(subject.calls, { cloud: [], storage: [], deletes: 0 });
  });
});

it("adminUpload rejects invalid metadata before fetch and forwards valid files once", async () => {
  const calls: { url: string; options: RequestInit }[] = [];
  const client = loadModule<{ adminUpload: (file: File) => Promise<unknown> }>("../components/admin/admin-fetch.ts", {
    "@/lib/admin-token": { adminHeaders: () => ({ authorization: "fixture-token" }) },
    "@/lib/admin-upload-rules": rules,
    "@/lib/admin-request-error": { AdminRequestError },
  }, { fetch: async (url: string, options: RequestInit) => {
    calls.push({ url, options }); return Response.json({ secureUrl: "https://fixture.test/a.png" });
  } });
  await assert.rejects(client.adminUpload(new File([], "a.png", { type: "image/png" })), /non-empty/);
  await assert.rejects(client.adminUpload(new File(["bad"], "a.svg", { type: "image/svg+xml" })), /Use a JPEG/);
  assert.equal(calls.length, 0);
  await client.adminUpload(new File([await png()], "a.png", { type: "image/png" }));
  assert.equal(calls.length, 1); assert.equal(calls[0].url, "/api/admin/upload");
  assert.equal(calls[0].options.credentials, "include");
});

it("bounds stalled uploads, clears its timer and reports an uncertain outcome without retrying", async () => {
  let expire: () => void = () => {};
  let calls = 0;
  let cleared = false;
  const client = loadModule<{ adminUpload: (file: File) => Promise<unknown> }>("../components/admin/admin-fetch.ts", {
    "@/lib/admin-token": { adminHeaders: () => ({}) }, "@/lib/admin-upload-rules": rules,
    "@/lib/admin-request-error": { AdminRequestError },
  }, {
    setTimeout: (callback: () => void, milliseconds: number) => { assert.equal(milliseconds, 120_000); expire = callback; return 1; },
    clearTimeout: () => { cleared = true; },
    fetch: (_url: string, options: RequestInit) => new Promise((_resolve, reject) => {
      calls++; options.signal?.addEventListener("abort", () => reject(new Error("AbortError")));
    }),
  });
  const pending = client.adminUpload(new File([await png()], "a.png", { type: "image/png" }));
  expire(); await assert.rejects(pending, /timed out.*uncertain/);
  assert.equal(calls, 1); assert.equal(cleared, true);
});
