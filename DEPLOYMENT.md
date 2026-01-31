## AWS Deployment Guide (Production Ready)

This document describes a **production‑ready deployment strategy** for an n8n‑like backend application on AWS.

The guide assumes:

* Bun is used for local development and builds
* AWS Lambda runs on Node.js runtime
* No Serverless Framework is used
* Deployment is performed using AWS CLI

This file is intended to be used directly as `deployment.md`.

---

## What Gets Deployed to AWS

| Service        | AWS Service                               |
| -------------- | ----------------------------------------- |
| Main API       | AWS Lambda + API Gateway (HTTP API)       |
| Trigger Poller | AWS Lambda + EventBridge (Scheduled Rule) |
| Worker         | AWS Lambda + SQS                          |
| Secrets        | AWS SSM Parameter Store                   |
| Database       | MongoDB Atlas                             |

---

## Key Concept

AWS Lambda **does not support Bun runtime**.

Therefore the following model is used:

* **Bun**: local development, dependency management, TypeScript build
* **Node.js**: AWS Lambda runtime

All Lambda code is compiled to **plain JavaScript** before deployment.

---

## STEP 1: Create AWS Account

1. Visit [https://aws.amazon.com](https://aws.amazon.com)
2. Create a new AWS account
3. Choose the Free Tier plan
4. Add billing details (required by AWS)

---

## STEP 2: Create IAM User (Required)

Never deploy using the root AWS account.

1. AWS Console → IAM → Users → Create User
2. Username: `workflow-deployer`
3. Access type: Programmatic access
4. Attach policy:

```
AdministratorAccess
```

5. Save the generated Access Key ID and Secret Access Key

---

## STEP 3: Install AWS CLI

### Windows

Download and install AWS CLI v2:
[https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2-windows.html](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2-windows.html)

Verify installation:

```bash
aws --version
```

---

## STEP 4: Configure AWS CLI

```bash
aws configure
```

Provide the following values:

```
AWS Access Key ID: <your-access-key>
AWS Secret Access Key: <your-secret-key>
Default region: ap-south-1
Default output format: json
```

---

## STEP 5: Store Secrets in SSM Parameter Store

Secrets must never be committed to source control.

### MongoDB URI

```bash
aws ssm put-parameter \
  --name "/n8n/prod/mongodb-uri" \
  --value "mongodb+srv://<user>:<password>@cluster.mongodb.net/db" \
  --type SecureString
```

### JWT Secret

```bash
aws ssm put-parameter \
  --name "/n8n/prod/jwt-secret" \
  --value "super-secret-jwt-key" \
  --type SecureString
```

---

## STEP 6: Access Secrets in Lambda Code

Secrets are injected as environment variables:

```ts
process.env.MONGODB_URI
process.env.JWT_SECRET
```

---

## STEP 7: Prepare Lambda Code

Lambda handlers must be Node‑compatible JavaScript.

Example handler:

```ts
export const handler = async () => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Lambda running' })
  }
}
```

---

## STEP 8: Build Lambda Using Bun

```bash
bun build src/lambda.ts --outdir dist --target=node
```

---

## STEP 9: Install Production Dependencies

```bash
bun install --production
```

---

## STEP 10: Create Deployment ZIP

### Windows

```powershell
Compress-Archive -Path dist,node_modules,package.json -DestinationPath lambda.zip
```

---

## STEP 11: Create IAM Role for Lambda

### Create trust policy file: `trust-policy.json`

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

### Create IAM role

```bash
aws iam create-role \
  --role-name lambda-basic-role \
  --assume-role-policy-document file://trust-policy.json
```

### Attach required policies

```bash
aws iam attach-role-policy \
  --role-name lambda-basic-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
```

```bash
aws iam attach-role-policy \
  --role-name lambda-basic-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonSSMReadOnlyAccess
```

---

## STEP 12: Create Lambda Function

```bash
aws lambda create-function \
  --function-name n8n-workflow-api-dev \
  --runtime nodejs20.x \
  --handler dist/lambda.handler \
  --zip-file fileb://lambda.zip \
  --role arn:aws:iam::<ACCOUNT_ID>:role/lambda-basic-role \
  --environment Variables="{MONGODB_URI=/n8n/prod/mongodb-uri,JWT_SECRET=/n8n/prod/jwt-secret}"
```

---

## STEP 13: Update Lambda Code

```bash
aws lambda update-function-code \
  --function-name n8n-workflow-api-dev \
  --zip-file fileb://lambda.zip
```

---

## STEP 14: Create and Attach API Gateway (HTTP API)

### Create HTTP API

```bash
aws apigatewayv2 create-api \
  --name n8n-workflow-http-api \
  --protocol-type HTTP
```

### Create Lambda integration

```bash
aws apigatewayv2 create-integration \
  --api-id <API_ID> \
  --integration-type AWS_PROXY \
  --integration-uri arn:aws:lambda:ap-south-1:<ACCOUNT_ID>:function:n8n-workflow-api-dev \
  --payload-format-version 2.0
```

### Create route

```bash
aws apigatewayv2 create-route \
  --api-id <API_ID> \
  --route-key "ANY /{proxy+}" \
  --target integrations/<INTEGRATION_ID>
```

### Grant API Gateway permission to invoke Lambda

```bash
aws lambda add-permission \
  --function-name n8n-workflow-api-dev \
  --statement-id apigateway-access \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn arn:aws:execute-api:ap-south-1:<ACCOUNT_ID>:<API_ID>/*/*
```

### Deploy stage

```bash
aws apigatewayv2 create-stage \
  --api-id <API_ID> \
  --stage-name prod \
  --auto-deploy
```

---

## STEP 15: Trigger Poller (EventBridge)

```bash
aws events put-rule \
  --name n8n-trigger-poller \
  --schedule-expression "rate(1 minute)"
```

Attach Lambda as target.

---

## STEP 16: Worker Lambda + SQS

1. Create SQS queue
2. Create worker Lambda
3. Configure SQS trigger for worker Lambda

---

## Verification

```bash
aws lambda list-functions
aws apigatewayv2 get-apis
aws sqs list-queues
aws events list-rules
```

---

## Cost Considerations

All services used fall within AWS Free Tier for low to moderate usage.

---

## Production Best Practices

* No secrets stored in code or repository
* IAM roles scoped per service
* Event‑driven architecture
* Stateless Lambdas
* Bun used only for build and dependency management
* Node.js runtime used in AWS

---

## Summary

This deployment provides:

* Fully serverless backend architecture
* Secure secret management
* Horizontal scalability
* Clear separation of responsibilities
* No framework lock‑in

This setup is suitable for both development and production workloads.
