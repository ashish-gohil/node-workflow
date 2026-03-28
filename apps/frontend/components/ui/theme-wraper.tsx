"use client";

import { useState } from "react";

export function ThemeHydrated({ children }: { children: React.ReactNode }) {
  const [mounted] = useState(true);

  if (!mounted) {
    return null;
  }

  return <>{children}</>;
}
