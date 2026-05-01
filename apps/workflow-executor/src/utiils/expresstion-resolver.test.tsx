// expressionResolver.test.ts

import { describe, it, expect, beforeEach } from "vitest";
import { expressionResolver } from "./expression-resolver";

// Simulates a workflow that:
//   1. Webhook trigger received an incoming order
//   2. HTTP Request fetched full customer profile from an API
//   3. Set Variable node built a summary object
//
// This mirrors exactly what executionContext looks like inside your NodeRunner
// when it calls expressionResolver before executing the next node.

const executionContext = {
  // Node 1 — Webhook trigger received a new order
  "Webhook Trigger": {
    output: {
      body: {
        orderId: "ORD-9821",
        customerId: "CUST-441",
        items: [
          { productId: "PROD-1", name: "Keyboard", qty: 1, price: 79.99 },
          { productId: "PROD-2", name: "Mouse", qty: 2, price: 29.99 },
        ],
        totalAmount: 139.97,
        isPriority: true,
      },
      headers: {
        "content-type": "application/json",
        "x-webhook-secret": "abc123",
      },
      query: {
        source: "shopify",
      },
    },
  },

  // Node 2 — HTTP Request fetched customer profile
  "Fetch Customer": {
    output: {
      statusCode: 200,
      body: {
        id: "CUST-441",
        name: "Rahul Sharma",
        email: "rahul@example.com",
        phone: "+91-9876543210",
        address: {
          line1: "12 MG Road",
          city: "Surat",
          state: "Gujarat",
          pincode: "395003",
        },
        tier: "premium",
        totalOrders: 42,
      },
      headers: {
        "content-type": "application/json",
      },
    },
  },

  // Node 3 — Set Variable built a notification payload
  "Build Notification": {
    output: {
      subject: "Order ORD-9821 confirmed",
      recipients: ["rahul@example.com", "support@yourstore.com"],
      metadata: {
        orderId: "ORD-9821",
        dispatchIn: 24,
      },
    },
  },
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Expression Resolver", () => {
  describe("expressionResolver()", () => {
    describe("no expressions — passthrough", () => {
      it("plain string with no expression returns unchanged", () => {
        const result = expressionResolver("hello world", executionContext);
        expect(result).toBe("hello world");
      });

      it("number value returns unchanged", () => {
        const result = expressionResolver(42, executionContext);
        expect(result).toBe(42);
      });

      it("boolean value returns unchanged", () => {
        const result = expressionResolver(true, executionContext);
        expect(result).toBe(true);
      });

      it("null returns unchanged", () => {
        const result = expressionResolver(null, executionContext);
        expect(result).toBeNull();
      });
    });

    describe("single expression in a string", () => {
      it("resolves a simple top-level string field", () => {
        // config: "{{Fetch Customer.output.body.email}}"
        const result = expressionResolver("{{Fetch Customer.output.body.email}}", executionContext);
        expect(result).toBe("rahul@example.com");
      });

      it("resolves a number field as embedded string", () => {
        // When embedded in a larger string, numbers become strings
        const result = expressionResolver(
          "Order total is {{Webhook Trigger.output.body.totalAmount}}",
          executionContext
        );
        expect(result).toBe("Order total is 139.97");
      });

      it("resolves a deeply nested field", () => {
        const result = expressionResolver(
          "{{Fetch Customer.output.body.address.city}}",
          executionContext
        );
        expect(result).toBe("Surat");
      });
    });

    describe("multiple expressions in one string", () => {
      it("resolves two expressions in one string", () => {
        // Real use case: building a greeting for an email node
        const result = expressionResolver(
          "Hi {{Fetch Customer.output.body.name}}, your order {{Webhook Trigger.output.body.orderId}} is confirmed.",
          executionContext
        );
        expect(result).toBe("Hi Rahul Sharma, your order ORD-9821 is confirmed.");
      });

      it("resolves three expressions from different nodes", () => {
        const result = expressionResolver(
          "{{Fetch Customer.output.body.name}} | {{Fetch Customer.output.body.email}} | {{Fetch Customer.output.body.tier}}",
          executionContext
        );
        expect(result).toBe("Rahul Sharma | rahul@example.com | premium");
      });
    });

    describe("whole string is one expression — returns raw type", () => {
      it("returns the actual object when expression resolves to object", () => {
        // Real use case: passing address object to a mapping node
        const result = expressionResolver(
          "{{Fetch Customer.output.body.address}}",
          executionContext
        );
        // Should return the object — NOT "[object Object]"
        expect(result).toEqual({
          line1: "12 MG Road",
          city: "Surat",
          state: "Gujarat",
          pincode: "395003",
        });
      });

      it("returns the actual array when expression resolves to array", () => {
        // Real use case: passing items array to a loop/merge node
        const result = expressionResolver(
          "{{Webhook Trigger.output.body.items}}",
          executionContext
        );
        expect(result).toEqual([
          { productId: "PROD-1", name: "Keyboard", qty: 1, price: 79.99 },
          { productId: "PROD-2", name: "Mouse", qty: 2, price: 29.99 },
        ]);
      });

      it("returns actual number when expression resolves to number", () => {
        const result = expressionResolver(
          "{{Webhook Trigger.output.body.totalAmount}}",
          executionContext
        );
        expect(result).toBe(139.97); // number, not "139.97"
        expect(typeof result).toBe("number");
      });

      it("returns actual boolean when expression resolves to boolean", () => {
        const result = expressionResolver(
          "{{Webhook Trigger.output.body.isPriority}}",
          executionContext
        );
        expect(result).toBe(true);
        expect(typeof result).toBe("boolean");
      });
    });

    describe("missing or invalid paths", () => {
      it("returns empty string when node does not exist in context", () => {
        const result = expressionResolver("{{Nonexistent Node.output.body.id}}", executionContext);
        expect(result).toBe("");
      });

      it("returns empty string when field does not exist on a real node", () => {
        const result = expressionResolver(
          "{{Fetch Customer.output.body.nonexistentField}}",
          executionContext
        );
        expect(result).toBe("");
      });

      it("returns empty string for deeply missing nested path", () => {
        const result = expressionResolver(
          "{{Fetch Customer.output.body.address.country.isoCode}}",
          executionContext
        );
        expect(result).toBe("");
      });

      it("replaces missing expression with empty string in a larger string", () => {
        const result = expressionResolver(
          "Hello {{Fetch Customer.output.body.nickname}}, welcome!",
          executionContext
        );
        // nickname doesn't exist — replaced with "" — rest of string intact
        expect(result).toBe("Hello , welcome!");
      });
    });

    describe("recursive — nested object config", () => {
      it("resolves expressions in a flat object", () => {
        // Real use case: HTTP node config before it runs
        const config = {
          url: "https://api.example.com/notify/{{Fetch Customer.output.body.id}}",
          method: "POST",
        };
        const result = expressionResolver(config, executionContext);
        expect(result).toEqual({
          url: "https://api.example.com/notify/CUST-441",
          method: "POST",
        });
      });

      it("resolves expressions in a nested object config", () => {
        // Real use case: send email node config
        const config = {
          to: "{{Fetch Customer.output.body.email}}",
          subject: "{{Build Notification.output.subject}}",
          body: {
            greeting: "Hi {{Fetch Customer.output.body.name}}",
            orderId: "{{Webhook Trigger.output.body.orderId}}",
          },
        };
        const result = expressionResolver(config, executionContext);
        expect(result).toEqual({
          to: "rahul@example.com",
          subject: "Order ORD-9821 confirmed",
          body: {
            greeting: "Hi Rahul Sharma",
            orderId: "ORD-9821",
          },
        });
      });

      it("resolves expressions inside an array of strings", () => {
        // Real use case: recipients list for email node
        const config = ["{{Fetch Customer.output.body.email}}", "admin@yourstore.com"];
        const result = expressionResolver(config, executionContext);
        expect(result).toEqual(["rahul@example.com", "admin@yourstore.com"]);
      });

      it("resolves expressions inside an array of objects", () => {
        const config = [
          { label: "Customer", value: "{{Fetch Customer.output.body.name}}" },
          { label: "Order ID", value: "{{Webhook Trigger.output.body.orderId}}" },
        ];
        const result = expressionResolver(config, executionContext);
        expect(result).toEqual([
          { label: "Customer", value: "Rahul Sharma" },
          { label: "Order ID", value: "ORD-9821" },
        ]);
      });

      it("resolves a whole-value expression inside a nested key", () => {
        // The address field is an expression that resolves to an object
        // Should return the object, not "[object Object]"
        const config = {
          recipient: "{{Fetch Customer.output.body.name}}",
          shippingAddress: "{{Fetch Customer.output.body.address}}",
        };
        const result = expressionResolver(config, executionContext) as any;
        expect(result.recipient).toBe("Rahul Sharma");
        expect(result.shippingAddress).toEqual({
          line1: "12 MG Road",
          city: "Surat",
          state: "Gujarat",
          pincode: "395003",
        });
      });
    });
  });
});
