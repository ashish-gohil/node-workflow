import { Model, Schema, model, models } from "mongoose";

/* -------------------- Types -------------------- */

export type WebhookHttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "ANY";

export interface IWebhookRegistration {
    webhookId: string;
    workflowId: string;
    userId: string;

    // User-chosen slug, e.g. "my-lead-hook"
    // Incoming requests hit: POST /webhooks/:path
    path: string;

    httpMethod: WebhookHttpMethod;
    isActive: boolean;

    // Optional HMAC-SHA256 secret for request signature verification.
    // If set, the executor validates the X-Webhook-Signature header before enqueueing.
    secret: string | null;

    // If non-empty, only requests from these IPs are accepted
    allowedIps: string[];
}

/* -------------------- Schema -------------------- */

const WebhookRegistrationSchema = new Schema<IWebhookRegistration>(
    {
        webhookId: {
            type: String,
            required: true,
            unique: true,
        },

        workflowId: {
            type: String,
            required: true,
            index: true,
        },

        userId: {
            type: String,
            required: true,
            index: true,
        },

        // Must be unique — the router looks up the workflow by this path on every request
        path: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },

        httpMethod: {
            type: String,
            required: true,
            enum: ["GET", "POST", "PUT", "PATCH", "DELETE", "ANY"],
            default: "POST",
        },

        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },

        secret: {
            type: String,
            default: null,
        },

        allowedIps: {
            type: [String],
            default: [], // empty = allow all
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

/* -------------------- Indexes -------------------- */

// Primary hot path: webhook router does this lookup on every incoming HTTP request
WebhookRegistrationSchema.index({ path: 1, isActive: 1 });

/* -------------------- Singleton Export -------------------- */

export const WebhookRegistrationModel: Model<IWebhookRegistration> =
    models.WebhookRegistration ??
    model<IWebhookRegistration>("WebhookRegistration", WebhookRegistrationSchema);