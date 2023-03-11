class Grid {
    public static readonly DEPTH = 16;
    public static readonly FRAMES = 10;

    [y: number]: { [x: number]: boolean };
    public Width: number = 0;
    public Height: number = 0;

    public Agents: Agent[] = [];
    public AgentsIs: Record<string, Agent> = {};

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
                    this.AgentsIs[agent.Id] = agent;
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
        this.AgentsIs[agent.Id] = agent;
    }

    public Calculate() {

        const states: { state: State, agents: Agent[] }[] = [];
        for (const agent of this.Agents) {
            if (!states.some(x => x.agents.some(xx => xx == agent))) {
                const agents = this.DiscoverAgents(agent.Start);
                const state = new State();
                for (const agent of agents)
                    state.CurrentPos[agent.Id] = agent.Start;
                states.push({ state, agents });
            }
        }

        for (const stateBundle of states) {
            const state = stateBundle.state;

            state.Push();

            for (let i = 0; i < 100; i++) {
                const agentsToProcess = [];
                for (const agent of stateBundle.agents)
                    if (!state.GetAgentPos(agent).Equals(agent.Goal))
                        agentsToProcess.push(agent);

                if (agentsToProcess.length == 0)
                    break;

                forLoop:
                for (const agent of agentsToProcess) {
                    while (!state.GetAgentPos(agent).Equals(agent.Goal)) {
                        if (!this.Push(state, agent, agent.Goal, [])) {
                            if (!this.Swap(state, agent)) {
                                continue forLoop;
                            }
                        }
                    }
                    state.FinishedAgents[agent.Id] = state.GetAgentPos(agent);
                }
            }

            for (const agent of stateBundle.agents) {
                for (const step of state.CoopPath)
                    agent.Path.push(step[agent.Id]);
                agent.Summarize();
            }
        }

    }

    private DiscoverAgents(pos: Pos) {
        const open = [pos];
        const closed: Record<string, Pos> = {};
        const ret: Agent[] = [];
        while (open.length > 0) {
            const current = open.shift();
            for (const agent of this.Agents.filter(x => x.Start.Equals(current))) {
                ret.push(agent);
            }
            closed[current.GetKey()] = current;
            for (const neighbor of current.Neighbors().filter(x => !this.IsWall(x)))
                if (!closed.hasOwnProperty(neighbor.GetKey()) && !open.some(x => x.Equals(neighbor)))
                    open.push(neighbor);
        }
        return ret;
    }

    private Push(state: State, agent: Agent, goal: Pos, occupied: Pos[]): boolean {
        const pathToGoal = this.ShortestPath(state.GetAgentPos(agent), goal, occupied);
        if (pathToGoal === false)
            return false;
        pathToGoal.shift();
        let v = pathToGoal.shift();
        while (!state.GetAgentPos(agent).Equals(goal)) {
            while (v && this.IsEmpty(state, v)) {
                state.CurrentPos[agent.Id] = v;
                state.Push();
                v = pathToGoal.shift();
            }
            if (!state.GetAgentPos(agent).Equals(goal)) {
                const occupiedCopy = [...occupied, ...state.GetFinishedPositions(), state.GetAgentPos(agent)];
                const emptyV = this.ClosestEmpty(state, v, occupiedCopy);
                if (emptyV === false)
                    return false;
                const pathToEmptyV = this.ShortestPath(v, emptyV, occupiedCopy);
                if (pathToEmptyV === false)
                    return false;
                pathToEmptyV.pop();
                const vv = pathToEmptyV.pop();
                const agentIdToPush = state.GetAgentIdAtPos(vv);
                if (agentIdToPush === false)
                    return false;
                this.Push(state, this.AgentsIs[agentIdToPush], emptyV, occupied);
            }
        }
        return true;
    }

    private MultiPush(state: State, agents: Agent[], goal: Pos, occupied: Pos[]): boolean {
        for (let i = 1; i < agents.length; i++)
            if (this.ManhattanDistance(state.GetAgentPos(agents[i - 1]), state.GetAgentPos(agents[i])) != 1)
                throw new Error("Distance between agents must be 1");
        const pathToGoal = this.ShortestPath(state.GetAgentPos(agents[0]), goal, occupied);
        if (pathToGoal === false)
            return false;
        if (state.GetAgentPos(agents[agents.length - 1]).Equals(pathToGoal[agents.length - 1])) {
            agents = agents.reverse();
            pathToGoal.splice(0, agents.length - 1);
        }

        pathToGoal.shift();
        let v = pathToGoal.shift();
        while (!state.GetAgentPos(agents[0]).Equals(goal)) {
            while (v && this.IsEmpty(state, v)) {
                for (let i = 1; i < agents.length; i++)
                    state.CurrentPos[agents[i].Id] = state.CurrentPos[agents[i - 1].Id];
                state.CurrentPos[agents[0].Id] = v;
                state.Push();
                v = pathToGoal.shift();
            }
            if (!state.GetAgentPos(agents[0]).Equals(goal)) {
                const occupiedCopy = [...occupied, state.GetAgentPos(agents[0])];
                const emptyV = this.ClosestEmpty(state, v, occupiedCopy);
                if (emptyV === false)
                    return false;
                const pathToEmptyV = this.ShortestPath(v, emptyV, occupiedCopy);
                if (pathToEmptyV === false)
                    return false;
                pathToEmptyV.pop();
                const vv = pathToEmptyV.pop();
                const agentIdToPush = state.GetAgentIdAtPos(vv);
                if (!agentIdToPush)
                    return false;
                this.Push(state, this.AgentsIs[agentIdToPush], emptyV, occupied);
            }
        }
        return true;
    }

    private Swap(state: State, agent: Agent): boolean {
        const pathToGoal = this.ShortestPath(state.GetAgentPos(agent), agent.Goal, []);
        if (pathToGoal === false || pathToGoal.length < 2)
            return false;
        const swapAgentId = state.GetAgentIdAtPos(pathToGoal[1]);
        if (!swapAgentId)
            return false;
        let swapAgent = this.AgentsIs[swapAgentId];
        let success = false;
        const swapVertices = this.GetSwapVertices(state.GetAgentPos(agent));
        let tempState: State;
        while (swapVertices.length > 0 && !success) {
            const v = swapVertices.shift();
            const pathToV = this.ShortestPath(state.GetAgentPos(agent), v, []);
            if (pathToV === false)
                return false;
            tempState = new State();
            tempState.CurrentPos = state.GetCurrentPosShallowCopy();
            if (this.MultiPush(tempState, [agent, swapAgent], v, []) && this.Clear(tempState, v, agent, swapAgent))
                success = true;
        }
        if (!success)
            return false;
        state.PushFromState(tempState);
        let vertex = state.GetAgentPos(agent);
        let vertexBack = state.GetAgentPos(swapAgent);
        let verticesForSwap = vertex.Neighbors().filter(x => !this.IsWall(x) && !x.Equals(state.GetAgentPos(agent)) && !x.Equals(state.GetAgentPos(swapAgent)));
        if (verticesForSwap.length < 2) {
            verticesForSwap = vertexBack.Neighbors().filter(x => !this.IsWall(x) && !x.Equals(state.GetAgentPos(agent)) && !x.Equals(state.GetAgentPos(swapAgent)));
            if (verticesForSwap.length < 2)
                return;
            [vertex, vertexBack] = [vertexBack, vertex];
            [agent, swapAgent] = [swapAgent, agent];
        }
        const emptyVertices = verticesForSwap.filter(x => this.IsEmpty(state, x));
        if (emptyVertices.length < 2)
            return false;

        state.CurrentPos[agent.Id] = emptyVertices[0];
        state.CurrentPos[swapAgent.Id] = vertex;
        state.Push();
        state.CurrentPos[agent.Id] = vertex;
        state.CurrentPos[swapAgent.Id] = emptyVertices[1];
        state.Push();
        state.CurrentPos[agent.Id] = vertexBack;
        state.CurrentPos[swapAgent.Id] = vertex;
        state.Push();

        state.PushFromStateReverse(tempState, agent.Id, swapAgent.Id);

        if (state.FinishedAgents.hasOwnProperty(swapAgent.Id) && !state.GetAgentPos(swapAgent).Equals(swapAgent.Goal))
            delete state.FinishedAgents[swapAgent.Id];

        return true;
    }

    private Clear(state: State, vertex: Pos, agent1: Agent, agent2: Agent) {
        if (state.GetAgentPos(agent2).Equals(vertex))
            [agent1, agent2] = [agent2, agent1];
        if (!state.GetAgentPos(agent1).Equals(vertex))
            throw new Error("Neither agent 1, nor agent 2 was on top of the vertex");
        const vertexBack = state.GetAgentPos(agent2);
        const verticesForSwap = vertex.Neighbors().filter(x => !this.IsWall(x) && !x.Equals(state.GetAgentPos(agent1)) && !x.Equals(state.GetAgentPos(agent2)));
        if (verticesForSwap.length < 2)
            return false;
        const emptyVertices: Pos[] = [];
        const occupiedVertices: Pos[] = [];
        for (const v of verticesForSwap)
            if (this.IsEmpty(state, v))
                emptyVertices.push(v);
            else
                occupiedVertices.push(v);
        if (emptyVertices.length >= 2)
            return true;

        for (const occupiedVertex of occupiedVertices) {
            const tempState = new State();
            tempState.CurrentPos = state.GetCurrentPosShallowCopy();
            const emptyV = this.ClosestEmpty(tempState, occupiedVertex, [vertex]);
            if (emptyV !== false) {
                const pathToEmptyV = this.ShortestPath(occupiedVertex, emptyV, [vertex]);
                if (pathToEmptyV !== false) {
                    pathToEmptyV.pop();
                    const vv = pathToEmptyV.pop();
                    const agentIdToPush = tempState.GetAgentIdAtPos(vv);
                    if (agentIdToPush !== false && this.Push(tempState, this.AgentsIs[agentIdToPush], emptyV, [vertex])) {
                        state.PushFromState(tempState);
                        return true;
                    }
                }
            }
        }

        if (emptyVertices.length == 1) {
            const agentIdToMove = state.GetAgentIdAtPos(occupiedVertices[0]);
            if (agentIdToMove === false)
                throw new Error("Occupied vertex had no agents?");
            const agentToMove = this.AgentsIs[agentIdToMove];
            const tempState = new State();
            tempState.CurrentPos = state.GetCurrentPosShallowCopy();
            if (!this.Push(tempState, agent1, vertexBack, []))
                return false;
            if (!this.Push(tempState, agentToMove, emptyVertices[0], []))
                return false;
            tempState.CurrentPos[agent1.Id] = vertex;
            tempState.CurrentPos[agent2.Id] = vertexBack;
            tempState.Push();
            const emptyV = this.ClosestEmpty(tempState, emptyVertices[0], [vertex]);
            if (emptyV !== false) {
                const pathToEmptyV = this.ShortestPath(emptyVertices[0], emptyV, [vertex]);
                if (pathToEmptyV !== false) {
                    pathToEmptyV.pop();
                    const vv = pathToEmptyV.pop();
                    const agentIdToPush = tempState.GetAgentIdAtPos(vv);
                    if (agentIdToPush !== false && this.Push(tempState, this.AgentsIs[agentIdToPush], emptyV, [vertex])) {
                        state.PushFromState(tempState);
                        return true;
                    }
                }
            }
        }

        return false;
    }

    private GetSwapVertices(node: Pos) {
        const open = [node];
        const closed: Record<string, Pos> = {};
        const ret: Pos[] = [];
        while (open.length > 0) {
            open.sort((a, b) => this.ManhattanDistance(node, a) - this.ManhattanDistance(node, b));
            const current = open.shift();
            closed[current.GetKey()] = current;
            const neighbors = current.Neighbors().filter(x => !this.IsWall(x));
            if (3 <= neighbors.length)
                ret.push(current);
            for (const neighbor of neighbors)
                if (!closed.hasOwnProperty(neighbor.GetKey()))
                    open.push(neighbor);
        }
        return ret;
    }

    private ClosestEmpty(state: State, node: Pos, occupied: Pos[]) {
        const open = [node];
        const closed: Record<string, Pos> = {};
        while (open.length > 0) {
            open.sort((a, b) => this.ManhattanDistance(node, a) - this.ManhattanDistance(node, b));
            const current = open.shift();
            if (this.IsEmpty(state, current))
                return current;
            closed[current.GetKey()] = current;
            const neighbors = current.Neighbors().filter(x => !this.IsWall(x) && !occupied.some(x => x.Equals(current)));
            for (const neighbor of neighbors)
                if (!closed.hasOwnProperty(neighbor.GetKey()))
                    open.push(neighbor);
        }
        return false;
    }

    private ShortestPath(start: Pos, goal: Pos, occupied: Pos[]) {
        const startNode = new NodePos(start);
        startNode.G = 0;
        startNode.H = this.ManhattanDistance(start, goal);

        const open: NodePos[] = [startNode];
        const closed: Record<string, NodePos> = {};
        while (open.length > 0) {
            open.sort((a, b) => a.F - b.F);
            const current = open.shift();
            if (current.Equals(goal)) {
                const path: Pos[] = [];
                let node = current;
                while (node) {
                    path.unshift(node);
                    node = node.PrevNode;
                }
                return path;
            }
            closed[NodePos.GetNodeKey(current)] = current;
            const neighbors = current.Neighbors().filter(x => !this.IsWall(x) && !occupied.some(xx => xx.Equals(x)));
            for (const neighbor of neighbors) {
                const G = current.G + 1;
                const key = NodePos.GetNodeKey(neighbor);
                if (!closed.hasOwnProperty(key)) {
                    const tentativeNode = new NodePos(neighbor);
                    tentativeNode.G = G;
                    tentativeNode.H = this.ManhattanDistance(neighbor, goal);
                    tentativeNode.PrevNode = current;
                    open.push(tentativeNode);
                }
                else if (G < closed[key].G) {
                    closed[key].G = G;
                    closed[key].PrevNode = current;
                }
            }
        }

        return false;
    }

    public IsEmpty(state: State, pos: Pos) {
        return !this.IsWall(pos) && state.GetAgentIdAtPos(pos) === false;
    }

    public IsWall(pos: Pos) {
        return !this.hasOwnProperty(pos.Y) || !this[pos.Y][pos.X];
    }

    public ManhattanDistance(pos1: Pos, pos2: Pos) {
        return Math.abs(pos1.X - pos2.X) + Math.abs(pos1.Y - pos2.Y);
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
        text("Step: " + Math.round(percent * longestPath) + " / " + longestPath, 0, CANVAS_SIZE + 10);
        pop();

        pop();
    }
}
