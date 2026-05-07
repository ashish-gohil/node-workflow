"use client";

import { Zap } from "lucide-react";

export default function AppLogo() {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <span className="bg-forest-500 flex size-7 items-center justify-center rounded-sm">
        <Zap
          className="fill-cream-50 text-cream-50 size-4"
          aria-hidden="true"
        />
      </span>
      <span className="text-body-md text-text-primary font-semibold tracking-tight">
        FLOW
      </span>
    </div>
  );
}
