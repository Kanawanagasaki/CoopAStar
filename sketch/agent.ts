class Agent {
    public readonly Grid: Grid;
    public readonly Name: string;
    public readonly NameHash: number;
    public readonly Start: Pos;
    public Goal: Pos | undefined;

    public IsFinished: boolean;
    public FinishStep: number;
    public LastMoveStep: number;

    public Path: Pos[] = [];

    private _isTracked: boolean = false;
    private _openSet: NodePos[];
    private _closedSet: Record<string, NodePos>;

    public constructor(grid: Grid, name: string, startX: number, startY: number) {
        this.Grid = grid;
        this.Name = name;
        this.Start = new Pos(startX, startY);

        this.NameHash = 0;
        if (this.Name.length > 0) {
            for (let i = 0; i < this.Name.length; i++) {
                const chr = this.Name.charCodeAt(i);
                this.NameHash = ((this.NameHash << 5) - this.NameHash) + chr;
                this.NameHash |= 0;
            }
            if (this.NameHash < 0)
                this.NameHash = 0x7FFFFFFF + this.NameHash;
        }
    }

    public CalculatePath() {
        const dist = (a: Pos, b: Pos) => Math.abs(a.X - b.X) + Math.abs(a.Y - b.Y);

        const startNode = new NodePos(this.Start);
        startNode.G = 0;
        startNode.H = dist(this.Start, this.Goal);
        this._openSet = [startNode];
        this._closedSet = {};

        for (let z = 0; z < 1000 && this._openSet.length > 0; z++) {
            this._openSet.sort((a, b) => a.F - b.F);
            let current = this._openSet.shift();
            this._closedSet[current.GetNodeKey()] = current;
            if (current.Equals(this.Goal)) {
                while (current) {
                    this.Path.unshift(current);
                    current = current.PrevNode;
                }
                return true;
            }

            const neighbors: Neighbor[] = [];
            for (const neighbor of current.Neighbors())
                if (!this.Grid.IsWall(neighbor))
                    neighbors.push(new Neighbor(neighbor, 1));

            for (const neighbor of neighbors) {
                const tentativeNode = new NodePos(neighbor);
                tentativeNode.G = current.G + neighbor.Score;
                const nodeKey = tentativeNode.GetNodeKey();
                if (this._closedSet.hasOwnProperty(nodeKey)) {
                    if (tentativeNode.G < this._closedSet[nodeKey].G) {
                        this._closedSet[nodeKey].G = tentativeNode.G;
                        this._closedSet[nodeKey].PrevNode = current;
                    }
                }
                else {
                    tentativeNode.PrevNode = current;
                    tentativeNode.H = dist(tentativeNode, this.Goal);
                    this._openSet.push(tentativeNode);
                }
            }
        }

        return false;
    }

    public Summarize() {
        this.FinishStep = 0;
        this.IsFinished = false;
        this.LastMoveStep = 0;

        if (this.Path.length > 0) {
            const lastPos = this.Path[this.Path.length - 1];
            this.IsFinished = lastPos.Equals(this.Goal);
            for (let i = this.Path.length - 1; i >= 0; i--) {
                if (!this.Path[i].Equals(this.Goal)) {
                    this.FinishStep = i + 1;
                    break;
                }
            }
            for (let i = this.Path.length - 1; i >= 0; i--) {
                if (!this.Path[i].Equals(lastPos)) {
                    this.LastMoveStep = i + 1;
                    break;
                }
            }
        }
    }

    public OnMouseClick(cellX: number, cellY: number) {
        this._isTracked = this.Start.X == cellX && this.Start.Y == cellY;
    }

    public OnMouseMove(cellX: number, cellY: number) {
        return this.Start.X == cellX && this.Start.Y == cellY;
    }

    public Render(cellWidth: number, cellHeight: number, time: number) {
        const color = this.GetColor();

        stroke(color);
        strokeWeight(4);
        fill(0, 0, 0, 0);

        if (this._isTracked) {
            for (let i = 1; i < this.Path.length; i++) {
                const pos1 = this.Path[i - 1];
                const pos2 = this.Path[i];

                line
                    (
                        pos1.X * cellWidth + cellWidth / 2,
                        pos1.Y * cellHeight + cellHeight / 2,
                        pos2.X * cellWidth + cellWidth / 2,
                        pos2.Y * cellHeight + cellHeight / 2
                    );
            }
            for (const node of Object.values(this._closedSet)) {
                push();
                strokeWeight(1);
                textAlign("left", "top");
                text(Math.floor(node.G * 100) / 100, node.X * cellWidth + 6, node.Y * cellHeight + 6);
                textAlign("left", "bottom");
                text(Math.floor(node.H * 100) / 100, node.X * cellWidth + 6, node.Y * cellHeight + cellHeight - 6);
                textAlign("right", "bottom");
                text(Math.floor(node.F * 100) / 100, node.X * cellWidth + cellWidth - 6, node.Y * cellHeight + cellHeight - 6);
                pop();
            }
        }

        rect(this.Goal.X * cellWidth + 4, this.Goal.Y * cellHeight + 4, cellWidth - 8, cellHeight - 8);
        ellipse(this.Start.X * cellWidth + cellWidth / 2, this.Start.Y * cellHeight + cellHeight / 2, cellWidth * .6, cellHeight * .6);

        stroke(0, 0, 0, 0);
        fill(color);
        if (this.Path.length == 0)
            ellipse(this.Start.X * cellWidth + cellWidth / 2, this.Start.Y * cellHeight + cellHeight / 2, cellWidth * .6, cellHeight * .6);
        else {
            const index1 = Math.min(Math.floor(time), this.Path.length - 1);
            const index2 = Math.min(Math.ceil(time), this.Path.length - 1);
            const step = time % 1;

            const posX = this.Path[index1].X + (this.Path[index2].X - this.Path[index1].X) * step;
            const posY = this.Path[index1].Y + (this.Path[index2].Y - this.Path[index1].Y) * step;

            ellipse(posX * cellWidth + cellWidth / 2, posY * cellHeight + cellHeight / 2, cellWidth * .6, cellHeight * .6);
        }
    }

    private GetColor() {
        return `hsl(${this.NameHash * 43 % 360}, 100%, 35%)`;
    }
}
