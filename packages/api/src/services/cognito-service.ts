/**
 * Cognito Service — manages users in the shared Cognito User Pool.
 *
 * Used by the user management routes to create/update/disable users.
 */
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminDisableUserCommand,
  AdminUpdateUserAttributesCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const client = new CognitoIdentityProviderClient({
  region: process.env.COGNITO_REGION || 'eu-west-3',
});

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || '';

interface CreateUserParams {
  email: string;
  name: string;
  role: string;
  tenantId: string;
}

/**
 * Create a new user in Cognito with custom attributes.
 * Returns the Cognito `sub` (unique user ID).
 */
export async function createCognitoUser(params: CreateUserParams): Promise<string> {
  const result = await client.send(
    new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: params.email,
      UserAttributes: [
        { Name: 'email', Value: params.email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'name', Value: params.name },
        { Name: 'custom:role', Value: params.role },
        { Name: 'custom:tenant_id', Value: params.tenantId },
      ],
      DesiredDeliveryMediums: ['EMAIL'], // Send temp password via email
    }),
  );

  const sub = result.User?.Attributes?.find((a) => a.Name === 'sub')?.Value;
  if (!sub) {
    throw new Error('Failed to get sub from Cognito response');
  }

  return sub;
}

/**
 * Update a user's role in Cognito.
 */
export async function updateCognitoUserRole(
  cognitoSub: string,
  newRole: string,
  _tenantId: string,
): Promise<void> {
  await client.send(
    new AdminUpdateUserAttributesCommand({
      UserPoolId: USER_POOL_ID,
      Username: cognitoSub,
      UserAttributes: [{ Name: 'custom:role', Value: newRole }],
    }),
  );
}

/**
 * Disable a user in Cognito (prevents login).
 */
export async function disableCognitoUser(cognitoSub: string): Promise<void> {
  await client.send(
    new AdminDisableUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: cognitoSub,
    }),
  );
}
