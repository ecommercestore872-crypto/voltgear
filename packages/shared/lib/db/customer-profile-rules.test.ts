import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  emailsMatchLoose,
  inboxMatchesCustomer,
  orderMatchesCustomerKey,
  phonesMatchLoose,
} from "./customer-profile-rules";

describe("emailsMatchLoose", () => {
  it("compares case-insensitively", () => {
    assert.equal(emailsMatchLoose("Ali@Ex.com", "ali@ex.com"), true);
    assert.equal(emailsMatchLoose("", "a@b.com"), false);
  });
});

describe("phonesMatchLoose", () => {
  it("matches normalized Pakistani mobiles", () => {
    assert.equal(phonesMatchLoose("03001234567", "+923001234567"), true);
    assert.equal(phonesMatchLoose("03001111111", "03002222222"), false);
  });
});

describe("inboxMatchesCustomer", () => {
  it("matches by email", () => {
    assert.equal(
      inboxMatchesCustomer(
        { email: "ali@ex.com" },
        { email: "Ali@Ex.com", phone: "" }
      ),
      true
    );
    assert.equal(
      inboxMatchesCustomer(
        { email: "other@ex.com" },
        { email: "ali@ex.com", phone: "03001234567" }
      ),
      false
    );
  });
});

describe("orderMatchesCustomerKey", () => {
  it("matches key and skips demo", () => {
    assert.equal(
      orderMatchesCustomerKey(
        {
          orderId: "VG-1",
          customer: { email: "ali@ex.com", phone: "1" },
        },
        "ali@ex.com",
        "ali@ex.com",
        "1"
      ),
      true
    );
    assert.equal(
      orderMatchesCustomerKey(
        {
          orderId: "VG-D",
          isDemo: true,
          customer: { email: "ali@ex.com" },
        },
        "ali@ex.com",
        "ali@ex.com",
        ""
      ),
      false
    );
  });
});
