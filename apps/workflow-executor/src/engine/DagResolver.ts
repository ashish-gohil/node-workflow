import { IEdge, INode } from "@repo/db";

export class DAGResolver {
    private nodes: INode[];
    private edges: IEdge[];

    constructor(nodes: INode[], edges: IEdge[]) {
        this.nodes = nodes;
        this.edges = edges;
    }

    private buildAdjList() {
        const adjList: Record<string, string[]> = {}
        this.nodes.forEach(node => { adjList[node.id] = [] })
        for (let edge of this.edges) {
            if (adjList[edge.source]) {
                adjList[edge.source].push(edge.target)
            } else {
                adjList[edge.source] = [edge.target]
            }
        }
        return adjList
    }

    resolve() {
        // return the node[][] in topological order

        const inDegree: Record<string, number> = {}
        const topoSorted: string[][] = []
        const adjList = this.buildAdjList()

        // initializing in degree object
        this.nodes.forEach(node => inDegree[node.id] = 0);

        // building inDegree
        this.edges.forEach(edge => {
            if (edge.source !== edge.target) { inDegree[edge.target] += 1 }
        });

        let queueOfNodesWithZeroInDegree = Object.keys(inDegree).filter(node => inDegree[node] === 0)

        while (queueOfNodesWithZeroInDegree.length > 0) {

            topoSorted.push(queueOfNodesWithZeroInDegree);
            const nextQueue: string[] = []

            queueOfNodesWithZeroInDegree.forEach(node => {
                delete inDegree[node]
                const adjNodes = adjList[node];
                adjNodes.forEach(adjNodeId => {
                    inDegree[adjNodeId] -= 1
                    if (inDegree[adjNodeId] === 0) {
                        nextQueue.push(adjNodeId)
                    }
                })
            })
            queueOfNodesWithZeroInDegree = [...nextQueue]

        }

        if (topoSorted.flat().length !== this.nodes.length) {
            // error as cyclic graph found or no trigger node found
        }

        return topoSorted

    }


}