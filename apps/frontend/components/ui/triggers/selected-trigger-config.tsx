'use clent'
import { Trigger, TriggerNodeTypes } from '@/app/types/tirggers'
import SchedulerModal from './sceduler-modal'
import WebhookModal from './webhook-modal'

export default function SelectedTriggerConfig({
  selectedNode,
}: {
  selectedNode: Trigger
}) {
  switch (selectedNode.type) {
    case TriggerNodeTypes.ManualTrigger: // no config needed
      return
    case TriggerNodeTypes.SchedulerTrigger:
      return SchedulerModal()
    case TriggerNodeTypes.Webhook:
      return WebhookModal()
    default:
      return
  }
}
