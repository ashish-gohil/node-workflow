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
        "absolute w-auto  top-1/2  flex items-center pointer-events-none",
        className
      )}
    >
      <Handle
        position={position}
        type={type}
        id={handleId}
        className="bg-bg-muted border-border-default pointer-events-auto flex w-8 items-center justify-start rounded-full border"
      >
        {showPlus && (
          <>
            <div className=" h-px w-8 bg-neutral-400" />
            <button className="border-border-strong bg-accent-muted hover:bg-accent-muted pointer-events-auto absolute left-8 top-1 flex size-4 items-center justify-center rounded-full border transition hover:cursor-pointer">
              <Plus size={14} className="text-text-primary" />
            </button>
          </>
        )}
      </Handle>
    </div>
  );
}
