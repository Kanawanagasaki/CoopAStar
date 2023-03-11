class Agent {
    private static A_ID: number = 0;

    public readonly Id: number;
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

    public constructor(grid: Grid, name: string, startX: number, startY: number) {
        this.Id = ++Agent.A_ID;
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

    private Manhattan(a: Pos, b: Pos) {
        return Math.abs(a.X - b.X) + Math.abs(a.Y - b.Y);
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
            let index1 = Math.min(Math.floor(time), this.Path.length - 1);
            let index2 = Math.min(Math.ceil(time), this.Path.length - 1);
            const step = time % 1;

            if (index1 >= this.Path.length)
                index1 = this.Path.length - 1;
            if (index1 < 0 || isNaN(index1))
                index1 = 0;
            if (index2 >= this.Path.length)
                index2 = this.Path.length - 1;
            if (index2 < 0 || isNaN(index2))
                index2 = 0;

            const posX = this.Path[index1].X + (this.Path[index2].X - this.Path[index1].X) * step;
            const posY = this.Path[index1].Y + (this.Path[index2].Y - this.Path[index1].Y) * step;

            ellipse(posX * cellWidth + cellWidth / 2, posY * cellHeight + cellHeight / 2, cellWidth * .6, cellHeight * .6);
        }
    }

    private GetColor() {
        return `hsl(${this.NameHash * 43 % 360}, 100%, 35%)`;
    }
}
