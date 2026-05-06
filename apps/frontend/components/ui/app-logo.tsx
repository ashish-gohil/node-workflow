"use client";

import { Zap } from "lucide-react";

export default function AppLogo() {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <span className="flex size-7 items-center justify-center bg-forest-500 rounded-sm">
        <Zap className="size-4 fill-cream-50 text-cream-50" aria-hidden="true" />
      </span>
      <span className="text-body-md font-semibold tracking-tight text-text-primary">
        FLOW
      </span>
    </div>
  );
}
