class Grid {
    [y: number]: { [x: number]: boolean };
    public Width: number = 0;
    public Height: number = 0;

    public Agents: Agent[] = [];

    public PosX: number = 0;
    public PosY: number = 0;
    public CellWidth: number = 0;
    public CellHeight: number = 0;

    public constructor(terrain: string) {
        const lines = terrain.split("\n").map(x => x.trim()).filter(x => x != "");
        const goals: Record<string, Pos> = {};
        for (let iy = 0; iy < lines.length; iy++) {
            this[iy] = [];
            const chs = lines[iy].split("");
            for (let ix = 0; ix < chs.length; ix++) {
                this[iy][ix] = chs[ix] != "#";
                if (/[a-z]/.test(chs[ix])) {
                    const agent = new Agent(this, chs[ix], ix, iy);
                    if (chs[ix] in goals)
                        agent.Goal = goals[chs[ix]];
                    this.Agents.push(agent);
                }
                else if (/[A-Z]/.test(chs[ix])) {
                    let name = chs[ix].toLowerCase();
                    const agent = this.Agents.filter(x => x.Name == name)[0];
                    if (agent)
                        agent.Goal = new Pos(ix, iy);
                    else
                        goals[name] = new Pos(ix, iy);
                }
            }
            this.Width = Math.max(this.Width, chs.length);
        }
        this.Height = lines.length;

        for (const agent of this.Agents)
            if (!agent.Goal)
                agent.Goal = agent.Start;
    }

    public AddAgent(name: string, startX: number, startY: number, goalX: number, goalY: number) {
        if (this.IsWall(new Pos(startX, startY)))
            throw new Error("You tried to spawn agent " + name + " in wall");
        if (this.IsWall(new Pos(goalX, goalY)))
            throw new Error("You tried to set goal for agent " + name + " in wall");

        for (const a of this.Agents) {
            if (a.Start.X == startX && a.Start.Y == startY)
                throw new Error("Start position conflict between " + a.Name + " and " + name);
            if (a.Goal.X == goalX && a.Goal.Y == goalY)
                throw new Error("Goal position conflict between " + a.Name + " and " + name);
        }

        const agent = new Agent(this, name, startX, startY);
        agent.Goal = new Pos(goalX, goalY);
        this.Agents.push(agent);
    }

    public Calculate() {
        for (const agent of this.Agents)
            agent.CalculatePath(true, true);
        
        for (const agent of this.Agents)
            agent.Summarize();
    }

    public IsWall(pos: Pos) {
        return !this.hasOwnProperty(pos.Y) || !this[pos.Y][pos.X];
    }

    public IsAgent(forWho: Agent, pos: Pos, step: number, intersectionCheck: boolean) {
        for (const agent of this.Agents) {
            if (forWho == agent)
                continue;
            else if (agent.Path.length == 0) {
                if (agent.Start.Equals(pos))
                    return true;
            }
            else if (agent.Path.length <= step) {
                if (agent.Goal.Equals(pos))
                    return true;
            }
            else if (agent.Path[step].Equals(pos))
                return true;
            else if (intersectionCheck && agent.Path[step - 1].Equals(pos))
                return true;
        }
        return false;
    }

    public OnMouseClick(x: number, y: number) {
        const cellX = Math.floor((x - this.PosX) / this.CellWidth);
        const cellY = Math.floor((y - this.PosY) / this.CellHeight);

        for (const agent of this.Agents)
            agent.OnMouseClick(cellX, cellY);
    }

    public OnMouseMove(x: number, y: number) {
        const cellX = Math.floor((x - this.PosX) / this.CellWidth);
        const cellY = Math.floor((y - this.PosY) / this.CellHeight);
        let shouldMakeCursorPointer = false;
        for (const agent of this.Agents)
            if (agent.OnMouseMove(cellX, cellY))
                shouldMakeCursorPointer = true;

        if (RENDERER)
            RENDERER.elt.style.cursor = shouldMakeCursorPointer ? "pointer" : "";
    }

    public Render(percent: number) {
        push();
        translate(this.PosX, this.PosY);

        stroke(32, 32, 32);
        for (let iy = 0; iy < this.Height; iy++) {
            for (let ix = 0; ix < this.Width; ix++) {
                if (this[iy][ix])
                    fill(255, 255, 255);
                else
                    fill(0, 0, 0);
                rect(ix * this.CellWidth, iy * this.CellHeight, this.CellWidth, this.CellHeight);
            }
        }

        const longestPath = Math.max(...this.Agents.map(x => x.LastMoveStep));
        for (const agent of this.Agents)
            agent.Render(this.CellWidth, this.CellHeight, percent * longestPath);

        push();
        strokeWeight(1);
        textAlign("left", "top");
        textSize(16);
        noStroke();
        fill(255, 255, 255);
        text("Step: " + Math.round(percent * longestPath), 0, CANVAS_SIZE + 10);
        pop();

        pop();
    }
}
