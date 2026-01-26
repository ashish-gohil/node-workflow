## ☁️ AWS Deployment Guide (Step-by-Step)

This section explains **exactly how to deploy the backend services to AWS**, even if you have **never used AWS before**.
It also covers **best practices for secrets management** and **all required commands**.

---

## 🧩 What Gets Deployed to AWS

| Service        | AWS Service Used                     |
| -------------- | ------------------------------------ |
| Main API       | AWS Lambda + API Gateway (HTTP API)  |
| Trigger Poller | AWS Lambda + EventBridge (Scheduled) |
| Worker         | AWS Lambda + SQS                     |
| Secrets        | AWS SSM Parameter Store              |
| Database       | MongoDB Atlas                        |

---

## 🔑 STEP 1: Create AWS Account

1. Go to [https://aws.amazon.com](https://aws.amazon.com)
2. Create an account
3. Choose **Free Tier**
4. Add billing details (required, but free-tier usage is enough)

---

## 👤 STEP 2: Create IAM User (Best Practice)

Never deploy using the root account.

1. AWS Console → **IAM**
2. Users → **Create User**
3. Username: `workflow-deployer`
4. Enable **Programmatic access**
5. Attach policy:

   * `AdministratorAccess` (for development)
6. Save:

   * **Access Key ID**
   * **Secret Access Key**

---

## 💻 STEP 3: Install AWS CLI

### Windows

Download from:
[https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2-windows.html](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2-windows.html)

Verify:

```bash
aws --version
```

---

## ⚙️ STEP 4: Configure AWS CLI

```bash
aws configure
```

Enter:

```text
AWS Access Key ID:     <your-access-key>
AWS Secret Access Key: <your-secret-key>
Default region:        ap-south-1
Default output format: json
```

✅ AWS CLI is now ready.

---

## 🔐 STEP 5: Store Secrets Securely (SSM Parameter Store)

**Never hardcode secrets or commit `.env` files in production.**

### Store MongoDB URI

```bash
aws ssm put-parameter \
  --name "/workflow/prod/mongodb-uri" \
  --value "mongodb+srv://<user>:<password>@cluster.mongodb.net/db" \
  --type SecureString
```

### Store JWT Secret

```bash
aws ssm put-parameter \
  --name "/workflow/prod/jwt-secret" \
  --value "super-secret-jwt-key" \
  --type SecureString
```

✅ Secrets are now encrypted and safe.

---

## 🔌 STEP 6: Use Secrets in Code

### `serverless.yml`

```yaml
environment:
  MONGODB_URI: ${ssm:/workflow/prod/mongodb-uri}
  JWT_SECRET: ${ssm:/workflow/prod/jwt-secret}
```

### In TypeScript

```ts
process.env.MONGODB_URI
process.env.JWT_SECRET
```

AWS injects these at runtime.

---

## 🧰 STEP 7: Install Serverless Framework

From repository root:

```bash
bun add -d serverless serverless-esbuild
```

---

## 🚀 STEP 8: Deploy Main API Service

### Go to API app

```bash
cd apps/api
```

### Build dependencies

```bash
bun run build
```

### Deploy

```bash
bunx serverless deploy
```

🎉 Output:

```text
https://xxxxx.execute-api.ap-south-1.amazonaws.com
```

---

## ⏱ STEP 9: Deploy Trigger Poller Service

### Go to poller app

```bash
cd apps/trigger-poller
```

### Deploy

```bash
bunx serverless deploy
```

This creates:

* EventBridge rule (runs every minute)
* Poller Lambda

---

## 📬 STEP 10: Deploy Worker Service

### Go to worker app

```bash
cd apps/worker
```

### Deploy

```bash
bunx serverless deploy
```

This creates:

* SQS queue
* Worker Lambda consuming messages

---

## 🔄 STEP 11: Deployment Order (Important)

Always deploy in this order:

```bash
bun run build
cd apps/api && bunx serverless deploy
cd ../trigger-poller && bunx serverless deploy
cd ../worker && bunx serverless deploy
```

---

## 🧪 Verify Deployment

### Check Lambda

```bash
aws lambda list-functions
```

### Check SQS

```bash
aws sqs list-queues
```

### Check EventBridge

```bash
aws events list-rules
```

---

## 💰 AWS Cost (Free Tier Friendly)

| Service            | Cost                |
| ------------------ | ------------------- |
| Lambda             | Free (1M req/month) |
| API Gateway (HTTP) | Very cheap          |
| EventBridge        | Free                |
| SQS                | Free                |
| SSM                | Free                |
| MongoDB Atlas      | Free tier           |

---

## 🧠 Best Practices Followed

* No infinite loops in Lambda
* Event-driven execution
* Secrets never stored in code
* Fully serverless backend
* Horizontal auto-scaling
* Strong TypeScript typing

---

## 🔚 Summary

You now have:

* A production-grade backend on AWS
* Secure secrets management
* Scalable workers
* Scheduled trigger polling
* Zero server maintenance

