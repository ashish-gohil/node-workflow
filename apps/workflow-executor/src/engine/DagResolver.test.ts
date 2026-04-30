// DagResolver.test.ts

import { describe, it, expect } from "vitest";
import { DAGResolver } from "./DagResolver";
import { ActionNodeTypes, IEdge, INode, TriggerNodeTypes } from "@repo/db";

// Top-level describe = the module being tested
describe("DAGResolver", () => {
    // Second-level describe = the method being tested
    describe("resolve()", () => {
        // Third-level describe = the category of scenario
        describe("happy paths", () => {
            it("single node with no edges returns one tier", () => {
                const nodes: INode[] = [
                    {
                        id: "n1",
                        type: "trigger",
                        nodeType: TriggerNodeTypes.ManualTrigger,
                        position: { x: 100, y: 200 },
                        config: {},
                    },
                ];
                const edges: IEdge[] = [];
                const dagClass = new DAGResolver(nodes, edges);
                const result = dagClass.resolve();
                expect(result).toEqual([["n1"]]);
            });

            it("linear chain returns one node per tier", () => {
                const nodes: INode[] = [
                    {
                        id: "n1",
                        type: "trigger",
                        nodeType: TriggerNodeTypes.ManualTrigger,
                        position: { x: 100, y: 200 },
                        config: {},
                    },
                    {
                        id: "n2",
                        type: "action",
                        nodeType: ActionNodeTypes.HttpRequest,
                        position: { x: 100, y: 200 },
                        config: {},
                    },
                    {
                        id: "n3",
                        type: "action",
                        nodeType: ActionNodeTypes.Code,
                        position: { x: 100, y: 200 },
                        config: {},
                    }
                ];
                const edges: IEdge[] = [{ id: "n1-n2", source: "n1", target: "n2" }, { id: "n2-n3", source: "n2", target: "n3" }];
                const dagClass = new DAGResolver(nodes, edges);
                const result = dagClass.resolve();
                expect(result).toEqual([["n1"], ["n2"], ["n3"]]);
            });
        });

        // describe("error cases", () => {
        //     it("throws EmptyGraphError when nodes array is empty", () => {
        //         // test here
        //     })
        // })

        describe("parallel execution", () => {
            it("nodes with no dependency on each other appear in the same tier", () => {
                const nodes: INode[] = [
                    {
                        id: "n1",
                        type: "trigger",
                        nodeType: TriggerNodeTypes.ManualTrigger,
                        position: { x: 100, y: 200 },
                        config: {},
                    },
                    {
                        id: "n2",
                        type: "action",
                        nodeType: ActionNodeTypes.HttpRequest,
                        position: { x: 100, y: 200 },
                        config: {},
                    },
                    {
                        id: "n3",
                        type: "action",
                        nodeType: ActionNodeTypes.Code,
                        position: { x: 100, y: 200 },
                        config: {},
                    }, {
                        id: "n4",
                        type: "action",
                        nodeType: ActionNodeTypes.Merge,
                        position: { x: 100, y: 200 },
                        config: {},
                    }
                ];
                const edges: IEdge[] = [{ id: "n1-n2", source: "n1", target: "n2" }, { id: "n1-n3", source: "n1", target: "n3" }, { id: "n2-n4", source: "n2", target: "n4" }, { id: "n3-n4", source: "n3", target: "n4" }];
                const dagClass = new DAGResolver(nodes, edges);
                const result = dagClass.resolve();
                expect(result[0]).toEqual(["n1"])
                expect(result[1]).toContain("n3")
                expect(result[1]).toHaveLength(2)
                expect(result[1]).toContain("n2")
                expect(result[2]).toEqual(["n4"])
            });
        });
    });
});
