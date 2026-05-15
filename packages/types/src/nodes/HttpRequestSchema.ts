import * as z from "zod";

import type { NodeUIMeta } from "./field-meta";

/* ------------------------------------------------------------------ */
/*  Body variants                                                      */
/* ------------------------------------------------------------------ */

const JsonBodySchema = z.object({
  bodyContentType: z.literal("json"),
  body: z.unknown().optional().describe("JSON body"),
});

const RawBodySchema = z.object({
  bodyContentType: z.literal("raw"),
  body: z.string().optional().describe("Raw text body"),
});

const UrlencodedBodySchema = z.object({
  bodyContentType: z.literal("urlencoded"),
  body: z.record(z.string(), z.string()).optional().describe("URL-encoded key-value pairs"),
});

const FormDataBodySchema = z.object({
  bodyContentType: z.literal("form-data"),
  body: z
    .record(z.string(), z.union([z.string(), z.instanceof(File)]))
    .optional()
    .describe("Multipart form-data fields"),
});

const NoBodySchema = z.object({
  bodyContentType: z.literal("none").optional(),
  body: z.undefined(),
});

const BodyVariants = z.discriminatedUnion("bodyContentType", [
  JsonBodySchema,
  RawBodySchema,
  UrlencodedBodySchema,
  FormDataBodySchema,
  NoBodySchema,
]);

/* ------------------------------------------------------------------ */
/*  Auth variants                                                      */
/* ------------------------------------------------------------------ */

const NoAuthSchema = z.object({
  type: z.literal("none"),
});

const BearerAuthSchema = z.object({
  type: z.literal("bearer"),
  token: z.string().min(1, "Token is required"),
});

const ApiKeyAuthSchema = z.object({
  type: z.literal("apiKey"),
  headerName: z.string().min(1, "Header name is required"),
  value: z.string().min(1, "Value is required"),
});

const AuthSchema = z.discriminatedUnion("type", [
  NoAuthSchema,
  BearerAuthSchema,
  ApiKeyAuthSchema,
]);

/* ------------------------------------------------------------------ */
/*  Root schema                                                        */
/* ------------------------------------------------------------------ */

export const HttpRequestSchema = z
  .object({
    url: z.url().describe("The endpoint URL to call"),
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).describe("HTTP method"),
    headers: z
      .record(z.string(), z.string())
      .optional()
      .describe("Request headers as key-value pairs"),
    query: z
      .record(z.string(), z.string())
      .optional()
      .describe("Query string parameters as key-value pairs"),
    auth: AuthSchema.optional().describe("Authentication strategy"),
    timeoutMs: z
      .number()
      .min(100)
      .max(60000)
      .optional()
      .describe("Request timeout in milliseconds"),
  })
  .and(BodyVariants);

export type HttpRequest = z.infer<typeof HttpRequestSchema>;

/* ------------------------------------------------------------------ */
/*  UI metadata — separate from the schema, used only by frontend     */
/* ------------------------------------------------------------------ */

export const HttpRequestUIMeta: NodeUIMeta = {
  nodeType: "httpRequest",
  displayName: "HTTP Request",
  icon: "Globe",
  category: "action",
  description: "Make an HTTP request to any URL",
  fields: {
    method: {
      widget: "select",
      label: "Method",
      width: "third",
      default: "GET",
      options: [
        { label: "GET", value: "GET" },
        { label: "POST", value: "POST" },
        { label: "PUT", value: "PUT" },
        { label: "PATCH", value: "PATCH" },
        { label: "DELETE", value: "DELETE" },
      ],
    },
    url: {
      widget: "text",
      label: "URL",
      width: "twoThirds",
      placeholder: "https://api.example.com/users",
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
            { label: "Bearer Token", value: "bearer" },
            { label: "API Key (Header)", value: "apiKey" },
          ],
        },
        token: {
          widget: "text",
          label: "Token",
          inputType: "password",
          placeholder: "eyJhbGci...",
          showWhen: { field: "type", in: ["bearer"] },
        },
        headerName: {
          widget: "text",
          label: "Header Name",
          width: "half",
          placeholder: "X-Api-Key",
          showWhen: { field: "type", in: ["apiKey"] },
        },
        value: {
          widget: "text",
          label: "Value",
          inputType: "password",
          width: "half",
          placeholder: "secret",
          showWhen: { field: "type", in: ["apiKey"] },
        },
      },
    },
    headers: { widget: "keyValueList", label: "Headers" },
    query: { widget: "keyValueList", label: "Query Parameters" },
    bodyContentType: {
      widget: "select",
      label: "Body content type",
      default: "none",
      options: [
        { label: "None", value: "none" },
        { label: "JSON", value: "json" },
        { label: "Raw", value: "raw" },
        { label: "URL Encoded", value: "urlencoded" },
      ],
    },
    body: {
      label: "Body",
      widget: "conditional",
      dependsOn: "bodyContentType",
      widgetMap: {
        none: null,
        json: "jsonEditor",
        raw: "textArea",
        urlencoded: "keyValueList",
      },
    },
    timeoutMs: { widget: "number", label: "Timeout MS", default: 30000 },
  },
};
