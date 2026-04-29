import { IEdge, INode } from "@repo/db";

export class DAGResolver {
    private nodes: INode[];
    private edges: IEdge[];
    private adjList: Record<string, string[]>
    private inDegree: Record<string, number>

    constructor(nodes: INode[], edges: IEdge[]) {
        this.nodes = nodes;
        this.edges = edges;
        this.adjList = {}
        this.inDegree = {}
    }

    private buildAdjList() {
        for (let edge of this.edges) {
            if (this.adjList[edge.source]) {
                this.adjList[edge.source].push(edge.target)
            } else {
                this.adjList[edge.source] = [edge.target]
            }
        }
    }

    private buildInDegree() {
        for (let node of this.nodes) {
            this.inDegree[node.id] = this.edges.filter(edge => edge.target === node.id).length
        }

    }

    resolve() {
        // return the node[][] in topological order

        const inDegree: Record<string, number> = {}
        const topoSorted = []
        this.buildAdjList()

        // initializing in degree object
        this.nodes.forEach(node => inDegree[node.id] = 0);

        // building inDegree
        this.edges.forEach(edge => {
            if (edge.source !== edge.target) { inDegree[edge.target] += 1 }
        });

        if (!Object.values(inDegree).includes(0)) {
            // error for cyclic graph as there are no nodes with zero inDegree
        }


        while (Object.values(inDegree).includes(0)) {
            const zeroInDegreeArr = Object.keys(inDegree).filter(node => inDegree[node] === 0)
            topoSorted.push(zeroInDegreeArr);


            // zeroInDegreeArr.forEach(node => { delete inDegree[node] })
            // this.edges.forEach(edge => {
            //     if (zeroInDegreeArr.includes(edge.source)) {
            //         inDegree[edge.target] -= 1
            //     }
            // })

            // optimized version of above
            zeroInDegreeArr.forEach(node => {
                delete inDegree[node]
                const adjNodes = this.adjList[node];
                adjNodes.forEach(node => inDegree[node] -= 1)
            })


        }

        if (topoSorted.flat().length !== this.nodes.length) {
            // error as cyclic graph found  
        }

        return topoSorted

    }


}