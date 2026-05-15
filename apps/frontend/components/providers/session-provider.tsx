"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";

/* Thin client wrapper so the root layout (server component) can still
 * boot the next-auth session context for hooks like useSession /
 * signIn / signOut. */
export function NextAuthSessionProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
