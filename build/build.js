class Agent {
    constructor(grid, name, startX, startY) {
        this.Path = [];
        this._isTracked = false;
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
    CalculatePath() {
        const dist = (a, b) => Math.abs(a.X - b.X) + Math.abs(a.Y - b.Y);
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
            const neighbors = [];
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
    OnMouseClick(cellX, cellY) {
        this._isTracked = this.Start.X == cellX && this.Start.Y == cellY;
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
    GetColor() {
        return `hsl(${this.NameHash * 43 % 360}, 100%, 35%)`;
    }
}
class Grid {
    constructor(terrain) {
        this.Width = 0;
        this.Height = 0;
        this.Agents = [];
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
    }
    Calculate() {
        for (const agent of this.Agents)
            agent.CalculatePath();
        for (const agent of this.Agents)
            agent.Summarize();
    }
    IsWall(pos) {
        return !this.hasOwnProperty(pos.Y) || !this[pos.Y][pos.X];
    }
    IsAgent(forWho, pos, step, intersectionCheck) {
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
        text("Step: " + Math.round(percent * longestPath), 0, CANVAS_SIZE + 10);
        pop();
        pop();
    }
}
class Pos {
    constructor(x, y) {
        this.X = x;
        this.Y = y;
    }
    Equals(pos) {
        return this.X == pos.X && this.Y == pos.Y;
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
    Neighbors() {
        return [this.Up(), this.Down(), this.Left(), this.Right()];
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
    GetNodeKey() {
        return `${this.X}-${this.Y}`;
    }
}
class Neighbor extends Pos {
    constructor(pos, score) {
        super(pos.X, pos.Y);
        this.Score = score;
    }
}
const INIT_STATE = `
#####################
#B....d##A####n######
###..###c...a#oQ.N###
#....######C###.#.###
#D#...b########O.Ppq#
#########.###########
#...G#eF...Ef#...##z#
#.H###########.#.#.y#
#..h..g#..j..#...##Z#
########.###.###..###
##.####i.K#k.####...#
#m.lLM######I####.#.#
#######.#########...#
#uvwx.T.##.#....#####
#R#####V##.#........#
#X#####S##.#####....#
#WsU.tr.#......#....#
#####################
`;
const ROOT_GRID = new Grid(INIT_STATE);
ROOT_GRID.AddAgent("Connector1", 14, 6, 19, 12);
ROOT_GRID.AddAgent("Connector2", 15, 6, 17, 10);
ROOT_GRID.AddAgent("Connector3", 14, 7, 17, 9);
ROOT_GRID.AddAgent("Connector4", 19, 12, 14, 6);
ROOT_GRID.AddAgent("Connector5", 18, 12, 16, 8);
ROOT_GRID.AddAgent("Connector6", 19, 11, 16, 9);
ROOT_GRID.AddAgent("Tunnel1", 14, 16, 11, 16);
ROOT_GRID.AddAgent("Tunnel2", 13, 16, 12, 16);
ROOT_GRID.AddAgent("Tunnel3", 12, 16, 13, 16);
ROOT_GRID.AddAgent("Tunnel4", 10, 16, 14, 16);
const cells = [];
for (let iy = 13; iy <= 14; iy++)
    for (let ix = 12; ix <= 15; ix++)
        cells.push(new Pos(ix, iy));
for (let iy = 14; iy <= 16; iy++)
    for (let ix = 16; ix <= 19; ix++)
        cells.push(new Pos(ix, iy));
const goals = JSON.parse(JSON.stringify(cells));
cells.sort((a, b) => (Math.random() > .5) ? 1 : -1);
goals.sort((a, b) => (Math.random() > .5) ? 1 : -1);
let randomAgentNum = 0;
while (cells.length > 2 && goals.length > 2) {
    const start = cells.shift();
    const goal = goals.shift();
    ROOT_GRID.AddAgent("Random" + (++randomAgentNum), start.X, start.Y, goal.X, goal.Y);
}
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