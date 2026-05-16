"use client";

import { cn } from "@/lib/utils";

interface EditorMenuItemProps {
  icon: React.ElementType;
  label: string;
  kbd?: string[];
  destructive?: boolean;
  onClick?: () => void;
}

export default function EditorMenuItem({
  icon: Icon,
  label,
  kbd,
  destructive,
  onClick,
}: EditorMenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-2.5 py-2 text-left text-[13px] font-medium transition-colors duration-120",
        destructive
          ? "text-error hover:bg-[rgba(229,72,77,0.06)]"
          : "text-text-primary hover:bg-bg-inset"
      )}
    >
      <Icon
        className={cn(
          "size-4 shrink-0",
          destructive ? "text-error" : "text-text-muted"
        )}
      />
      <span className="flex-1">{label}</span>
      {kbd && (
        <span className="ml-auto inline-flex gap-1">
          {kbd.map((k) => (
            <kbd
              key={k}
              className="border-border-default bg-bg-inset text-text-secondary inline-grid h-[18px] min-w-[18px] place-items-center border px-1 font-mono text-[10px]"
            >
              {k}
            </kbd>
          ))}
        </span>
      )}
    </button>
  );
}
