import { Handle, Position } from "@xyflow/react";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";

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
        className="bg-bg-inset border-border-default pointer-events-auto flex w-8 items-center justify-start rounded-full border-2"
      >
        {showPlus && (
          <>
            <div className="bg-border-strong h-px w-8" />
            <button className="border-border-strong bg-bg-elevated hover:bg-accent-subtle pointer-events-auto absolute top-1 left-8 flex size-4 items-center justify-center rounded-full border-2 transition-colors duration-[120ms] hover:cursor-pointer">
              <Plus size={14} className="text-text-primary" />
            </button>
          </>
        )}
      </Handle>
    </div>
  );
}
