"use client";

import { usePathname, useRouter } from "next/navigation";
import { Bell, Search, Zap } from "lucide-react";
import { motion } from "motion/react";

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
    <motion.header
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="bg-bg-canvas border-text-primary dark:border-border-stamp flex h-[72px] items-center gap-4 border-b-[1.5px] px-8 py-3"
    >
      {/* Logo + breadcrumbs */}
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <button
          onClick={() => router.push("/")}
          className="shrink-0 cursor-pointer"
        >
          <AppLogo />
        </button>

        {isEditor && (
          <nav
            aria-label="Breadcrumb"
            className="text-body-sm ml-2 flex items-center gap-2"
          >
            <button
              onClick={() => router.push("/")}
              className="text-text-muted hover:text-text-primary transition-colors duration-[120ms]"
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

      {/* Center search */}
      <button
        className="btn-stamp hover:btn-stamp-hover active:btn-stamp-active text-body-sm text-text-muted hidden h-10 min-w-52 justify-start gap-2 px-3 font-normal md:inline-flex"
        aria-label="Search workflows (⌘K)"
      >
        <Search className="size-4 shrink-0" aria-hidden="true" />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="bg-bg-inset border-border-default text-mono-sm text-text-secondary ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-xs border px-1 font-mono">
          ⌘K
        </kbd>
      </button>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        <ThemeToggle />

        <button
          aria-label="Notifications"
          className="btn-stamp hover:btn-stamp-hover active:btn-stamp-active hover:bg-accent-primary hover:text-accent-on size-10"
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
    </motion.header>
  );
}
