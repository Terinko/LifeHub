import {
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import { requireEnv } from "../shared/env";

// Every Cognito call for the admin page lives here.

export const cognito = new CognitoIdentityProviderClient({});

/** Creates the login and emails the invite. Returns the new user's sub. */
export async function createLogin(email: string): Promise<string> {
  const res = await cognito.send(
    new AdminCreateUserCommand({
      UserPoolId: requireEnv("USER_POOL_ID"),
      Username: email,
      UserAttributes: [
        { Name: "email", Value: email },
        { Name: "email_verified", Value: "true" },
      ],
      DesiredDeliveryMediums: ["EMAIL"],
    }),
  );
  const sub = res.User?.Attributes?.find((a) => a.Name === "sub")?.Value;
  if (!sub) throw new Error("Cognito didn't return the new user's id");
  return sub;
}

export async function deleteLogin(email: string): Promise<void> {
  await cognito.send(
    new AdminDeleteUserCommand({
      UserPoolId: requireEnv("USER_POOL_ID"),
      Username: email,
    }),
  );
}
