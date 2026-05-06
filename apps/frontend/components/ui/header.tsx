"use client";

import { usePathname, useRouter } from "next/navigation";
import { Bell, Search, Zap } from "lucide-react";

import useFlow from "@/app/store/flow-store";
import { api } from "@/lib/api";

import AppLogo from "./app-logo";
import { Button } from "./button";
import ThemeToggle from "./theme-toggle";

export default function Header() {
  const { nodes, edges } = useFlow();
  const router = useRouter();
  const pathName = usePathname();

  const isEditor =
    pathName.includes("workflows/new") || pathName.match(/\/workflows\/[^/]+$/);

  const handleSaveWorkflow = () => {
    api.post("/workflows", {
      workflowId: "test",
      name: "Test workflow",
      graph: {
        nodes: nodes.map((node) => ({
          id: node.id,
          type: node.type,
          position: node.position,
          config: node.data.config,
        })),
        edges,
      },
    });
  };

  return (
    <header className="bg-bg-canvas border-border-subtle flex h-14 items-center gap-4 border-b px-6">
      {/* Logo + breadcrumbs */}
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <AppLogo />

        {isEditor && (
          <nav
            aria-label="Breadcrumb"
            className="text-body-sm ml-2 flex items-center gap-2"
          >
            <button
              onClick={() => router.push("/")}
              className="text-text-secondary hover:text-text-primary transition-colors duration-[120ms]"
            >
              Workflows
            </button>
            <span className="text-text-muted">/</span>
            <span className="text-text-primary font-medium" aria-current="page">
              {pathName.includes("new") ? "New workflow" : "Edit workflow"}
            </span>
          </nav>
        )}
      </div>

      {/* Center — search trigger */}
      <button
        className="border-border-default bg-bg-surface text-text-muted text-body-sm hover:border-border-strong hidden h-8 min-w-56 items-center gap-2 rounded-sm border px-3 transition-colors duration-[120ms] md:inline-flex"
        aria-label="Search workflows (⌘K)"
      >
        <Search className="size-4 shrink-0" aria-hidden="true" />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="bg-bg-inset border-border-default text-mono-sm text-text-secondary ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-xs border px-1 font-mono">
          ⌘K
        </kbd>
      </button>

      {/* Right — actions */}
      <div className="flex items-center gap-2">
        <ThemeToggle />

        <button
          aria-label="Notifications"
          className="text-text-secondary hover:text-text-primary inline-flex size-9 items-center justify-center rounded-sm transition-colors duration-[120ms] hover:bg-white/[0.04]"
        >
          <Bell className="size-4" />
        </button>

        {isEditor ? (
          <Button
            size="default"
            variant="primary"
            disabled={nodes.length < 2}
            onClick={handleSaveWorkflow}
          >
            <Zap className="size-4" aria-hidden="true" />
            Save workflow
          </Button>
        ) : (
          <Button
            size="default"
            variant="primary"
            onClick={() => router.push("/workflows/new")}
          >
            <Zap className="size-4" aria-hidden="true" />
            New workflow
          </Button>
        )}
      </div>
    </header>
  );
}
