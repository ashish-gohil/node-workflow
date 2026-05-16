import { Handle, Position } from "@xyflow/react";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";

/* ============================================================
   CUSTOM HANDLE — handle visual paired with a connector stub
   and an inline "+" affordance. Used where ButtonHandle's full
   sheet integration isn't needed.
   ============================================================ */

type CustomHandleProps = {
  position?: Position;
  type?: "source" | "target";
  showPlus?: boolean;
  label?: string;
  className?: string;
  handleId: string;
};

export function CustomHandle({
  position = Position.Right,
  type = "source",
  showPlus = true,
  className,
  handleId,
}: CustomHandleProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute top-1/2 flex w-auto items-center",
        className
      )}
    >
      <Handle
        position={position}
        type={type}
        id={handleId}
        className={cn(
          "bg-bg-canvas! border-text-primary! dark:border-border-strong!",
          "size-2.5! rounded-full! border-2!",
          "pointer-events-auto",
          // Invisible larger hit-target — prevents flicker on the small dot.
          "before:absolute before:content-[''] before:rounded-full before:-inset-2",
          "transition-[border-color,box-shadow] duration-[140ms]",
          "hover:border-accent-primary!",
          "hover:shadow-[0_0_0_4px_color-mix(in_oklab,var(--accent-primary)_18%,transparent)]"
        )}
      >
        {showPlus && (
          <>
            {/* Connector stub */}
            <div className="bg-border-strong h-px w-8" />
            {/* Plus button */}
            <button
              type="button"
              aria-label="Add next step"
              className={cn(
                "absolute top-1/2 left-8 -translate-y-1/2",
                "flex size-5 items-center justify-center",
                "border-text-primary dark:border-border-default bg-bg-elevated",
                "text-text-primary border-[1.5px]",
                "shadow-[2px_2px_0_0_var(--hard-shadow-color)]",
                "transition-[transform,box-shadow,background-color] duration-[140ms]",
                "hover:-translate-x-px hover:-translate-y-px",
                "hover:shadow-[3px_3px_0_0_var(--hard-shadow-color)]",
                "hover:bg-accent-primary hover:text-accent-on",
                "pointer-events-auto cursor-pointer"
              )}
            >
              <Plus size={12} strokeWidth={2.5} />
            </button>
          </>
        )}
      </Handle>
    </div>
  );
}
