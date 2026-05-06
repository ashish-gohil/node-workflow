"use client";

import { ReactNode } from "react";

import { Button } from "../ui/button";
import Collaborators from "../ui/collobarator";

export default function MacWindow({ children }: { children: ReactNode }) {
  return (
    <div className="border-border-default bg-surface/70 relative overflow-hidden rounded-none border p-1 shadow-2xl backdrop-blur-md">
      <div className="pointer-events-none absolute inset-0">
        {/* TOP */}
        <div className="absolute top-0 left-0 h-px w-full bg-[linear-gradient(to_right,transparent,var(--color-border-strong),transparent)]" />

        {/* BOTTOM */}
        <div className="absolute bottom-0 left-0 h-px w-full bg-[linear-gradient(to_right,transparent,var(--color-border-strong),transparent)]" />

        {/* LEFT */}
        <div className="absolute top-0 left-0 h-full w-px bg-[linear-gradient(to_bottom,transparent,var(--color-border-strong),transparent)]" />

        {/* RIGHT */}
        <div className="absolute top-0 right-0 h-full w-px bg-[linear-gradient(to_bottom,transparent,var(--color-border-strong),transparent)]" />
      </div>
      {/* 🔝 Toolbar */}
      <div className="border-border-default bg-surface-elevated flex items-center justify-between rounded-t-[--radius] border-b px-4 py-3">
        {/* Left Section */}
        <div className="flex items-center gap-3">
          {/* Mac Buttons */}
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-400" />
            <div className="h-3 w-3 rounded-full bg-amber-400" />
            <div className="h-3 w-3 rounded-full bg-emerald-400" />
          </div>

          {/* Divider */}
          <div className="bg--border-muted mx-2 h-4 w-[px]" />

          {/* Title */}
          <span className="font-label text-text-muted text-[10px] tracking-widest uppercase">
            Project: Production_v4
          </span>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-6">
          <Collaborators />

          <Button variant="ghost" className="bg-muted hover:bg-surface">
            Deploy
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-[color-mix(in oklab, var(--color-bg) 60%, transparent)] relative h-[500px] overflow-hidden">
        {children}
      </div>
    </div>
  );
}
