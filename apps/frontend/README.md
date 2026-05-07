## 🔔 TRIGGERS (Start the workflow)

These are the **most important first nodes**.

### 1️⃣ Manual Trigger

> “Run workflow manually”

**Why it’s essential**

- Debugging
- Testing flows
- Matches n8n’s _Manual Trigger_

**Use cases**

- Click → Run workflow
- Test downstream nodes

---

### 2️⃣ Schedule Trigger

> “Run on time / interval”

**Modes to support**

- Every X seconds / minutes / hours
- Daily at time
- Weekly
- Custom cron

**Use cases**

- Cron jobs
- Polling APIs
- Scheduled reports

---

### 3️⃣ Webhook Trigger ⭐ (Very important)

> “Run when HTTP request is received”

**Config**

- HTTP Method (GET, POST, PUT, DELETE)
- Path
- Authentication (none / header token / basic)
- Response mode (sync / async)

**Use cases**

- GitHub webhooks
- Stripe events
- Form submissions

---

### 4️⃣ App Event Trigger (Later)

> “Trigger from internal system events”

**Examples**

- New user created
- Order completed
- Payment failed

(You can add this later once you have internal events.)

---

## ⚙️ ACTION NODES (Do work)

These nodes **process data** or **talk to systems**.

---

### 1️⃣ HTTP Request Node ⭐

> “Call any API”

**Must-have features**

- Method (GET, POST, PUT, DELETE)
- Headers
- Query params
- Body (JSON / form)
- Auth (API key, Bearer token)

**Why critical**

- Replaces dozens of integrations
- Core n8n node

---

### 2️⃣ Set / Transform Node ⭐

> “Modify data”

**Capabilities**

- Add fields
- Remove fields
- Rename keys
- Set static values

**Example**

```json
{
  "email": "{{$json.user.email}}",
  "status": "active"
}
```

---

### 3️⃣ IF / Condition Node ⭐

> “Branch workflow”

**Conditions**

- Equals
- Not equals
- Greater / less
- Exists
- Contains

**Outputs**

- True → path A
- False → path B

---

### 4️⃣ Code Node (JS)

> “Run JavaScript”

**Why important**

- Escape hatch for advanced users
- Power users love this

**Example**

```js
return {
  fullName: `${input.firstName} ${input.lastName}`,
};
```

---

### 5️⃣ Delay / Wait Node

> “Pause execution”

**Modes**

- Wait X seconds
- Wait until timestamp

**Use cases**

- Rate limiting
- Follow-up emails
- Retry logic

---

### 6️⃣ Merge Node

> “Combine multiple branches”

**Modes**

- Merge by index
- Merge by key
- Append

---

### 7️⃣ Logger / Debug Node

> “Inspect data”

**Features**

- Log input
- Show output in UI
- Helpful for debugging

---

## 🌐 INTEGRATION NODES (Phase 2)

Once core is stable, add these:

### Common ones

- Email (SMTP / SendGrid)
- Slack
- Discord
- Notion
- Google Sheets
- Webhook Response node

---

## 🧠 Minimal MVP Node Set (Recommended)

If you want **small but powerful**:

### Triggers

- Manual Trigger
- Schedule Trigger
- Webhook Trigger

### Actions

- HTTP Request
- Set
- IF
- Code
- Delay

That alone can already build **real automations**.

---

## 🧩 Node Categories (for UI)

Use this grouping early — very n8n-like:

- **Triggers**
- **Flow**
- **Data**
- **Code**
- **Network**
- **Utilities**
