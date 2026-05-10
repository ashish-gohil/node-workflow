"use client";

import { Zap } from "lucide-react";

export default function AppLogo() {
  return (
    <div className="flex shrink-0 items-center gap-2.5">
      <span className="btn-stamp bg-accent-primary text-accent-on size-7 shadow-[2px_2px_0_0_var(--hard-shadow-color)]">
        <Zap className="size-3.5 fill-current" aria-hidden="true" />
      </span>
      <span className="text-body-md text-text-primary font-bold tracking-tight">
        FLOW
      </span>
    </div>
  );
}
