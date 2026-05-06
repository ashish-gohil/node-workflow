import {
    ActionNodeTypes,
    ExecutionModel,
    IExecution,
    IWorkflow,
    TriggerNodeTypes,
    WorkflowModel,
} from "@repo/db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DAGResolver } from "./DagResolver";
import { NodeRunner } from "./NodeRunner";
import { ExecutionEngine } from "./ExecutionEngine";

vi.mock("@repo/db", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@repo/db")>()
    return {
        ...actual,
        ExecutionModel: { findOneAndUpdate: vi.fn() },
        WorkflowModel: { findOne: vi.fn(), findOneAndUpdate: vi.fn() },
    }
})

vi.mock("./DagResolver");
vi.mock("./ContextManager");
vi.mock("./NodeRunner");

const mockWorkflow: IWorkflow = {
    workflowId: "wf_1",
    triggerType: "MANUAL",
    cronExpression: null,
    userId: "user-1",
    active: true,
    name: "test workflow",
    version: 1,
    lastRunAt: null,
    nextRunAt: null,
    status: "QUEUED",
    lockedAt: null,
    lockId: null,
    webhookId: null,
    graph: {
        nodes: [
            {
                id: "n1",
                name: "Trigger",
                nodeType: TriggerNodeTypes.ManualTrigger,
                type: "trigger",
                config: {},
                position: { x: 0, y: 0 },
                error: null,
            },
            {
                id: "n2",
                name: "HTTP Request",
                nodeType: ActionNodeTypes.HttpRequest,
                type: "action",
                config: {},
                position: { x: 0, y: 0 },
                error: null,
            },
        ],
        edges: [{ id: "e1", source: "n1", target: "n2" }],
    },
};

const mockExecution: IExecution = {
    workflowId: "wf_1",
    workflowSnapshot: {
        nodes: [
            {
                id: "n1",
                name: "Trigger",
                nodeType: TriggerNodeTypes.ManualTrigger,
                type: "trigger",
                config: {},
                position: { x: 0, y: 0 },
                error: null,
            },
            {
                id: "n2",
                name: "HTTP Request",
                nodeType: ActionNodeTypes.HttpRequest,
                type: "action",
                config: {},
                position: { x: 0, y: 0 },
                error: null,
            },
        ],
        edges: [{ id: "e1", source: "n1", target: "n2" }],
    },
    executionId: "exec_1",
    status: "PENDING",
    idempotencyKey: "",
    triggeredBy: "MANUAL",
    triggeredByUserId: "user-1",
    startedAt: null,
    finishedAt: null,
    inputData: { body: {}, headers: {}, query: {} },
    nodeResults: {},
    error: null,
    stopAtNodeId: null,
};



