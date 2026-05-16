"use client";

import { useRouter } from "next/navigation";
import {
  Calendar,
  ChevronLeft,
  Clock,
  CreditCard,
  Home,
  MessageSquare,
  User,
} from "lucide-react";

import { cn } from "@/lib/utils";

import EditorNavItem from "./editor-nav-item";

interface EditorSidebarProps {
  open: boolean;
  onToggle: () => void;
  onShowLogs: () => void;
}

export default function EditorSidebar({
  open,
  onToggle,
  onShowLogs,
}: EditorSidebarProps) {
  const router = useRouter();

  return (
    <>
      <aside
        aria-label="Workspace navigation"
        className={cn(
          "border-border-stamp bg-bg-elevated flex shrink-0 flex-col overflow-hidden border-r-[1.5px] transition-[width,padding] duration-200",
          open ? "w-60 gap-1 px-3 py-4" : "w-0 border-r-0"
        )}
      >
        <p className="text-text-muted px-2.5 pt-1 pb-1 font-mono text-[10px] font-semibold tracking-[0.08em] uppercase">
          Workspace
        </p>
        <EditorNavItem
          icon={Home}
          label="Overview"
          onClick={() => router.push("/")}
        />
        <EditorNavItem icon={User} label="Personal" active />
        <EditorNavItem icon={MessageSquare} label="Chat" badge="Preview" />

        <p className="text-text-muted mt-3 px-2.5 pt-1 pb-1 font-mono text-[10px] font-semibold tracking-[0.08em] uppercase">
          Workflow
        </p>
        <EditorNavItem icon={CreditCard} label="Credentials" />
        <EditorNavItem icon={Calendar} label="Schedules" />
        <EditorNavItem icon={Clock} label="Logs" onClick={onShowLogs} />

        <div className="border-border-subtle mt-auto flex items-center gap-2 border-t px-1 pt-3">
          <span className="text-text-muted font-mono text-[11px]">v2.14.0</span>
          <span className="text-text-muted ml-auto inline-flex items-center gap-1.5 font-mono text-[11px]">
            <span className="bg-success size-1.5 rounded-full shadow-[0_0_0_3px_rgba(82,183,136,0.15)]" />
            synced
          </span>
        </div>
      </aside>

      {/* Sidebar toggle — positioned over the body container */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
        aria-expanded={open}
        className={cn(
          "border-border-stamp bg-bg-elevated text-text-secondary hover:text-text-primary absolute top-3.5 z-40 inline-grid size-7 place-items-center border-[1.5px] shadow-[2px_2px_0_0_var(--hard-shadow-color)] transition-all duration-200 hover:-translate-y-px active:translate-x-px active:translate-y-px active:shadow-none",
          open ? "left-[226px]" : "left-3"
        )}
      >
        <ChevronLeft
          className={cn(
            "size-3.5 transition-transform duration-200",
            !open && "rotate-180"
          )}
        />
      </button>
    </>
  );
}
