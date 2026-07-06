/**
 * AWS Amplify Auth configuration.
 * Values are loaded from environment variables (set at build time via Vite).
 */
import { Amplify } from 'aws-amplify';

export function configureAmplify() {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
        userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '',
        loginWith: {
          email: true,
        },
      },
    },
  });
}
