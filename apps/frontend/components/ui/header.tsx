"use client";

import AppLogo from "./app-logo";
import ThemeToggle from "./theme-toggle";
import { Button } from "./button";
import { usePathname, useRouter } from "next/navigation";
import useFlow from "@/app/store/flow-store";
import { api } from "@/lib/api";

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
    <header className="w-full h-20 bg-surface border-b border-default px-6 py-4 flex justify-between items-center">
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
    </header>
  );
}
