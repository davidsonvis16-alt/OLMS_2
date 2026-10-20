import { describe, expect, it } from "vitest";
import { passkeyMessage } from "@/lib/passkey";

describe("fingerprint / face sign-in messages", () => {
  it("explains each failure in plain words", () => {
    expect(passkeyMessage({ code: "passkey_disabled", message: "Passkeys are disabled" })).toMatch(/isn't switched on/);
    expect(passkeyMessage({ code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY", cause: { name: "NotAllowedError" } })).toMatch(/Cancelled/);
    expect(passkeyMessage({ code: "ERROR_CEREMONY_ABORTED" })).toMatch(/Cancelled/);
    expect(passkeyMessage({ cause: { name: "InvalidStateError" } })).toMatch(/already set up/);
    expect(passkeyMessage({ code: "webauthn_challenge_expired" })).toMatch(/too long/);
    expect(passkeyMessage(null)).toMatch(/try again/);
  });
});
