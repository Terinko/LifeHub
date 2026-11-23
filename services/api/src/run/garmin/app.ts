import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

const ssm = new SSMClient({});
let cached: Promise<string | undefined> | undefined;

async function load(): Promise<string | undefined> {
  const name = process.env.GARMIN_API_KEY_PARAM;
  if (!name) return undefined;
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

/**
 * The Garmin Personal API key, read from SSM Parameter Store (a
 * SecureString) once per cold start. undefined until the parameter exists,
 * and the tool then shows example runs instead of failing.
 */
export function getGarminKey(): Promise<string | undefined> {
  cached ??= load().catch((error) => {
    cached = undefined;
    throw error;
  });
  return cached;
}

/** Read the key again on next use (after Garmin rejects it, it may have been replaced). */
export const forgetGarminKey = () => {
  cached = undefined;
};
