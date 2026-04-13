// @ts-nocheck
"use client";

import {
  WebhookAuthConfig,
  WebhookHttpMethod,
  WebhookTriggerDataTypes,
} from "@/app/types/tirggers";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { TriggerConfigProps } from "./trigger-config-dialog";






const HTTP_METHODS: WebhookHttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
];

export function WebhookTriggerConfig({
  configData,
  setConfigData,
}: TriggerConfigProps<WebhookTriggerDataTypes>) {
  const { config } = configData;

  const updateConfig = (newConfig: WebhookTriggerDataTypes["config"]) => {
    setConfigData({
      ...configData,
      config: newConfig,
    });
  };

  return (
    <div className="flex flex-col gap-3 space-y-4">
      {/* ---------------- Webhook Path ---------------- */}
      <Input
        label="Webhook Path"
        value={config.path}
        placeholder="/webhook/my-endpoint"
        onChange={(e) =>
          updateConfig({
            ...config,
            path: e.target.value,
          })
        }
      />

      {/* ---------------- HTTP Method ---------------- */}
      <div className="flex flex-col gap-1">
        <div className="text-text-secondary text-sm font-medium">
          HTTP Method
        </div>
        <Select
          value={config.methods[0]}
          onValueChange={(method) =>
            updateConfig({
              ...config,
              methods: [method as WebhookHttpMethod],
            })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select method" />
          </SelectTrigger>
          <SelectContent className="w-[180px]">
            {HTTP_METHODS.map((method) => (
              <SelectItem key={method} value={method}>
                {method}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ---------------- Authentication ---------------- */}
      <div className="flex flex-col gap-1">
        <div className="text-text-secondary text-sm font-medium">
          Authentication
        </div>
        <Select
          value={config.auth?.type ?? "none"}
          onValueChange={(type) => {
            let auth: WebhookAuthConfig;

            switch (type) {
              case "basic":
                auth = { type: "basic", username: "", password: "" };
                break;
              case "header":
                auth = { type: "header", headerName: "", value: "" };
                break;
              case "query":
                auth = { type: "query", paramName: "", value: "" };
                break;
              default:
                auth = { type: "none" };
            }

            updateConfig({
              ...config,
              auth,
            });
          }}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Select auth type" />
          </SelectTrigger>
          <SelectContent className="w-[220px]">
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="basic">Basic Auth</SelectItem>
            <SelectItem value="header">Header Auth</SelectItem>
            <SelectItem value="query">Query Param</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ---------------- Auth Fields ---------------- */}
      {config.auth?.type === "basic" && (
        <div className="space-y-3">
          <Input
            placeholder="Username"
            value={config.auth.username}
            onChange={(e) =>
              updateConfig({
                ...config,
                auth: {
                  ...config.auth!,
                  username: e.target.value,
                },
              })
            }
          />
          <Input
            type="password"
            placeholder="Password"
            value={config.auth.password}
            onChange={(e) =>
              updateConfig({
                ...config,
                auth: {
                  ...config.auth!,
                  password: e.target.value,
                },
              })
            }
          />
        </div>
      )}

      {config.auth?.type === "header" && (
        <div className="space-y-3">
          <Input
            placeholder="Header Name"
            value={config.auth.headerName}
            onChange={(e) =>
              updateConfig({
                ...config,
                auth: {
                  ...config.auth!,
                  headerName: e.target.value,
                },
              })
            }
          />
          <Input
            placeholder="Header Value"
            value={config.auth.value}
            onChange={(e) =>
              updateConfig({
                ...config,
                auth: {
                  ...config.auth!,
                  value: e.target.value,
                },
              })
            }
          />
        </div>
      )}

      {config.auth?.type === "query" && (
        <div className="space-y-3">
          <Input
            placeholder="Query Param Name"
            value={config.auth.paramName}
            onChange={(e) =>
              updateConfig({
                ...config,
                auth: {
                  ...config.auth!,
                  paramName: e.target.value,
                },
              })
            }
          />
          <Input
            placeholder="Query Param Value"
            value={config.auth.value}
            onChange={(e) =>
              updateConfig({
                ...config,
                auth: {
                  ...config.auth!,
                  value: e.target.value,
                },
              })
            }
          />
        </div>
      )}

      {/* ---------------- Response Mode ---------------- */}
      <div className="flex flex-col gap-1">
        <div className="text-text-secondary text-sm font-medium">
          Response Mode
        </div>
        <Select
          value={config.responseMode ?? "onReceived"}
          onValueChange={(mode) =>
            updateConfig({
              ...config,
              responseMode:
                mode as WebhookTriggerDataTypes["config"]["responseMode"],
            })
          }
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Select response mode" />
          </SelectTrigger>
          <SelectContent className="w-[220px]">
            <SelectItem value="onReceived">On Received</SelectItem>
            <SelectItem value="lastNode">Last Node</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ---------------- Custom Response ---------------- */}
      {config.responseMode === "custom" && (
        <div className="space-y-3">
          <Input
            type="number"
            placeholder="Status Code"
            value={config.customResponse?.statusCode ?? 200}
            onChange={(e) =>
              updateConfig({
                ...config,
                customResponse: {
                  ...config.customResponse,
                  statusCode: Number(e.target.value),
                },
              })
            }
          />
          <Input
            placeholder="Response Body"
            value={config.customResponse?.body ?? ""}
            onChange={(e) =>
              updateConfig({
                ...config,
                customResponse: {
                  ...config.customResponse,
                  body: e.target.value,
                },
              })
            }
          />
        </div>
      )}
    </div>
  );
}
