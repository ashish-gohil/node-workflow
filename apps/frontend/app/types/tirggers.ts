import { ReactNode } from 'react'

export enum TriggerNodeTypes {
  ManualTrigger = 'manualTrigger',
  SchedulerTrigger = 'scheduler',
  Webhook = 'webhook',
}

export interface Trigger {
  type: TriggerNodeTypes
  title?: string
  label: string
  description: string
  icon?: ReactNode
  requireDataFields: boolean
}
