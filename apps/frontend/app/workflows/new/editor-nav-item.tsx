"use client";

import { cn } from "@/lib/utils";

interface EditorNavItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  badge?: string;
  onClick?: () => void;
}

export default function EditorNavItem({
  icon: Icon,
  label,
  active,
  badge,
  onClick,
}: EditorNavItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "duration-120ms flex w-full items-center gap-2.5 px-2.5 py-[7px] text-left text-[13px] font-medium transition-colors",
        active
          ? "border-accent-primary bg-bg-canvas text-text-primary border-l-2 pl-[9px]"
          : "text-text-secondary hover:bg-bg-canvas/60 hover:text-text-primary"
      )}
    >
      <Icon
        className={cn(
          "size-4 shrink-0",
          active ? "text-text-brand" : "text-text-muted"
        )}
      />
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="text-info inline-flex items-center border border-[rgba(94,177,239,0.3)] bg-[rgba(94,177,239,0.14)] px-1.5 py-px font-mono text-[9px] font-bold tracking-wider uppercase">
          {badge}
        </span>
      )}
    </button>
  );
}
