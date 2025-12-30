'use client'

import { FlowContext } from '@/contexts/workflow-context'
import { useContext } from 'react'

export function useWorkflow() {
  const context = useContext(FlowContext)

  if (!context) {
    throw new Error('useFlow must be used within a FlowProvider')
  }

  return context
}
