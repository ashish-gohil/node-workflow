import { type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export type NodeStatus = "loading" | "success" | "error" | "initial";
export type NodeStatusVariant = "overlay" | "border";

export type NodeStatusIndicatorProps = {
  status?: NodeStatus;
  variant?: NodeStatusVariant;
  children: ReactNode;
  className?: string;
};

/* Spinning overlay for loading state */
function SpinnerOverlay({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      {children}
      <div className="absolute inset-0 z-10 rounded-sm bg-bg-elevated/60 backdrop-blur-[2px]" />
      <div className="absolute inset-0 z-20 flex items-center justify-center">
        <LoaderCircle className="size-5 animate-spin text-forest-300" />
      </div>
    </div>
  );
}

/* Animated border pulse for loading state */
function BorderPulse({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      {/* Animated ring */}
      <span
        className="pointer-events-none absolute -inset-px rounded-sm border border-forest-300 animate-pulse"
        aria-hidden="true"
      />
      {children}
    </div>
  );
}

/* Inset status edge — matches the FLOW node card spec */
function StatusEdge({
  children,
  status,
  className,
}: {
  children: ReactNode;
  status: "success" | "error";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative rounded-sm",
        status === "success" && "[box-shadow:inset_2px_0_0_0_#52b788]",
        status === "error"   && "[box-shadow:inset_2px_0_0_0_#e5484d,0_0_0_1px_rgba(229,72,77,0.4),0_0_12px_rgba(229,72,77,0.2)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export const NodeStatusIndicator = ({
  status,
  variant = "border",
  children,
  className,
}: NodeStatusIndicatorProps) => {
  switch (status) {
    case "loading":
      return variant === "overlay"
        ? <SpinnerOverlay className={className}>{children}</SpinnerOverlay>
        : <BorderPulse className={className}>{children}</BorderPulse>;

    case "success":
      return <StatusEdge status="success" className={className}>{children}</StatusEdge>;

    case "error":
      return <StatusEdge status="error" className={className}>{children}</StatusEdge>;

    default:
      return <>{children}</>;
  }
};
