/** Where a password sign-in leaves the user. */
export type SignInOutcome = "signedIn" | "newPasswordRequired";

/** The parts of Amplify's signIn() result the login form looks at. */
export type SignInResult = {
  isSignedIn: boolean;
  nextStep?: { signInStep?: string };
};

/**
 * Reads Amplify's answer. A temporary password asks for a new one; any other
 * step (MFA, custom challenge…) isn't handled by this form yet, so it throws
 * a message for the user instead of hanging on "Signing in..." forever.
 */
export function signInOutcome({
  isSignedIn,
  nextStep,
}: SignInResult): SignInOutcome {
  if (nextStep?.signInStep === "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED")
    return "newPasswordRequired";
  if (isSignedIn) return "signedIn";
  throw new Error(
    `Unexpected sign-in step: ${nextStep?.signInStep || "unknown"}. Contact the admin.`,
  );
}

/** The error's own message, or `fallback` when it has none. */
export function errorText(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : "";
  return message || fallback;
}