describe("Exeecution engine", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // default happy path returns
        vi.mocked(WorkflowModel.findOne).mockResolvedValue(mockWorkflow as any);
        vi.mocked(ExecutionModel.findOneAndUpdate).mockResolvedValue(mockExecution);
        vi.mocked(WorkflowModel.findOneAndUpdate).mockResolvedValue(mockWorkflow);

        // DAGResolver mock returns two tiers
        vi.mocked(DAGResolver.prototype.resolve).mockReturnValue([["n1"], ["n2"]]);

        // NodeRunner mock run succeeds
        vi.mocked(NodeRunner.prototype.run).mockResolvedValue({ result: "ok" });
    });

    describe("happy paths", () => {


        it("marks execution RUNNING then SUCCESS", async () => {
            // arrange — defaults from beforeEach are enough
            const engine = new ExecutionEngine("exec_1", "wf_1", {})

            // act
            await engine.executeWorkflow()

            // assert
            expect(ExecutionModel.findOneAndUpdate).toHaveBeenCalledWith(
                { executionId: "exec_1", status: "PENDING" },
                expect.objectContaining({ $set: { status: "RUNNING" } })
            )
            expect(ExecutionModel.findOneAndUpdate).toHaveBeenCalledWith(
                { executionId: "exec_1" },
                expect.objectContaining({ $set: { status: "SUCCESS" } })
            )
        })

        it("Workflow status set to PROCESSING then READY", async () => {
            // arrange — defaults from beforeEach are enough
            const engine = new ExecutionEngine("exec_1", "wf_1", {})

            // act
            await engine.executeWorkflow()

            // assert
            expect(WorkflowModel.findOneAndUpdate).toHaveBeenCalledWith(
                { workflowId: "wf_1" },
                expect.objectContaining({ $set: { status: "PROCESSING" } })
            )
            expect(WorkflowModel.findOneAndUpdate).toHaveBeenCalledWith(
                { workflowId: "wf_1" },
                expect.objectContaining({
                    $set: {
                        lastRunAt: expect.any(Date),
                        status: "READY",
                    }
                })
            )
        })

        it("nodeTiers iterated — nodeRunner.run called once per node", async () => {
            // arrange — defaults from beforeEach are enough
            const engine = new ExecutionEngine("exec_1", "wf_1", {})

            // act
            await engine.executeWorkflow()

            // assert
            expect(NodeRunner.prototype.run).toHaveBeenCalledTimes(2)
            expect(NodeRunner.prototype.run).toHaveBeenLastCalledWith({
                id: "n2",
                name: "HTTP Request",
                nodeType: ActionNodeTypes.HttpRequest,
                type: "action",
                config: {},
                position: { x: 0, y: 0 },
                error: null,
            })

        })

        it("nextRunAt computed for CRON workflow", async () => {
            // arrange — defaults from beforeEach are enough
            vi.mocked(WorkflowModel.findOne).mockResolvedValue({ ...mockWorkflow, triggerType: "CRON", cronExpression: "* * * *" } as any);
            const engine = new ExecutionEngine("exec_1", "wf_1", {})

            // act
            await engine.executeWorkflow()

            // assert
            expect(WorkflowModel.findOneAndUpdate).toHaveBeenCalledWith({ workflowId: "wf_1" },
                expect.objectContaining({
                    $set: {
                        lastRunAt: expect.any(Date),
                        status: "READY",
                        nextRunAt: expect.any(Date)
                    }
                }))
        })

        it("nextRunAt not set for MANUAL/WEBHOOK workflow", async () => {
            // arrange — defaults from beforeEach are enough
            const engine = new ExecutionEngine("exec_1", "wf_1", {})

            // act
            await engine.executeWorkflow()

            // assert
            expect(WorkflowModel.findOneAndUpdate).not.toHaveBeenCalledWith({ workflowId: "wf_1" },
                expect.objectContaining({
                    $set: {
                        lastRunAt: expect.any(Date),
                        status: "READY",
                        nextRunAt: expect.any(Date)
                    }
                }))
        })

    })

    describe("Atomic claim tests", () => {
        it("returns early when execution already claimed", async () => {
            // override default — make findOneAndUpdate return null
            vi.mocked(ExecutionModel.findOneAndUpdate).mockResolvedValue(null)

            const engine = new ExecutionEngine("exec_1", "wf_1", {})
            await engine.executeWorkflow()

            // assert the engine bailed out — NodeRunner.run was never called
            expect(NodeRunner.prototype.run).not.toHaveBeenCalled()
        })
    })

    describe("Failure tests", () => {
        it("nodeRunner.run throws → execution marked FAILED", async () => {
            // override default — make run fail
            vi.mocked(NodeRunner.prototype.run).mockRejectedValue({ status: "rejected" });

            const engine = new ExecutionEngine("exec_1", "wf_1", {})
            await engine.executeWorkflow()

            // assert the engine bailed out — NodeRunner.run was never called
            expect(ExecutionModel.findOneAndUpdate).toHaveBeenCalledWith({ executionId: "exec_1" }, expect.objectContaining({
                $set: {
                    status: "FAILED", error: {
                        message: "something went wrong"
                    }
                }
            }))
        })

        it("nodeRunner.run throws → workflow marked FAILED", async () => {
            // override default — make run fail
            vi.mocked(NodeRunner.prototype.run).mockRejectedValue({ status: "rejected" });

            const engine = new ExecutionEngine("exec_1", "wf_1", {})
            await engine.executeWorkflow()

            // assert the engine bailed out — NodeRunner.run was never called
            expect(WorkflowModel.findOneAndUpdate).toHaveBeenCalledWith({ workflowId: "wf_1" }, expect.objectContaining({
                $set: {
                    status: "FAILED"
                }
            }))
        })

        it("WorkflowModel.findOne returns null → throws, caught, marks execution FAILED", async () => {
            // override default — await findOne resolves to no workflow
            vi.mocked(WorkflowModel.findOne).mockResolvedValueOnce(null);

            const engine = new ExecutionEngine("exec_1", "wf_1", {})
            await engine.executeWorkflow()

            // assert
            expect(ExecutionModel.findOneAndUpdate).toHaveBeenCalledWith({ executionId: "exec_1" }, expect.objectContaining({
                $set: {
                    status: "FAILED", error: {
                        message: "Workflow does not exist with id wf_1"
                    }
                }
            }))
            expect(WorkflowModel.findOneAndUpdate).toHaveBeenCalledWith({ workflowId: "wf_1" }, expect.objectContaining({
                $set: {
                    status: "FAILED"
                }
            }))
        })
    })
})

