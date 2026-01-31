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

> **Note:** This user will be used with AWS CLI for deployments.

---

## STEP 3: Install AWS CLI

### Windows

Download and install AWS CLI v2:
[https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2-windows.html](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2-windows.html)

Verify installation:

```bash
aws --version
```

> Returns CLI version, e.g. `aws-cli/2.12.14 Python/3.11.6 Windows/10 exe/AMD64`.

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

**Explanation:**

* `AWS Access Key ID` & `AWS Secret Access Key` → allows CLI to authenticate
* `Default region` → region where your resources (Lambda, SSM, etc.) will be created
* `Default output format` → how CLI displays responses (`json` is recommended)

---

## STEP 5: Store Secrets in SSM Parameter Store

Secrets must never be committed to source control.
Use **SecureString** type for encryption.

### MongoDB URI

```bash
aws ssm put-parameter \
  --name "/n8n/prod/mongodb-uri" \
  --value "mongodb+srv://<user>:<password>@cluster.mongodb.net/db" \
  --type SecureString
```

**Explanation:**

* `put-parameter` → creates a new parameter in SSM
* `--name` → parameter name (used in Lambda as env var)
* `--value` → the secret
* `--type SecureString` → encrypted and safe

### JWT Secret

```bash
aws ssm put-parameter \
  --name "/n8n/prod/jwt-secret" \
  --value "super-secret-jwt-key" \
  --type SecureString
```

> **Note:** In Lambda, you will reference the **parameter names**, not the values.

---

## STEP 6: Access Secrets in Lambda Code

Set environment variables to **SSM parameter names**:

```
MONGODB_URI=/n8n/prod/mongodb-uri
JWT_SECRET=/n8n/prod/jwt-secret
```

In your Lambda code, fetch the actual secret using AWS SDK:

```ts
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const ssm = new SSMClient({ region: "ap-south-1" });

async function getSecretValue(paramName: string) {
  const res = await ssm.send(new GetParameterCommand({
    Name: paramName,
    WithDecryption: true
  }));
  return res.Parameter!.Value!;
}
```

---

## STEP 7: Prepare Lambda Code

Lambda handlers must be Node‑compatible JavaScript.

```ts
export const handler = async () => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Lambda running' })
  };
};
```

---

## STEP 8: Build Lambda Using Bun

```bash
bun build src/lambda.ts --outdir dist --target=node --bundle --minify --format=cjs
```

**Explanation:**

* `--target=node` → compile TypeScript to Node.js-compatible JavaScript
* `--bundle` → include all dependencies in one file
* `--minify` → reduce file size
* `--format=cjs` → CommonJS, compatible with Lambda

---

## STEP 9: Install Production Dependencies

```bash
bun install --production
```

**Explanation:** installs only production dependencies (no dev dependencies) into `node_modules`.

---

## STEP 10: Create Deployment ZIP

### Windows

```powershell
Compress-Archive -Path dist,node_modules,package.json -DestinationPath lambda.zip
```

**Explanation:**

* `dist` → compiled Lambda code
* `node_modules` → dependencies
* `package.json` → dependency metadata
* `lambda.zip` → file uploaded to Lambda

---

## STEP 11: Create IAM Role for Lambda

### Create trust policy file: `trust-policy.json`

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "lambda.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

**Explanation:** Allows Lambda service to assume the role.

### Create IAM role

```bash
aws iam create-role \
  --role-name lambda-basic-role \
  --assume-role-policy-document file://trust-policy.json
```

**Explanation:** Creates a role named `lambda-basic-role` with the trust policy above.

### Attach required policies

```bash
# Basic Lambda execution (CloudWatch logging)
aws iam attach-role-policy \
  --role-name lambda-basic-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Read-only access to SSM parameters
aws iam attach-role-policy \
  --role-name lambda-basic-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonSSMReadOnlyAccess
```

**Explanation:**

* `AWSLambdaBasicExecutionRole` → allows Lambda to write logs
* `AmazonSSMReadOnlyAccess` → allows Lambda to fetch secrets from SSM

> Optionally, for tighter security, create a **custom policy** granting access only to your parameter paths.

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

**Explanation:**

* `--runtime` → Node.js runtime for Lambda
* `--handler` → file and exported function
* `--zip-file` → deployment package
* `--role` → IAM role Lambda assumes
* `--environment Variables` → SSM parameter names injected as env vars

---

## STEP 13: Update Lambda Code

```bash
aws lambda update-function-code \
  --function-name n8n-workflow-api-dev \
  --zip-file fileb://lambda.zip
```

**Explanation:** Uploads new code without recreating Lambda.

---

## STEP 14: Create and Attach API Gateway (HTTP API)

### Create HTTP API

```bash
aws apigatewayv2 create-api \
  --name n8n-workflow-http-api \
  --protocol-type HTTP
```

**Explanation:** Creates an HTTP API (API Gateway v2).

### Create Lambda integration

```bash
aws apigatewayv2 create-integration \
  --api-id <API_ID> \
  --integration-type AWS_PROXY \
  --integration-uri arn:aws:lambda:ap-south-1:<ACCOUNT_ID>:function:n8n-workflow-api-dev \
  --payload-format-version 2.0
```

**Explanation:**

* `AWS_PROXY` → API Gateway passes request directly to Lambda
* `integration-uri` → ARN of your Lambda
* `payload-format-version 2.0` → HTTP API payload format

### Create route

```bash
aws apigatewayv2 create-route \
  --api-id <API_ID> \
  --route-key "ANY /{proxy+}" \
  --target integrations/<INTEGRATION_ID>
```

**Explanation:**
All paths (`/{proxy+}`) are routed to Lambda.

### Grant API Gateway permission to invoke Lambda

```bash
aws lambda add-permission \
  --function-name n8n-workflow-api-dev \
  --statement-id apigateway-access \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn arn:aws:execute-api:ap-south-1:<ACCOUNT_ID>:<API_ID>/*/*
```

**Explanation:** Allows API Gateway to call Lambda.

### Deploy stage

```bash
aws apigatewayv2 create-stage \
  --api-id <API_ID> \
  --stage-name prod \
  --auto-deploy
```

**Explanation:** Creates `prod` stage, deploys routes and integration automatically.

---

## STEP 15: Trigger Poller (EventBridge)

```bash
aws events put-rule \
  --name n8n-trigger-poller \
  --schedule-expression "rate(1 minute)"
```

**Explanation:** Creates a scheduled EventBridge rule (cron or rate) that can invoke Lambda.

---

## STEP 16: Worker Lambda + SQS

1. Create SQS queue
2. Create worker Lambda
3. Configure SQS trigger for worker Lambda

**Explanation:** Enables asynchronous background jobs.

---

## Verification

```bash
aws lambda list-functions       # Lists all Lambda functions
aws apigatewayv2 get-apis       # Lists all HTTP APIs
aws sqs list-queues             # Lists all SQS queues
aws events list-rules           # Lists EventBridge rules
```

**Explanation:** Verifies your resources are created and configured.

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
* Fetch secrets from SSM at runtime and cache in memory
* Avoid dynamic `require()` or `import()` for Lambda bundling
* MongoDB connections use singleton pattern for cold-start reuse

---

## Summary

This deployment provides:

* Fully serverless backend architecture
* Secure secret management via SSM Parameter Store
* Horizontal scalability
* Clear separation of responsibilities
* Environment-agnostic code (works for dev & prod)
* No Serverless Framework lock-in
