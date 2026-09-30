import { describe, expect, it } from "vitest";
import { errorText, signInOutcome } from "./signIn";

describe("signInOutcome", () => {
  it("signs in when Cognito is done", () => {
    expect(
      signInOutcome({ isSignedIn: true, nextStep: { signInStep: "DONE" } }),
    ).toBe("signedIn");
  });

  it("asks for a new password after a temporary one", () => {
    expect(
      signInOutcome({
        isSignedIn: false,
        nextStep: {
          signInStep: "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED",
        },
      }),
    ).toBe("newPasswordRequired");
  });

  it("names any other step instead of hanging", () => {
    expect(() =>
      signInOutcome({
        isSignedIn: false,
        nextStep: { signInStep: "CONFIRM_SIGN_IN_WITH_SMS_CODE" },
      }),
    ).toThrow(
      "Unexpected sign-in step: CONFIRM_SIGN_IN_WITH_SMS_CODE. Contact the admin.",
    );
    expect(() => signInOutcome({ isSignedIn: false })).toThrow(
      "Unexpected sign-in step: unknown. Contact the admin.",
    );
  });
});

describe("errorText", () => {
  it("prefers the error's message", () => {
    expect(errorText(new Error("Incorrect password."), "Failed")).toBe(
      "Incorrect password.",
    );
  });

  it("falls back when there is no message", () => {
    expect(errorText(new Error(""), "Failed")).toBe("Failed");
    expect(errorText("oops", "Failed")).toBe("Failed");
  });
});
