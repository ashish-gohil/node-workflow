// Central export for all workflow platform models and types.
// Import from here instead of individual files to keep imports clean.
//
// Usage:
//   import { ExecutionModel, type IExecution } from "@your-pkg/db";

export {
    UserModel,
    AuthProviders,
    type IUser,
    type IPublicUser,
    type AuthProvider,
} from "./user.model";

export {
    ExecutionModel,
    type IExecution,
    type INodeResult,
    type INodeError,
    type IInputData,
    type IExecutionError,
    type ExecutionStatus,
    type ExecutionTrigger,
    type NodeExecutionStatus,
} from "./execution.model";

export {
    WebhookRegistrationModel,
    type IWebhookRegistration,
    type WebhookHttpMethod,
} from "./webhook-registration.model";

export {
    CredentialModel,
    CredentialType,
    type ICredential,
    type ICredentialMeta,
} from "./credential.model";

export {
    PrevRunDataModel,
    type IPrevRunData,
} from "./prev-run-data.model";

// Re-export existing workflow model so everything comes from one place
export {
    WorkflowModel,
    ActionNodeTypes,
    TriggerNodeTypes,
    type IWorkflow,
    type INode,
    type IEdge,
    type FlowNodeType,
    type WorkflowStatus,
} from "./workflow.model";