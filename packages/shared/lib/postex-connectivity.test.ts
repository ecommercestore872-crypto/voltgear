import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  countOperationalCitiesFromPostExBody,
  extractOperationalCityNamesFromPostExBody,
  resolvePostExOperationalCityUrl,
} from "./postex-connectivity";

describe("resolvePostExOperationalCityUrl", () => {
  it("builds the v2 operational city URL from the host base", () => {
    assert.equal(
      resolvePostExOperationalCityUrl({ POSTEX_API_BASE_URL: "https://api.postex.pk" }),
      "https://api.postex.pk/services/integration/api/order/v2/get-operational-city",
    );
  });

  it("strips a trailing slash on the base URL", () => {
    assert.equal(
      resolvePostExOperationalCityUrl({ POSTEX_API_BASE_URL: "https://api.postex.pk/" }),
      "https://api.postex.pk/services/integration/api/order/v2/get-operational-city",
    );
  });
});

describe("countOperationalCitiesFromPostExBody", () => {
  it("counts named cities from dist or data buckets (ignores rows without a city name)", () => {
    assert.equal(
      countOperationalCitiesFromPostExBody({
        dist: [{ operationalCityName: "Lahore" }, { operationalCityName: "Karachi" }],
      }),
      2,
    );
    assert.equal(
      countOperationalCitiesFromPostExBody({ data: [{ cityName: "Islamabad" }] }),
      1,
    );
    assert.equal(countOperationalCitiesFromPostExBody({ dist: [{}, {}] }), 0);
    assert.equal(countOperationalCitiesFromPostExBody({ statusCode: "200" }), 0);
  });
});

describe("extractOperationalCityNamesFromPostExBody", () => {
  it("returns canonical city names from dist rows", () => {
    assert.deepEqual(
      extractOperationalCityNamesFromPostExBody({
        dist: [{ operationalCityName: "Lahore" }, { cityName: "Karachi" }],
      }),
      ["Lahore", "Karachi"],
    );
  });
});
