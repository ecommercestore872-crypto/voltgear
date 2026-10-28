import assert from "node:assert/strict";
import { test } from "node:test";
import { isDefiniteStorageRejection, UncertainStorageUploadError } from "./admin-upload-outcome";

test("explicit Storage rejection codes are known non-commits", () => {
  for (const statusCode of [400, 401, 403, 404, 409, 413, 415, 422, 429]) {
    assert.equal(isDefiniteStorageRejection({ statusCode }), true);
    assert.equal(isDefiniteStorageRejection({ statusCode: String(statusCode) }), true);
  }
});
test("timeouts, malformed errors and server failures are uncertain", () => {
  for (const error of [undefined, null, new Error("network failure"), {}, { statusCode: 500 }, { statusCode: "503" },
    { statusCode: "403oops" }, { statusCode: " 403" }, { statusCode: true }, { statusCode: 200 }]) {
    assert.equal(isDefiniteStorageRejection(error), false);
  }
  assert.ok(new UncertainStorageUploadError() instanceof Error);
});
