"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";

import { api } from "@/lib/api";

import AppLogo from "./app-logo";
import { Button } from "./button";
import ThemeToggle from "./theme-toggle";
import useFlow from "@/app/store/flow-store";

export default function Header() {
  const { nodes, edges } = useFlow();

  const router = useRouter();

  const pathName = usePathname();

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
    <motion.nav
      style={{
        backdropFilter: "blur(12px)",
      }}
      className=" bg-surface/60 fixed top-0 z-50 flex h-20 w-full  items-center justify-between px-6 py-4 shadow-md"
    >
      <AppLogo />

      <div className="flex flex-row justify-between gap-6">
        <ThemeToggle />
        {pathName.includes("workflows/new") ? (
          <Button
            allowCorners={true}
            cornerSize="sm"
            disabled={nodes.length < 2}
            onClick={handleSaveWorkflow}
          >
            Save workflow
          </Button>
        ) : (
          <Button
            onClick={() => {
              router.push("/workflows/new");
            }}
            className="relative rounded-none"
            allowCorners={true}
            cornerSize="sm"
          >
            Create workflow
          </Button>
        )}
      </div>
    </motion.nav>
  );
}
