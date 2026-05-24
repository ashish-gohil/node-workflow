# API — AWS Lambda + API Gateway

Express app compiled to a Node.js Lambda bundle and fronted by API Gateway (HTTP API).
This README is the **manual redeploy** cheat-sheet for macOS. For one-time AWS
setup (account, IAM role, SSM secrets, API Gateway wiring), see the root
[`DEPLOYMENT.md`](../../DEPLOYMENT.md).

---

## Stack at a glance

| Thing            | Value                                  |
| ---------------- | -------------------------------------- |
| AWS service      | Lambda + API Gateway (HTTP API v2)     |
| Function name    | `n8n-workflow-api-dev`                 |
| Region           | `ap-south-1`                           |
| Runtime          | `nodejs20.x` (built locally from Bun)  |
| Handler          | `dist/lambda.handler`                  |
| Secrets          | AWS SSM Parameter Store                |
| IAM role         | `lambda-basic-role`                    |

Lambda doesn't support Bun at runtime — we use Bun **only to build** a Node-compatible
CommonJS bundle, then ship that to Lambda.

---

## Prerequisites (one-time)

1. **AWS CLI v2** installed
   ```bash
   brew install awscli
   aws --version
   ```
2. **CLI configured** with deployer IAM credentials, region `ap-south-1`
   ```bash
   aws configure
   ```
3. **IAM role + SSM secrets + API Gateway + permissions** exist in AWS
   (see `DEPLOYMENT.md` STEP 5, STEP 11–14)
4. **Bun** installed (`bun --version`)

Sanity check the CLI is authenticated:
```bash
aws sts get-caller-identity
```
Should print your account ID and IAM user ARN.

---

## The redeploy loop (every time you ship a change)

From `apps/api`:

```bash
bun run deploy:full
```

That single command runs build → zip → upload. Equivalent to:

```bash
bun run build      # compile TS → dist/lambda.js (bundled, minified, CJS)
bun run zip        # produce lambda.zip from dist/ + package.json
bun run deploy     # aws lambda update-function-code
```

Run them separately if you want to inspect the bundle before uploading.

---

## What each script does

| Script             | Command                                                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `bun run build`    | `bun build src/lambda.ts --target=node --outdir dist --bundle --minify --format=cjs` — inlines every dep into `dist/lambda.js` |
| `bun run zip`      | `rm -f lambda.zip && zip -r lambda.zip dist package.json`                                                                     |
| `bun run build:zip`| build → zip                                                                                                                   |
| `bun run deploy`   | `aws lambda update-function-code --function-name n8n-workflow-api-dev --zip-file fileb://lambda.zip --region ap-south-1`      |
| `bun run deploy:full` | build → zip → deploy                                                                                                       |
| `bun run logs`     | `aws logs tail /aws/lambda/n8n-workflow-api-dev --follow --region ap-south-1` — stream CloudWatch logs                        |

The `--bundle` flag inlines all `dependencies`, so `node_modules/` is **not** included in the zip — the bundle in `dist/` is self-contained. `package.json` is included so Lambda has a manifest.

---

## Manual zip (without the script)

If you want to do it by hand:

```bash
cd apps/api
bun build src/lambda.ts --target=node --outdir dist --bundle --minify --format=cjs
rm -f lambda.zip
zip -r lambda.zip dist package.json
```

Inspect the zip contents:
```bash
unzip -l lambda.zip
```

---

## Manual deploy (without the script)

```bash
aws lambda update-function-code \
  --function-name n8n-workflow-api-dev \
  --zip-file fileb://lambda.zip \
  --region ap-south-1
```

The `fileb://` prefix tells AWS CLI it's a binary file, not a JSON file.

Verify the new code is live:
```bash
aws lambda get-function-configuration \
  --function-name n8n-workflow-api-dev \
  --region ap-south-1 \
  --query 'LastModified'
```

---

## First-time function creation

If the function doesn't exist yet (e.g. fresh account), use `create-function`
instead of `update-function-code` for the very first upload:

```bash
aws lambda create-function \
  --function-name n8n-workflow-api-dev \
  --runtime nodejs20.x \
  --handler dist/lambda.handler \
  --zip-file fileb://lambda.zip \
  --role arn:aws:iam::<ACCOUNT_ID>:role/lambda-basic-role \
  --environment Variables="{MONGODB_URI=/n8n/prod/mongodb-uri,JWT_SECRET=/n8n/prod/jwt-secret}" \
  --region ap-south-1
```

Find `<ACCOUNT_ID>` with `aws sts get-caller-identity --query Account --output text`.

After creating, also wire it to API Gateway — see `DEPLOYMENT.md` STEP 14.

---

## Smoke-test the deployed function

Invoke directly via CLI:
```bash
aws lambda invoke \
  --function-name n8n-workflow-api-dev \
  --region ap-south-1 \
  --payload '{"version":"2.0","rawPath":"/health","requestContext":{"http":{"method":"GET"}}}' \
  --cli-binary-format raw-in-base64-out \
  /tmp/lambda-out.json
cat /tmp/lambda-out.json
```

Or hit the API Gateway URL (find it with):
```bash
aws apigatewayv2 get-apis --region ap-south-1 --query 'Items[].ApiEndpoint'
```

---

## Tail logs while debugging

In one terminal:
```bash
bun run logs
```
In another, hit the endpoint — log lines stream live.

---

## Troubleshooting

| Symptom                                          | Likely cause / fix                                                                 |
| ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `command not found: aws`                         | Install AWS CLI v2: `brew install awscli`                                          |
| `Unable to locate credentials`                   | Run `aws configure` and enter the deployer IAM access key/secret + region          |
| `ResourceNotFoundException` on `update-function-code` | Function doesn't exist — use `create-function` (see "First-time function creation") |
| `RequestEntityTooLargeException` (>50 MB)        | Bundle bloated. Confirm `--minify` is on and `node_modules` isn't in the zip       |
| Deploy succeeds but old code runs                | Cold-start; wait ~30s or invoke once. Verify with `LastModified` above             |
| Lambda errors with `Cannot find module 'xyz'`    | A dynamic require missed bundling — add it to `dependencies` and rebuild           |
| `AccessDeniedException` reading SSM              | `lambda-basic-role` is missing `AmazonSSMReadOnlyAccess` — see `DEPLOYMENT.md` 11  |

---

## File layout

```
apps/api/
├── src/
│   ├── lambda.ts          ← Lambda handler entrypoint (wraps Express with serverless-http)
│   ├── server.ts          ← local dev entrypoint
│   ├── index.ts           ← Express app
│   ├── routes/
│   └── middlewares/
├── dist/                  ← build output (gitignored)
├── lambda.zip             ← deployment artifact (gitignored)
├── trust-policy.json      ← IAM role trust doc (one-time)
└── package.json
```
