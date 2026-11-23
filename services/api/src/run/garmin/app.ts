import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

/** LifeHub's own Garmin Connect Developer Program app keys. */
export type GarminApp = { clientId: string; clientSecret: string };

const ssm = new SSMClient({});
let cached: Promise<GarminApp | undefined> | undefined;

async function readParameter(name: string): Promise<string | undefined> {
  try {
    const res = await ssm.send(
      new GetParameterCommand({ Name: name, WithDecryption: true }),
    );
    return res.Parameter?.Value || undefined;
  } catch (error) {
    if ((error as { name?: string }).name === "ParameterNotFound") {
      return undefined;
    }
    throw error;
  }
}

async function load(): Promise<GarminApp | undefined> {
  const idName = process.env.GARMIN_CLIENT_ID_PARAM;
  const secretName = process.env.GARMIN_CLIENT_SECRET_PARAM;
  if (!idName || !secretName) return undefined;
  const [clientId, clientSecret] = await Promise.all([
    readParameter(idName),
    readParameter(secretName),
  ]);
  return clientId && clientSecret ? { clientId, clientSecret } : undefined;
}

/**
 * The app keys, read from SSM Parameter Store (the secret as a SecureString)
 * once per cold start. undefined until both parameters exist, and the tool
 * then shows example runs instead of failing.
 */
export function getGarminApp(): Promise<GarminApp | undefined> {
  cached ??= load().catch((error) => {
    cached = undefined;
    throw error;
  });
  return cached;
}

/** Tests only: forget the cached keys. */
export const clearGarminApp = () => {
  cached = undefined;
};
