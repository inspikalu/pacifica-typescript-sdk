import { describe, it, expect } from "vitest";
import { prepareMessage } from "../src/common/signing.js";
import type { SignatureHeader } from "../src/common/types.js";

describe("Signing Primitive", () => {
  it("should sort keys recursively and return compact JSON", () => {
    const header: SignatureHeader = {
      type: "create_order",
      timestamp: 123456789,
      expiry_window: 5000,
    };
    
    // Unordered payload with nested object
    const payload = {
      symbol: "BTC",
      side: "bid",
      extra: {
        z: 1,
        a: 2
      },
      amount: "0.1"
    };

    const message = prepareMessage(header, payload);
    
    // Expected: {"data":{"amount":"0.1","extra":{"a":2,"z":1},"side":"bid","symbol":"BTC"},"expiry_window":5000,"timestamp":123456789,"type":"create_order"}
    // Note: 'data' is sorted before 'expiry_window' because it starts with 'd'
    const parsed = JSON.parse(message);
    
    expect(message).toContain('"data":{"amount":"0.1","extra":{"a":2,"z":1},"side":"bid","symbol":"BTC"}');
    expect(Object.keys(parsed)).toEqual(["data", "expiry_window", "timestamp", "type"]);
    expect(Object.keys(parsed.data)).toEqual(["amount", "extra", "side", "symbol"]);
    expect(Object.keys(parsed.data.extra)).toEqual(["a", "z"]);
    
    // Compactness check: no spaces
    expect(message).not.toContain(": ");
    expect(message).not.toContain(", ");
  });

  it("should handle arrays correctly", () => {
    const header: SignatureHeader = { type: "test", timestamp: 1, expiry_window: 1 };
    const payload = {
      list: [
        { b: 2, a: 1 },
        { d: 4, c: 3 }
      ]
    };
    const message = prepareMessage(header, payload);
    expect(message).toContain('"list":[{"a":1,"b":2},{"c":3,"d":4}]');
  });
});
