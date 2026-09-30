import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  countOperationalCitiesFromPostExBody,
  resolvePostExOperationalCityUrl,
} from "./postex-connectivity";

describe("resolvePostExOperationalCityUrl", () => {
  it("builds the v2 operational city URL from the host base", () => {
    assert.equal(
      resolvePostExOperationalCityUrl({ POSTEX_API_BASE_URL: "https://api.postex.pk" }),
      "https://api.postex.pk/services/integration/api/order/v2/get-operational-city?operationalCityType=Delivery",
    );
  });

  it("strips a trailing slash on the base URL", () => {
    assert.equal(
      resolvePostExOperationalCityUrl({ POSTEX_API_BASE_URL: "https://api.postex.pk/" }),
      "https://api.postex.pk/services/integration/api/order/v2/get-operational-city?operationalCityType=Delivery",
    );
  });
});

describe("countOperationalCitiesFromPostExBody", () => {
  it("counts arrays under dist or data", () => {
    assert.equal(countOperationalCitiesFromPostExBody({ dist: [{}, {}] }), 2);
    assert.equal(countOperationalCitiesFromPostExBody({ data: [{}] }), 1);
    assert.equal(countOperationalCitiesFromPostExBody({ statusCode: "200" }), 0);
  });
});
