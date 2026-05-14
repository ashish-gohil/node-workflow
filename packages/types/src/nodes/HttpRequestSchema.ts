import * as z from "zod";

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

export const HttpRequestSchema = z
  .object({
    url: z.url().describe("The endpoint URL to call"),
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).describe("HTTP method"),
    headers: z
      .record(z.string(), z.string())
      .optional()
      .describe("Request headers as key-value pairs"),
    timeoutMs: z
      .number()
      .min(100)
      .max(60000)
      .optional()
      .describe("Request timeout in milliseconds"),
  })
  .and(BodyVariants);

export type HttpRequest = z.infer<typeof HttpRequestSchema>;

// UI metadata — separate from the schema, used only by frontend
export const HttpRequestUIMeta = {
  nodeType: "httpRequest",
  displayName: "HTTP Request",
  icon: "Globe",
  category: "action",
  description: "Make an HTTP request to any URL",
  fields: {
    url: { widget: "text", label: "URL", placeholder: "https://api.example.com/users" },
    method: {
      widget: "select",
      label: "Method",
      default: "GET",
      options: [
        { label: "GET", value: "GET" },
        { label: "POST", value: "POST" },
        { label: "PUT", value: "PUT" },
        { label: "PATCH", value: "PATCH" },
        { label: "DELETE", value: "DELETE" },
      ],
    },
    headers: { widget: "keyValueList", label: "Headers" },
    bodyContentType: {
      widget: "select",
      options: [
        { label: "None", value: "none" },
        { label: "JSON", value: "json" },
        { label: "Raw", value: "raw" },
        { label: "URL Encoded", value: "urlencoded" },
        { label: "Form data", value: "form-data" },
      ],
      default: "none",
      label: "Body content type",
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
        "form-data": "formDataEditor",
      },
    },
    timeoutMs: { widget: "number", label: "Timeout MS", default: 30000 },
  },
};
