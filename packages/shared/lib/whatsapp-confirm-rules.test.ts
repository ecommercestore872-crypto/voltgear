import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { classifyConfirmReply } from "./whatsapp-confirm-rules";

const cases: Array<[string, "confirm" | "decline" | "review"]> = [
  ["Confirm", "confirm"],
  ["confirmed", "confirm"],
  ["Yes", "confirm"],
  ["haan ji confirm hai", "confirm"],
  ["ji", "confirm"],
  ["👍", "confirm"],
  ["1", "confirm"],
  ["جی", "confirm"],
  ["cancel", "decline"],
  ["No", "decline"],
  ["nahi", "decline"],
  ["not confirmed", "decline"],
  ["don't confirm", "decline"],
  ["confirm nahi", "decline"],
  ["order nahi chahiye", "decline"],
  ["I don't want this order", "decline"],
  ["2", "decline"],
  ["yes but can you deliver tomorrow", "review"],
  ["confirm? what is the delivery charge?", "review"],
  ["change my address to Lahore", "review"],
  ["yes cancel", "review"],
  ["no problem confirm", "review"],
  ["", "review"],
  ["hello", "review"],
];

describe("classifyConfirmReply", () => {
  for (const [text, expected] of cases) {
    it(`${JSON.stringify(text)} -> ${expected}`, () => {
      assert.equal(classifyConfirmReply(text), expected);
    });
  }
});
