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
        "border-border-strong! bg-bg-canvas! hover:border-accent-primary! size-2! rounded-full border-2 transition-colors duration-[120ms] hover:scale-110",
        className
      )}
    >
      {children}
    </Handle>
  );
}
