'use client'
import React, { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../sheet'
import { Button } from '../button'

import { Trigger, TriggerNodeTypes } from '@/app/types/tirggers'
import SelectedTriggerConfig from './selected-trigger-config'
import { TriggerNode } from '../nodes/trigger-node'
import { ActionNode } from '../nodes/action-node'
import { ManualTriggerNode } from '../nodes/manual-trigger-node'
import { useWorkflow } from '@/hooks/use-workflow'
import { Node } from '@xyflow/react'

const triggerNodes: Trigger[] = [
  {
    type: TriggerNodeTypes.ManualTrigger,
    title: 'Manual trigger',
    label: 'Trigger manually',
    description: 'Runs a workflow when execute button is cliecked.',
    requireDataFields: false,
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="size-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672ZM12 2.25V4.5m5.834.166-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243-1.59-1.59"
        />
      </svg>
    ),
  },
  {
    type: TriggerNodeTypes.SchedulerTrigger,
    title: 'Schedule trigger',
    label: 'On a schedule',
    description: 'Runs a workflow every sec, min, hour or day as specified.',
    requireDataFields: true,
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="size-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        />
      </svg>
    ),
  },
  {
    type: TriggerNodeTypes.Webhook,
    title: 'Webhook',
    label: 'On a webhook calls',
    description: 'Runs a workflow when receiving HTTP response.',
    requireDataFields: true,
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="size-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418"
        />
      </svg>
    ),
  },
]

export const nodeTypes = {
  [TriggerNodeTypes.ManualTrigger]: ManualTriggerNode,
  [TriggerNodeTypes.SchedulerTrigger]: ActionNode,
  [TriggerNodeTypes.Webhook]: TriggerNode,
}

export default function FirstTriggerSheet() {
  const { nodes, setNodes } = useWorkflow()
  const [triggerSheetOpen, setTriggerSheetOpen] = useState<boolean>(false)

  return (
    <Sheet open={triggerSheetOpen} onOpenChange={setTriggerSheetOpen}>
      <SheetTrigger asChild>
        <Button
          allowCorners={true}
          cornerSize="md"
          className="relative hover:cursor-pointer rounded-none  z-30 bg-bg hover:bg-bg p-10  border border-border-strong border-dashed text-text"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-10"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Select trigger node from the list</SheetTitle>
          <SheetDescription>
            Trigger is a step that starts your workflow
          </SheetDescription>
          <div className="flex flex-col gap-4 cursor-pointer pt-6 ">
            {triggerNodes.map(node => (
              <div
                onClick={() => {
                  setTriggerSheetOpen(false)
                  // check if requiredFields are false then set node in canvas
                  // alwase set node in canvas and see if requiredfields is et to true then open modal
                  const newNode: Node = {
                    data: {
                      label: 'new node',
                      description: 'this is description',
                    },
                    position: { x: 20, y: 40 },
                    id: Math.random().toString(),
                    type: node.type,
                  }
                  setNodes([...nodes, newNode])
                  if (node.requireDataFields)
                    SelectedTriggerConfig({ selectedNode: node })
                }}
                key={node.type}
                className="w-full flex gap-3 justify-start items-start"
              >
                <div className="w-16 flex justify-center items-start p-2">
                  {node?.icon}
                </div>
                <div className="w-full flex flex-col gap-0">
                  <div className="text-text-primary">{node.label}</div>
                  <div className="text-text-muted">{node.description}</div>
                </div>
              </div>
            ))}
          </div>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  )
}
