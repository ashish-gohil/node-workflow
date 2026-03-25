"use client";

import AppLogo from "./app-logo";
import ThemeToggle from "./theme-toggle";
import { Button } from "./button";
import { usePathname, useRouter } from "next/navigation";
import useFlow from "@/app/store/flow-store";
import { api } from "@/lib/api";
import { motion } from "motion/react";

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
      className=" h-20 fixed top-0 w-full z-50 bg-surface/60 shadow-md  px-6 py-4 flex justify-between items-center"
    >
      <AppLogo />

      <div className="flex flex-row gap-6 justify-between">
        <ThemeToggle />
        {pathName.includes("workflow/new") ? (
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
              router.push("/workflow/new");
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
