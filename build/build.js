var Agent = (function () {
    function Agent(grid, name, startX, startY) {
        this.Path = [];
        this._isTracked = false;
        this.Grid = grid;
        this.Name = name;
        this.Start = new Pos(startX, startY);
        this.NameHash = 0;
        if (this.Name.length > 0) {
            for (var i = 0; i < this.Name.length; i++) {
                var chr = this.Name.charCodeAt(i);
                this.NameHash = ((this.NameHash << 5) - this.NameHash) + chr;
                this.NameHash |= 0;
            }
            if (this.NameHash < 0)
                this.NameHash = 0x7FFFFFFF + this.NameHash;
        }
    }
    Agent.prototype.CalculatePath = function (isCoop, storePath) {
        var _a;
        if (isCoop && !this.CalculatePath(false, false))
            return false;
        var dist = function (a, b) { return Math.abs(a.X - b.X) + Math.abs(a.Y - b.Y); };
        var startNode = new NodePos(this.Start, 0);
        startNode.G = 0;
        startNode.H = dist(this.Start, this.Goal);
        var openSet = [startNode];
        var visited = (_a = {}, _a[startNode.GetNodeKey()] = startNode, _a);
        for (var z = 0; z < 1000 && openSet.length > 0; z++) {
            openSet.sort(function (a, b) { return a.F - b.F; });
            var current = openSet.shift();
            if (current.X == this.Goal.X && current.Y == this.Goal.Y) {
                while (storePath && current) {
                    this.Path.unshift(current);
                    current = current.PrevNode;
                }
                return true;
            }
            var neighbors = [];
            var up = current.Up();
            if (!this.Grid.IsWall(up)) {
                if (!isCoop)
                    neighbors.push(new Neighbor(up, 1.1));
                else if (!this.Grid.IsAgent(this, up, current.Step + 1, true))
                    neighbors.push(new Neighbor(up, 1.1));
            }
            var down = current.Down();
            if (!this.Grid.IsWall(down)) {
                if (!isCoop)
                    neighbors.push(new Neighbor(down, 1.1));
                else if (!this.Grid.IsAgent(this, down, current.Step + 1, true))
                    neighbors.push(new Neighbor(down, 1.1));
            }
            var left = current.Left();
            if (!this.Grid.IsWall(left)) {
                if (!isCoop)
                    neighbors.push(new Neighbor(left, 1.1));
                else if (!this.Grid.IsAgent(this, left, current.Step + 1, true))
                    neighbors.push(new Neighbor(left, 1.1));
            }
            var right = current.Right();
            if (!this.Grid.IsWall(right)) {
                if (!isCoop)
                    neighbors.push(new Neighbor(right, 1.1));
                else if (!this.Grid.IsAgent(this, right, current.Step + 1, true))
                    neighbors.push(new Neighbor(right, 1.1));
            }
            if (isCoop && !this.Grid.IsAgent(this, current, current.Step + 1, true))
                neighbors.push(new Neighbor(current, 1));
            for (var _i = 0, neighbors_1 = neighbors; _i < neighbors_1.length; _i++) {
                var neighbor = neighbors_1[_i];
                var tentativeNode = new NodePos(neighbor, current.Step + 1);
                tentativeNode.G = current.G + neighbor.Score;
                var nodeKey = tentativeNode.GetNodeKey();
                if (!(nodeKey in visited) || tentativeNode.G < visited[nodeKey].G) {
                    tentativeNode.PrevNode = current;
                    tentativeNode.H = dist(tentativeNode, this.Goal);
                    for (var i = 0; i < openSet.length; i++)
                        if (openSet[i].Equals(tentativeNode) && openSet[i].Step == tentativeNode.Step)
                            openSet.splice(i, 1);
                    openSet.push(tentativeNode);
                    visited[nodeKey] = tentativeNode;
                }
            }
        }
        return false;
    };
    Agent.prototype.OnMouseClick = function (cellX, cellY) {
        if (this.Start.X == cellX && this.Start.Y == cellY)
            this._isTracked = !this._isTracked;
    };
    Agent.prototype.OnMouseMove = function (cellX, cellY) {
        return this.Start.X == cellX && this.Start.Y == cellY;
    };
    Agent.prototype.Render = function (cellWidth, cellHeight, time) {
        var color = this.GetColor();
        stroke(color);
        strokeWeight(4);
        fill(0, 0, 0, 0);
        if (this._isTracked) {
            for (var i = 1; i < this.Path.length; i++) {
                var pos1 = this.Path[i - 1];
                var pos2 = this.Path[i];
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
            var index1 = Math.min(Math.floor(time), this.Path.length - 1);
            var index2 = Math.min(Math.ceil(time), this.Path.length - 1);
            var step = time % 1;
            var posX = this.Path[index1].X + (this.Path[index2].X - this.Path[index1].X) * step;
            var posY = this.Path[index1].Y + (this.Path[index2].Y - this.Path[index1].Y) * step;
            ellipse(posX * cellWidth + cellWidth / 2, posY * cellHeight + cellHeight / 2, cellWidth * .6, cellHeight * .6);
        }
    };
    Agent.prototype.GetColor = function () {
        return "hsl(" + this.NameHash * 43 % 360 + ", 100%, 35%)";
    };
    return Agent;
}());
var Grid = (function () {
    function Grid(terrain) {
        this.Width = 0;
        this.Height = 0;
        this.Agents = [];
        this.PosX = 0;
        this.PosY = 0;
        this.CellWidth = 0;
        this.CellHeight = 0;
        var lines = terrain.split("\n").map(function (x) { return x.trim(); }).filter(function (x) { return x != ""; });
        var goals = {};
        for (var iy = 0; iy < lines.length; iy++) {
            this[iy] = [];
            var chs = lines[iy].split("");
            var _loop_1 = function (ix) {
                this_1[iy][ix] = chs[ix] != "#";
                if (/[a-z]/.test(chs[ix])) {
                    var agent = new Agent(this_1, chs[ix], ix, iy);
                    if (chs[ix] in goals)
                        agent.Goal = goals[chs[ix]];
                    this_1.Agents.push(agent);
                }
                else if (/[A-Z]/.test(chs[ix])) {
                    var name_1 = chs[ix].toLowerCase();
                    var agent = this_1.Agents.filter(function (x) { return x.Name == name_1; })[0];
                    if (agent)
                        agent.Goal = new Pos(ix, iy);
                    else
                        goals[name_1] = new Pos(ix, iy);
                }
            };
            var this_1 = this;
            for (var ix = 0; ix < chs.length; ix++) {
                _loop_1(ix);
            }
            this.Width = Math.max(this.Width, chs.length);
        }
        for (var _i = 0, _a = this.Agents; _i < _a.length; _i++) {
            var agent = _a[_i];
            if (!agent.Goal)
                agent.Goal = agent.Start;
        }
        for (var _b = 0, _c = this.Agents; _b < _c.length; _b++) {
            var agent = _c[_b];
            agent.CalculatePath(true, true);
        }
        this.Height = lines.length;
    }
    Grid.prototype.IsWall = function (pos) {
        return !this.hasOwnProperty(pos.Y) || !this[pos.Y][pos.X];
    };
    Grid.prototype.IsAgent = function (forWho, pos, step, intersectionCheck) {
        for (var _i = 0, _a = this.Agents; _i < _a.length; _i++) {
            var agent = _a[_i];
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
    };
    Grid.prototype.OnMouseClick = function (x, y) {
        var cellX = Math.floor((x - this.PosX) / this.CellWidth);
        var cellY = Math.floor((y - this.PosY) / this.CellHeight);
        for (var _i = 0, _a = this.Agents; _i < _a.length; _i++) {
            var agent = _a[_i];
            agent.OnMouseClick(cellX, cellY);
        }
    };
    Grid.prototype.OnMouseMove = function (x, y) {
        var cellX = Math.floor((x - this.PosX) / this.CellWidth);
        var cellY = Math.floor((y - this.PosY) / this.CellHeight);
        var shouldMakeCursorPointer = false;
        for (var _i = 0, _a = this.Agents; _i < _a.length; _i++) {
            var agent = _a[_i];
            if (agent.OnMouseMove(cellX, cellY))
                shouldMakeCursorPointer = true;
        }
        if (RENDERER)
            RENDERER.elt.style.cursor = shouldMakeCursorPointer ? "pointer" : "";
    };
    Grid.prototype.Render = function (percent) {
        push();
        translate(this.PosX, this.PosY);
        stroke(32, 32, 32);
        for (var iy = 0; iy < this.Height; iy++) {
            for (var ix = 0; ix < this.Width; ix++) {
                if (this[iy][ix])
                    fill(255, 255, 255);
                else
                    fill(0, 0, 0);
                rect(ix * this.CellWidth, iy * this.CellHeight, this.CellWidth, this.CellHeight);
            }
        }
        var longestPath = Math.max.apply(Math, this.Agents.map(function (x) { return x.Path.length; }));
        for (var _i = 0, _a = this.Agents; _i < _a.length; _i++) {
            var agent = _a[_i];
            agent.Render(this.CellWidth, this.CellHeight, percent * (longestPath - 1));
        }
        pop();
    };
    return Grid;
}());
var Pos = (function () {
    function Pos(x, y) {
        this.X = x;
        this.Y = y;
    }
    Pos.prototype.Equals = function (pos) {
        return this.X == pos.X && this.Y == pos.Y;
    };
    Pos.prototype.Up = function () {
        return new Pos(this.X, this.Y - 1);
    };
    Pos.prototype.Down = function () {
        return new Pos(this.X, this.Y + 1);
    };
    Pos.prototype.Left = function () {
        return new Pos(this.X - 1, this.Y);
    };
    Pos.prototype.Right = function () {
        return new Pos(this.X + 1, this.Y);
    };
    return Pos;
}());
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var NodePos = (function (_super) {
    __extends(NodePos, _super);
    function NodePos(pos, step) {
        var _this = _super.call(this, pos.X, pos.Y) || this;
        _this.G = Number.POSITIVE_INFINITY;
        _this.H = Number.POSITIVE_INFINITY;
        _this.Step = step;
        return _this;
    }
    Object.defineProperty(NodePos.prototype, "F", {
        get: function () {
            return this.G + this.H;
        },
        enumerable: true,
        configurable: true
    });
    NodePos.prototype.GetNodeKey = function () {
        return this.X + "-" + this.Y + "-" + this.Step;
    };
    return NodePos;
}(Pos));
var Neighbor = (function (_super) {
    __extends(Neighbor, _super);
    function Neighbor(pos, score) {
        var _this = _super.call(this, pos.X, pos.Y) || this;
        _this.Score = score;
        return _this;
    }
    return Neighbor;
}(Pos));
var INIT_STATE = "\n##############\n#B....d##A####\n###..###c...a#\n#....######C##\n#D#...b#######\n#########.####\n#...G#eF...Ef#\n#.H###########\n#..h..g#..j..#\n########.###.#\n##.####i.K#k.#\n#m..lM######I#\n##############\n";
var ROOT_GRID = new Grid(INIT_STATE);
var RENDERER;
var TIME_SLIDER;
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
    var canvasSize = Math.min(windowWidth - 20, windowHeight - 50);
    var cellSize = Math.min(canvasSize / ROOT_GRID.Width, canvasSize / ROOT_GRID.Height);
    ROOT_GRID.CellWidth = cellSize;
    ROOT_GRID.CellHeight = cellSize;
    ROOT_GRID.PosX = windowWidth / 2 - canvasSize / 2;
    ROOT_GRID.PosY = (windowHeight - 30) / 2 - canvasSize / 2;
    TIME_SLIDER.position(ROOT_GRID.PosX, ROOT_GRID.PosY + canvasSize + 10);
    TIME_SLIDER.style("width", canvasSize + "px");
}
function mouseClicked() {
    ROOT_GRID.OnMouseClick(mouseX, mouseY);
}
function mouseMoved() {
    ROOT_GRID.OnMouseMove(mouseX, mouseY);
}
function draw() {
    background(0);
    var timerValue = TIME_SLIDER.value();
    ROOT_GRID.Render(typeof timerValue === "number" ? timerValue / 100 : 0);
}
//# sourceMappingURL=build.js.map