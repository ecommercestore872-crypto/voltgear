import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  mapPickupAddressesFromPostExBody,
  resolvePostExMerchantAddressUrl,
} from "./postex-pickup-address";

describe("resolvePostExMerchantAddressUrl", () => {
  it("builds the v1 merchant address URL from the host base", () => {
    assert.equal(
      resolvePostExMerchantAddressUrl({ POSTEX_API_BASE_URL: "https://api.postex.pk" }),
      "https://api.postex.pk/services/integration/api/order/v1/get-merchant-address",
    );
  });

  it("strips a trailing slash on the base URL", () => {
    assert.equal(
      resolvePostExMerchantAddressUrl({ POSTEX_API_BASE_URL: "https://api.postex.pk/" }),
      "https://api.postex.pk/services/integration/api/order/v1/get-merchant-address",
    );
  });
});

describe("mapPickupAddressesFromPostExBody", () => {
  it("maps dist rows to safe pickup address fields", () => {
    const mapped = mapPickupAddressesFromPostExBody({
      statusCode: "200",
      dist: [
        {
          contactPersonName: "Buy N Try",
          cityName: "Lahore",
          address: "123 Warehouse Rd",
          addressCode: "001",
          phone1: "03001234567",
          phone2: "",
        },
      ],
    });
    assert.equal(mapped.length, 1);
    assert.deepEqual(mapped[0], {
      contactPersonName: "Buy N Try",
      cityName: "Lahore",
      address: "123 Warehouse Rd",
      addressCode: "001",
      phone1: "03001234567",
      phone2: null,
    });
  });

  it("returns an empty array when no address list is present", () => {
    assert.deepEqual(mapPickupAddressesFromPostExBody({ statusCode: "200" }), []);
  });
});
