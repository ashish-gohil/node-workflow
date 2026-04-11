"use client";

import { ReactNode } from "react";

import { Button } from "../ui/button";
import Collaborators from "../ui/collobarator";

export default function MacWindow({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative border 
      border-border-default
      bg-surface/70
      backdrop-blur-md 
      p-1 shadow-2xl overflow-hidden rounded-xl"
    >
      {/* 🔝 Toolbar */}
      <div
        className="flex items-center justify-between px-4 py-3 
        border-b border-border-default
        bg-surface-elevated
        rounded-t-[var(--radius)]"
      >
        {/* Left Section */}
        <div className="flex items-center gap-3">
          {/* Mac Buttons */}
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-emerald-400" />
          </div>

          {/* Divider */}
          <div className="h-4 w-[1px] bg-[var(--color-border-muted)] mx-2" />

          {/* Title */}
          <span className="font-label text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">
            Project: Production_v4
          </span>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-6">
          <Collaborators />

          <Button
            variant="outline"
            className="bg-muted hover:bg-surface"
            allowCorners
          >
            Deploy
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div
        className="relative h-[500px] 
        bg-[color-mix(in oklab, var(--color-bg) 60%, transparent)] 
        overflow-hidden"
      >
        {children}
      </div>
    </div>
  );
}
