"use client";

import { Zap } from "lucide-react";

import { cn } from "@/lib/utils";

interface AppLogoProps {
  showWordmark?: boolean;
  className?: string;
}

export default function AppLogo({
  showWordmark = true,
  className,
}: AppLogoProps) {
  return (
    <div className={cn("flex shrink-0 items-center gap-2.5", className)}>
      <span className="btn-stamp bg-accent-primary text-accent-on size-7 shadow-[2px_2px_0_0_var(--hard-shadow-color)]">
        <Zap className="size-3.5 fill-current" aria-hidden="true" />
      </span>
      {showWordmark && (
        <span className="text-body-md text-text-primary font-bold tracking-tight">
          FLOW
        </span>
      )}
    </div>
  );
}
