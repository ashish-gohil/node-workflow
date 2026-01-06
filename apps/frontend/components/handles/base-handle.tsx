import type { ComponentProps } from "react";
import { Handle, type HandleProps } from "@xyflow/react";

import { cn } from "@/lib/utils";

export type BaseHandleProps = HandleProps;

export function BaseHandle({
  className,
  children,
  ...props
}: ComponentProps<typeof Handle>) {
  return (
    <Handle
      {...props}
      className={cn(
        "size-2! hover:scale-110 rounded-full border border-border-inverse! bg-accent-muted! transition-colors",
        className
      )}
    >
      {children}
    </Handle>
  );
}
