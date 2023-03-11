class Agent {
    constructor(grid, name, startX, startY) {
        this.Path = [];
        this._isTracked = false;
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
    Summarize() {
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
    Manhattan(a, b) {
        return Math.abs(a.X - b.X) + Math.abs(a.Y - b.Y);
    }
    OnMouseClick(cellX, cellY) {
        if (this.Start.X == cellX && this.Start.Y == cellY)
            this._isTracked = !this._isTracked;
    }
    OnMouseMove(cellX, cellY) {
        return this.Start.X == cellX && this.Start.Y == cellY;
    }
    Render(cellWidth, cellHeight, time) {
        const color = this.GetColor();
        stroke(color);
        strokeWeight(4);
        fill(0, 0, 0, 0);
        if (this._isTracked) {
            for (let i = 1; i < this.Path.length; i++) {
                const pos1 = this.Path[i - 1];
                const pos2 = this.Path[i];
                line(pos1.X * cellWidth + cellWidth / 2, pos1.Y * cellHeight + cellHeight / 2, pos2.X * cellWidth + cellWidth / 2, pos2.Y * cellHeight + cellHeight / 2);
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
    GetColor() {
        return `hsl(${this.NameHash * 43 % 360}, 100%, 35%)`;
    }
}
Agent.A_ID = 0;
class Grid {
    constructor(terrain) {
        this.Width = 0;
        this.Height = 0;
        this.Agents = [];
        this.AgentsIs = {};
        this.PosX = 0;
        this.PosY = 0;
        this.CellWidth = 0;
        this.CellHeight = 0;
        const lines = terrain.split("\n").map(x => x.trim()).filter(x => x != "");
        const goals = {};
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
    AddAgent(name, startX, startY, goalX, goalY) {
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
    Calculate() {
        const states = [];
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
                forLoop: for (const agent of agentsToProcess) {
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
    DiscoverAgents(pos) {
        const open = [pos];
        const closed = {};
        const ret = [];
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
    Push(state, agent, goal, occupied) {
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
    MultiPush(state, agents, goal, occupied) {
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
    Swap(state, agent) {
        const pathToGoal = this.ShortestPath(state.GetAgentPos(agent), agent.Goal, []);
        if (pathToGoal === false || pathToGoal.length < 2)
            return false;
        const swapAgentId = state.GetAgentIdAtPos(pathToGoal[1]);
        if (!swapAgentId)
            return false;
        let swapAgent = this.AgentsIs[swapAgentId];
        let success = false;
        const swapVertices = this.GetSwapVertices(state.GetAgentPos(agent));
        let tempState;
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
    Clear(state, vertex, agent1, agent2) {
        if (state.GetAgentPos(agent2).Equals(vertex))
            [agent1, agent2] = [agent2, agent1];
        if (!state.GetAgentPos(agent1).Equals(vertex))
            throw new Error("Neither agent 1, nor agent 2 was on top of the vertex");
        const vertexBack = state.GetAgentPos(agent2);
        const verticesForSwap = vertex.Neighbors().filter(x => !this.IsWall(x) && !x.Equals(state.GetAgentPos(agent1)) && !x.Equals(state.GetAgentPos(agent2)));
        if (verticesForSwap.length < 2)
            return false;
        const emptyVertices = [];
        const occupiedVertices = [];
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
    GetSwapVertices(node) {
        const open = [node];
        const closed = {};
        const ret = [];
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
    ClosestEmpty(state, node, occupied) {
        const open = [node];
        const closed = {};
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
    ShortestPath(start, goal, occupied) {
        const startNode = new NodePos(start);
        startNode.G = 0;
        startNode.H = this.ManhattanDistance(start, goal);
        const open = [startNode];
        const closed = {};
        while (open.length > 0) {
            open.sort((a, b) => a.F - b.F);
            const current = open.shift();
            if (current.Equals(goal)) {
                const path = [];
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
    IsEmpty(state, pos) {
        return !this.IsWall(pos) && state.GetAgentIdAtPos(pos) === false;
    }
    IsWall(pos) {
        return !this.hasOwnProperty(pos.Y) || !this[pos.Y][pos.X];
    }
    ManhattanDistance(pos1, pos2) {
        return Math.abs(pos1.X - pos2.X) + Math.abs(pos1.Y - pos2.Y);
    }
    OnMouseClick(x, y) {
        const cellX = Math.floor((x - this.PosX) / this.CellWidth);
        const cellY = Math.floor((y - this.PosY) / this.CellHeight);
        for (const agent of this.Agents)
            agent.OnMouseClick(cellX, cellY);
    }
    OnMouseMove(x, y) {
        const cellX = Math.floor((x - this.PosX) / this.CellWidth);
        const cellY = Math.floor((y - this.PosY) / this.CellHeight);
        let shouldMakeCursorPointer = false;
        for (const agent of this.Agents)
            if (agent.OnMouseMove(cellX, cellY))
                shouldMakeCursorPointer = true;
        if (RENDERER)
            RENDERER.elt.style.cursor = shouldMakeCursorPointer ? "pointer" : "";
    }
    Render(percent) {
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
Grid.DEPTH = 16;
Grid.FRAMES = 10;
class Pos {
    constructor(x, y) {
        this.X = x;
        this.Y = y;
    }
    Equals(pos) {
        if (!pos)
            return false;
        return this.X == pos.X && this.Y == pos.Y;
    }
    Neighbors() {
        return [this.Up(), this.Left(), this.Right(), this.Down()];
    }
    Up() {
        return new Pos(this.X, this.Y - 1);
    }
    Down() {
        return new Pos(this.X, this.Y + 1);
    }
    Left() {
        return new Pos(this.X - 1, this.Y);
    }
    Right() {
        return new Pos(this.X + 1, this.Y);
    }
    GetKey() {
        return `${this.X}-${this.Y}`;
    }
}
class NodePos extends Pos {
    constructor(pos) {
        super(pos.X, pos.Y);
        this.G = Number.POSITIVE_INFINITY;
        this.H = Number.POSITIVE_INFINITY;
    }
    get F() {
        return this.G + this.H;
    }
    static GetNodeKey(pos) {
        return `${pos.X}-${pos.Y}`;
    }
}
class Neighbor extends Pos {
    constructor(pos, score) {
        super(pos.X, pos.Y);
        this.Score = score;
    }
}
class State {
    constructor() {
        this.CoopPath = [];
        this.CurrentPos = {};
        this.FinishedAgents = {};
    }
    Push() {
        const step = {};
        for (const id in this.CurrentPos)
            step[id] = this.CurrentPos[id];
        this.CoopPath.push(step);
    }
    PushFromState(state) {
        for (const stateStep of state.CoopPath) {
            const step = {};
            for (const id in stateStep)
                step[id] = stateStep[id];
            this.CoopPath.push(step);
        }
        this.CurrentPos = state.CurrentPos;
    }
    PushFromStateReverse(state, agentId1, agentId2) {
        for (let i = state.CoopPath.length - 1; 0 <= i; i--) {
            const stateStep = state.CoopPath[i];
            const step = {};
            for (const id in stateStep) {
                if (id == agentId1.toString())
                    step[id] = stateStep[agentId2];
                else if (id == agentId2.toString())
                    step[id] = stateStep[agentId1];
                else
                    step[id] = stateStep[id];
            }
            this.CoopPath.push(step);
            const copy = {};
            for (const id in step)
                copy[id] = step[id];
            this.CurrentPos = copy;
        }
    }
    GetAgentPos(agent) {
        return this.CurrentPos[agent.Id];
    }
    GetAgentIdAtPos(pos) {
        for (const id in this.CurrentPos)
            if (this.CurrentPos[id].Equals(pos))
                return id;
        return false;
    }
    GetFinishedPositions() {
        return Object.values(this.FinishedAgents);
    }
    GetCurrentPosShallowCopy() {
        const copy = {};
        for (const id in this.CurrentPos)
            copy[id] = this.CurrentPos[id];
        return copy;
    }
}
const INIT_STATE = `
#####################
#B....d##A####n######
###..###c...a#oQ.N###
#....######C###.#.###
#D#...b########O.Pp##
#########.########q##
#...G#eF...Ef#...####
#.H###########.#.####
#..h..g#..j..#...####
########.###.###..###
##.####i.K#k.####...#
#m.lLM######I####.#.#
#################...#
#####################
`;
const ROOT_GRID = new Grid(INIT_STATE);
ROOT_GRID.AddAgent("Connector1", 14, 6, 19, 12);
ROOT_GRID.AddAgent("Connector2", 15, 6, 17, 10);
ROOT_GRID.AddAgent("Connector3", 14, 7, 17, 9);
ROOT_GRID.AddAgent("Connector4", 19, 12, 14, 6);
ROOT_GRID.AddAgent("Connector5", 18, 12, 16, 8);
ROOT_GRID.AddAgent("Connector6", 19, 11, 16, 9);
ROOT_GRID.Calculate();
let RENDERER;
let TIME_SLIDER;
let CANVAS_SIZE = 0;
function setup() {
    RENDERER = createCanvas(windowWidth, windowHeight);
    TIME_SLIDER = createSlider(0, 100, 0, 0.01);
    calculateSizes();
}
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    calculateSizes();
}
function calculateSizes() {
    CANVAS_SIZE = Math.min(windowWidth - 20, windowHeight - 70);
    const cellSize = Math.min(CANVAS_SIZE / ROOT_GRID.Width, CANVAS_SIZE / ROOT_GRID.Height);
    ROOT_GRID.CellWidth = cellSize;
    ROOT_GRID.CellHeight = cellSize;
    ROOT_GRID.PosX = windowWidth / 2 - CANVAS_SIZE / 2;
    ROOT_GRID.PosY = (windowHeight - 50) / 2 - CANVAS_SIZE / 2;
    TIME_SLIDER.position(ROOT_GRID.PosX, ROOT_GRID.PosY + CANVAS_SIZE + 30);
    TIME_SLIDER.style("width", `${CANVAS_SIZE}px`);
}
function mouseClicked() {
    ROOT_GRID.OnMouseClick(mouseX, mouseY);
}
function mouseMoved() {
    ROOT_GRID.OnMouseMove(mouseX, mouseY);
}
function draw() {
    background(0);
    const timerValue = TIME_SLIDER.value();
    ROOT_GRID.Render(typeof timerValue === "number" ? timerValue / 100 : 0);
}
//# sourceMappingURL=build.js.map