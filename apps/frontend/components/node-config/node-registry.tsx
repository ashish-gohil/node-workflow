"use client";

import type { ReactNode } from "react";
import { HttpRequestSchema, HttpRequestUIMeta, type NodeUIMeta } from "@repo/types";
import { Globe } from "lucide-react";
import type { ZodType } from "zod";

export interface NodeRegistryEntry {
  schema: ZodType;
  uiMeta: NodeUIMeta;
  icon: ReactNode;
}

const iconClass = "size-5";

/**
 * Maps a workflow node type to its Zod schema and UI metadata. Only nodes
 * whose stored data already matches the shared schema appear here — others
 * stay on the legacy hand-written config dialog until migrated.
 */
export const NODE_REGISTRY: Record<string, NodeRegistryEntry> = {
  httpRequest: {
    schema: HttpRequestSchema as unknown as ZodType,
    uiMeta: HttpRequestUIMeta,
    icon: <Globe className={iconClass} />,
  },
};

export function getNodeRegistryEntry(nodeType: string): NodeRegistryEntry | undefined {
  return NODE_REGISTRY[nodeType];
}
