// Every environment-specific value the frontend needs, read once.
// Defaults are the production values, so a plain `npm run build` (as in the
// deploy workflow) behaves exactly as before. Override them in a local
// `.env.local` to point the app at a different backend.
const env = import.meta.env;

export const config = {
  apiBaseUrl:
    env.VITE_API_BASE_URL ??
    "https://9im6v06twk.execute-api.us-east-1.amazonaws.com",
  cognito: {
    region: env.VITE_AWS_REGION ?? "us-east-1",
    userPoolId: env.VITE_COGNITO_USER_POOL_ID ?? "us-east-1_fOXu4nwZv",
    userPoolClientId:
      env.VITE_COGNITO_CLIENT_ID ?? "7vdugt5rd98k0pl9uqkpd2k3gk",
  },
} as const;

export const API_BASE = config.apiBaseUrl;
