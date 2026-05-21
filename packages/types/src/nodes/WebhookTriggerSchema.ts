import * as z from "zod";

import type { NodeUIMeta } from "./field-meta";

/* ------------------------------------------------------------------ */
/*  Allowed HTTP methods                                               */
/* ------------------------------------------------------------------ */

const WebhookHttpMethodSchema = z.enum([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
]);

/* ------------------------------------------------------------------ */
/*  Auth strategies — discriminated by `type`                          */
/* ------------------------------------------------------------------ */

const NoAuthSchema = z.object({
  type: z.literal("none"),
});

const BasicAuthSchema = z.object({
  type: z.literal("basic"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const HeaderAuthSchema = z.object({
  type: z.literal("header"),
  headerName: z.string().min(1, "Header name is required"),
  value: z.string().min(1, "Header value is required"),
});

const QueryAuthSchema = z.object({
  type: z.literal("query"),
  paramName: z.string().min(1, "Query param name is required"),
  value: z.string().min(1, "Query param value is required"),
});

const WebhookAuthSchema = z.discriminatedUnion("type", [
  NoAuthSchema,
  BasicAuthSchema,
  HeaderAuthSchema,
  QueryAuthSchema,
]);

/* ------------------------------------------------------------------ */
/*  Custom response (for responseMode === "custom")                    */
/* ------------------------------------------------------------------ */

const WebhookCustomResponseSchema = z.object({
  statusCode: z.number().min(100).max(599),
  body: z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
});

/* ------------------------------------------------------------------ */
/*  Root schema                                                        */
/* ------------------------------------------------------------------ */

export const WebhookTriggerSchema = z.object({
  path: z.string().describe("Webhook URL path, e.g. /signup"),
  methods: z.array(WebhookHttpMethodSchema).min(1, "At least one HTTP method is required"),
  headers: z
    .record(z.string(), z.string())
    .optional()
    .describe("Expected request headers as key-value pairs"),
  query: z
    .record(z.string(), z.string())
    .optional()
    .describe("Expected query string parameters as key-value pairs"),
  auth: WebhookAuthSchema.optional(),
  responseMode: z
    .enum(["onReceived", "lastNode", "custom"])
    .optional()
    .describe("When and what the webhook responds to the caller"),
  customResponse: WebhookCustomResponseSchema.optional(),
  allowedIps: z.array(z.string()).optional().describe("Optional IP allow-list"),
  timeoutMs: z.number().min(100).max(120000).optional().describe("Request timeout in milliseconds"),
});

export type WebhookTrigger = z.infer<typeof WebhookTriggerSchema>;

/* ------------------------------------------------------------------ */
/*  UI metadata                                                        */
/* ------------------------------------------------------------------ */

export const WebhookTriggerUIMeta: NodeUIMeta = {
  nodeType: "webhookTrigger",
  displayName: "Webhook Trigger",
  icon: "Webhook",
  category: "trigger",
  description: "Trigger the workflow from an inbound HTTP request",
  fields: {
    path: {
      label: "Path",
      widget: "text",
      placeholder: "/signup",
    },
    methods: {
      label: "Methods",
      widget: "multiSelect",
      options: [
        { label: "GET", value: "GET" },
        { label: "POST", value: "POST" },
        { label: "PUT", value: "PUT" },
        { label: "PATCH", value: "PATCH" },
        { label: "DELETE", value: "DELETE" },
        { label: "HEAD", value: "HEAD" },
        { label: "OPTIONS", value: "OPTIONS" },
      ],
    },
    headers: {
      widget: "keyValueList",
      label: "Headers",
      keyPlaceholder: "X-Header-Name",
      valuePlaceholder: "expected-value",
    },
    query: {
      widget: "keyValueList",
      label: "Query Parameters",
      keyPlaceholder: "param",
      valuePlaceholder: "expected-value",
    },
    auth: {
      widget: "object",
      label: "Authentication",
      fields: {
        type: {
          widget: "select",
          label: "Strategy",
          default: "none",
          options: [
            { label: "None", value: "none" },
            { label: "Basic", value: "basic" },
            { label: "Header", value: "header" },
            { label: "Query param", value: "query" },
          ],
        },
        username: {
          widget: "text",
          label: "Username",
          width: "half",
          showWhen: { field: "type", in: ["basic"] },
        },
        password: {
          widget: "text",
          label: "Password",
          inputType: "password",
          width: "half",
          showWhen: { field: "type", in: ["basic"] },
        },
        headerName: {
          widget: "text",
          label: "Header name",
          width: "half",
          placeholder: "X-Webhook-Token",
          showWhen: { field: "type", in: ["header"] },
        },
        value: {
          widget: "text",
          label: "Value",
          inputType: "password",
          width: "half",
          showWhen: { field: "type", in: ["header", "query"] },
        },
        paramName: {
          widget: "text",
          label: "Query param",
          width: "half",
          placeholder: "token",
          showWhen: { field: "type", in: ["query"] },
        },
      },
    },
    responseMode: {
      widget: "select",
      label: "Response mode",
      default: "onReceived",
      options: [
        { label: "On received", value: "onReceived" },
        { label: "Last node output", value: "lastNode" },
        { label: "Custom", value: "custom" },
      ],
    },
    customResponse: {
      widget: "object",
      label: "Custom response",
      showWhen: { field: "responseMode", in: ["custom"] },
      fields: {
        statusCode: {
          widget: "number",
          label: "Status code",
          width: "half",
          default: 200,
          min: 100,
          max: 599,
        },
        body: {
          widget: "textArea",
          label: "Response body",
          placeholder: '{ "ok": true }',
          rows: 4,
          mono: true,
        },
        headers: {
          widget: "keyValueList",
          label: "Response headers",
          keyPlaceholder: "Content-Type",
          valuePlaceholder: "application/json",
        },
      },
    },
    allowedIps: {
      widget: "jsonEditor",
      label: "Allowed IPs",
      helper: 'Optional IP allow-list, e.g. ["203.0.113.5", "198.51.100.0/24"]',
      placeholder: "[]",
      rows: 3,
    },
    timeoutMs: {
      widget: "number",
      label: "Timeout (ms)",
      default: 30000,
    },
  },
};
