import { describe, expect, it } from "vitest";
import { signHmacHex, verifyHmacHex } from "./hmac";

describe("hmac", () => {
  it("accepts a correctly signed body", async () => {
    const body = JSON.stringify({ eventId: "evt_1", sourceOrderId: "order-1" });
    const signature = await signHmacHex(body, "secret-1");
    expect(await verifyHmacHex(body, signature, "secret-1")).toBe(true);
  });

  it("rejects a body signed with the wrong secret", async () => {
    const body = JSON.stringify({ eventId: "evt_1" });
    const signature = await signHmacHex(body, "secret-1");
    expect(await verifyHmacHex(body, signature, "secret-2")).toBe(false);
  });

  it("rejects a tampered body", async () => {
    const body = JSON.stringify({ eventId: "evt_1" });
    const signature = await signHmacHex(body, "secret-1");
    const tampered = JSON.stringify({ eventId: "evt_2" });
    expect(await verifyHmacHex(tampered, signature, "secret-1")).toBe(false);
  });

  it("rejects when the signature header is missing", async () => {
    const body = JSON.stringify({ eventId: "evt_1" });
    expect(await verifyHmacHex(body, null, "secret-1")).toBe(false);
    expect(await verifyHmacHex(body, undefined, "secret-1")).toBe(false);
  });

  it("produces a 64-char hex digest", async () => {
    const signature = await signHmacHex("anything", "secret-1");
    expect(signature).toMatch(/^[0-9a-f]{64}$/);
  });
});
