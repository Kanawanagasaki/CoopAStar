class Agent {
    public readonly Grid: Grid;
    public readonly Name: string;
    public readonly NameHash: number;
    public readonly Start: Pos;
    public Goal: Pos | undefined;

    public Path: Pos[] = [];

    private _isTracked: boolean = false;

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

        const startNode = new NodePos(this.Start, 0);
        startNode.G = 0;
        startNode.H = dist(this.Start, this.Goal);
        const openSet: NodePos[] = [startNode];
        const visited: Record<string, NodePos> = { [startNode.GetNodeKey()]: startNode };

        for (let z = 0; z < 1000 && openSet.length > 0; z++) {
            openSet.sort((a, b) => a.F - b.F);
            let current = openSet.shift();
            if (current.X == this.Goal.X && current.Y == this.Goal.Y) {
                while (current) {
                    this.Path.unshift(current);
                    current = current.PrevNode;
                }
                return true;
            }
            const neighbors: Neighbor[] = [];

            const up = current.Up();
            if (!this.Grid.IsWall(up)) neighbors.push(new Neighbor(up, 1.1));

            const down = current.Down();
            if (!this.Grid.IsWall(down)) neighbors.push(new Neighbor(down, 1.1));

            const left = current.Left();
            if (!this.Grid.IsWall(left)) neighbors.push(new Neighbor(left, 1.1));

            const right = current.Right();
            if (!this.Grid.IsWall(right)) neighbors.push(new Neighbor(right, 1.1));

            for (const neighbor of neighbors) {
                const tentativeNode = new NodePos(neighbor, current.Step + 1);
                tentativeNode.G = current.G + neighbor.Score;
                const nodeKey = tentativeNode.GetNodeKey();
                if (!(nodeKey in visited) || tentativeNode.G < visited[nodeKey].G) {
                    tentativeNode.PrevNode = current;
                    tentativeNode.H = dist(tentativeNode, this.Goal);
                    for (let i = 0; i < openSet.length; i++)
                        if (openSet[i].Equals(tentativeNode))
                            openSet.splice(i, 1);
                    openSet.push(tentativeNode);
                    visited[nodeKey] = tentativeNode;
                }
            }
        }

        return false;
    }

    public OnMouseClick(cellX: number, cellY: number) {
        if (this.Start.X == cellX && this.Start.Y == cellY)
            this._isTracked = !this._isTracked;
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
