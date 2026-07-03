# AWS Setup Guide — Society ERP

## Prerequisites

- AWS Account ID: `948360714523`
- Region: `eu-west-3` (Paris)
- GitHub repo: `chiekhahmd/HA-SARL`

## 1. OIDC Identity Provider (Done ✅)

Created in IAM → Identity Providers:
- **Provider URL**: `https://token.actions.githubusercontent.com`
- **Audience**: `sts.amazonaws.com`

## 2. GitHub Actions IAM Role (Done ✅)

Role: `github-actions-dev-role`
ARN: `arn:aws:iam::948360714523:role/github-actions-dev-role`

### Trust Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::948360714523:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:chiekhahmd/HA-SARL:*"
        }
      }
    }
  ]
}
```

### Permissions Policy

- `PowerUserAccess` (AWS managed policy)
- Note: If CDK deploy fails with IAM permission errors, add `IAMFullAccess`

## 3. CDK Bootstrap (Required — one time)

Before the first CDK deploy, you must bootstrap CDK in your account/region:

```bash
# Make sure you're using the right profile
export AWS_PROFILE=society-personal

# Bootstrap CDK
npx cdk bootstrap aws://948360714523/eu-west-3
```

This creates an S3 bucket and IAM roles that CDK uses for deployments.

## 4. Local AWS Profile

For local development (running `cdk deploy` from your machine):

```bash
aws configure --profile society-personal
# Access Key ID: [your key]
# Secret Access Key: [your secret]
# Region: eu-west-3
# Output: json
```

Verify:
```bash
aws sts get-caller-identity --profile society-personal
```

## 5. First Deploy (Manual)

After bootstrapping, deploy all stacks:

```bash
cd infra
export AWS_PROFILE=society-personal

# Preview changes
npx cdk diff

# Deploy all stacks
npx cdk deploy --all
```

## 6. Post-Deploy: Verify

After successful deployment, the CDK outputs will show:
- API Gateway URL
- CloudFront distribution URL
- RDS endpoint
- Cognito User Pool ID
- DynamoDB table name

## 7. Cost Notes

All services are within AWS free tier for year 1:
- RDS db.t3.micro: 750 hours/month free
- Lambda: 1M requests/month free
- API Gateway: 1M calls/month free
- DynamoDB: 25 WCU + 25 RCU free
- S3: 5GB free
- CloudFront: 1TB transfer free
- Cognito: 50K MAU free
- SES: 62K emails/month free (from Lambda)

**Total dev cost: $0/month during free tier period.**
