import { Amplify } from "aws-amplify";
import { config } from "../config";

export function configureAmplify() {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: config.cognito.userPoolId,
        userPoolClientId: config.cognito.userPoolClientId,
      },
    },
  });
}
