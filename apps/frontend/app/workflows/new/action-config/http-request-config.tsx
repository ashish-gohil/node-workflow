"use client";

import React, { useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";

import {
  HttpAuth,
  HttpMethod,
  HttpRequestNodeData,
} from "@/app/types/actions";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface ActionConfigProps<T> {
  configData: T;
  setConfigData: React.Dispatch<React.SetStateAction<T>>;
}

const HTTP_METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

function KvEditor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
}) {
  // Keep entries as an ordered array so new blank rows appear at the bottom
  const [rows, setRows] = useState<[string, string][]>(() =>
    Object.entries(value)
  );

  const commit = (next: [string, string][]) => {
    setRows(next);
    // Only include rows that have a non-empty key
    onChange(Object.fromEntries(next.filter(([k]) => k.trim())));
  };

  const updateRow = (idx: number, key: string, val: string) => {
    const next = [...rows] as [string, string][];
    next[idx] = [key, val];
    commit(next);
  };

  const removeRow = (idx: number) => {
    const next = rows.filter((_, i) => i !== idx) as [string, string][];
    commit(next);
  };

  const addRow = () => {
    const next = [...rows, ["", ""]] as [string, string][];
    setRows(next);
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-h6 text-text-secondary tracking-wider uppercase">
        {label}
      </span>

      {rows.map(([k, v], idx) => (
        <div key={idx} className="flex items-start gap-2">
          <Input
            placeholder="Key"
            value={k}
            onChange={(e) => updateRow(idx, e.target.value, v)}
            containerClassName="flex-1"
          />
          <Input
            placeholder="Value"
            value={v}
            onChange={(e) => updateRow(idx, k, e.target.value)}
            containerClassName="flex-1"
          />
          <button
            type="button"
            aria-label="Remove row"
            onClick={() => removeRow(idx)}
            className="text-text-muted hover:text-error mt-2.5 p-1.5 transition-colors"
          >
            <Trash2Icon className="size-4" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addRow}
        className="text-text-brand hover:text-text-primary text-body-sm flex w-fit items-center gap-1 transition-colors"
      >
        <PlusIcon className="size-3.5" />
        Add {label.toLowerCase().replace(" parameters", " param")}
      </button>
    </div>
  );
}

export function HttpRequestConfig({
  configData,
  setConfigData,
}: ActionConfigProps<HttpRequestNodeData>) {
  const { config } = configData;

  const [bodyText, setBodyText] = useState(() =>
    config.body != null ? JSON.stringify(config.body, null, 2) : ""
  );
  const [bodyError, setBodyError] = useState("");

  const updateConfig = (patch: Partial<HttpRequestNodeData["config"]>) => {
    setConfigData((prev) => ({
      ...prev,
      config: { ...prev.config, ...patch },
    }));
  };

  const handleBodyChange = (text: string) => {
    setBodyText(text);
    if (!text.trim()) {
      setBodyError("");
      updateConfig({ body: undefined });
      return;
    }
    try {
      updateConfig({ body: JSON.parse(text) });
      setBodyError("");
    } catch {
      setBodyError("Invalid JSON");
    }
  };

  const showBody = ["POST", "PUT", "PATCH"].includes(config.method);

  const handleAuthChange = (type: string) => {
    let auth: HttpAuth;
    switch (type) {
      case "bearer":
        auth = { type: "bearer", token: "" };
        break;
      case "apiKey":
        auth = { type: "apiKey", headerName: "", value: "" };
        break;
      default:
        auth = { type: "none" };
    }
    updateConfig({ auth });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ---- Node label ---- */}
      <Input
        label="Node Name"
        value={configData.label}
        placeholder="HTTP Request"
        onChange={(e) =>
          setConfigData((prev) => ({ ...prev, label: e.target.value }))
        }
      />

      {/* ---- Method + URL ---- */}
      <div className="flex gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-h6 text-text-secondary tracking-wider uppercase">
            Method
          </span>
          <Select
            value={config.method}
            onValueChange={(m) => updateConfig({ method: m as HttpMethod })}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HTTP_METHODS.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Input
          label="URL"
          value={config.url}
          placeholder="https://api.example.com/endpoint"
          onChange={(e) => updateConfig({ url: e.target.value })}
          containerClassName="flex-1"
        />
      </div>

      {/* ---- Authentication ---- */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-h6 text-text-secondary tracking-wider uppercase">
            Authentication
          </span>
          <Select
            value={config.auth?.type ?? "none"}
            onValueChange={handleAuthChange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="bearer">Bearer Token</SelectItem>
              <SelectItem value="apiKey">API Key (Header)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {config.auth?.type === "bearer" && (
          <Input
            label="Token"
            type="password"
            placeholder="eyJhbGci..."
            value={config.auth.token}
            onChange={(e) =>
              updateConfig({ auth: { type: "bearer", token: e.target.value } })
            }
          />
        )}

        {config.auth?.type === "apiKey" && (
          <div className="flex gap-3">
            <Input
              label="Header Name"
              placeholder="X-Api-Key"
              value={config.auth.headerName}
              onChange={(e) =>
                updateConfig({
                  auth: {
                    type: "apiKey",
                    headerName: e.target.value,
                    value: (config.auth as Extract<HttpAuth, { type: "apiKey" }>)
                      .value,
                  },
                })
              }
              containerClassName="flex-1"
            />
            <Input
              label="Value"
              type="password"
              placeholder="secret"
              value={config.auth.value}
              onChange={(e) =>
                updateConfig({
                  auth: {
                    type: "apiKey",
                    headerName: (
                      config.auth as Extract<HttpAuth, { type: "apiKey" }>
                    ).headerName,
                    value: e.target.value,
                  },
                })
              }
              containerClassName="flex-1"
            />
          </div>
        )}
      </div>

      {/* ---- Headers ---- */}
      <KvEditor
        label="Headers"
        value={config.headers ?? {}}
        onChange={(headers) => updateConfig({ headers })}
      />

      {/* ---- Query Parameters ---- */}
      <KvEditor
        label="Query Parameters"
        value={config.query ?? {}}
        onChange={(query) => updateConfig({ query })}
      />

      {/* ---- Body (POST / PUT / PATCH only) ---- */}
      {showBody && (
        <Textarea
          label="Body (JSON)"
          mono
          rows={6}
          value={bodyText}
          placeholder={'{\n  "key": "value"\n}'}
          error={bodyError}
          onChange={(e) => handleBodyChange(e.target.value)}
        />
      )}
    </div>
  );
}
