import React, { ReactNode } from "react";

import { cn } from "@/lib/utils";

export default function DottedBackground({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="bg-bg relative flex h-full w-full items-center justify-center">
      <div
        className={cn(
          "absolute inset-0",
          "bg-size-[25px_25px]",
          "bg-[radial-gradient(var(--color-text-muted)_1px,transparent_1px)]",
          className
        )}
      />

      {children}
    </div>
  );
}
