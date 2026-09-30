import { confirmSignIn, signIn } from "aws-amplify/auth";
import { signInOutcome } from "./lib/signIn";

// Signing in talks to Cognito through Amplify, not to the LifeHub API, so
// these are the one pair of calls that don't go through shared/api/client.

export type Credentials = { email: string; password: string };

export const signInWithPassword = async ({ email, password }: Credentials) =>
  signInOutcome(await signIn({ username: email, password }));

/** Replaces a temporary password; true once the user is signed in. */
export const setPermanentPassword = async (newPassword: string) =>
  (await confirmSignIn({ challengeResponse: newPassword })).isSignedIn;
