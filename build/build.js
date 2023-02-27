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
    Agent.prototype.CalculatePath = function () {
        var goalNode = new NodePos(this.Goal, 0);
        goalNode.G = 0;
        goalNode.H = this.Manhattan(this.Goal, this.Start);
        this._rrasOpenSet = [goalNode];
        this._rrasClosedSet = {};
        var startNode = new NodePos(this.Start, 0);
        startNode.G = 0;
        startNode.H = this.CalculateRRAS(startNode);
        var openSet = [startNode];
        var closedSet = {};
        for (var z = 0; z < 1000 && openSet.length > 0; z++) {
            openSet.sort(function (a, b) { return a.F - b.F; });
            var current = openSet.shift();
            closedSet[current.GetNodeKey()] = current;
            if (current.Equals(this.Goal)) {
                while (current) {
                    this.Path.unshift(current);
                    current = current.PrevNode;
                }
                return true;
            }
            var neighborNodes = [];
            for (var _i = 0, _a = current.Neighbors(); _i < _a.length; _i++) {
                var neighbor = _a[_i];
                if (!this.Grid.IsWall(neighbor) && !this.Grid.IsAgent(this, neighbor, current.Step + 1, true))
                    neighborNodes.push(new Neighbor(neighbor, 1.1));
            }
            if (!this.Grid.IsAgent(this, current, current.Step + 1, true))
                neighborNodes.push(new Neighbor(current, 1));
            var _loop_1 = function (neighbor) {
                var tentativeNode = new NodePos(neighbor, current.Step + 1);
                tentativeNode.G = current.G + neighbor.Score;
                var nodeKey = tentativeNode.GetNodeKey();
                if (!(nodeKey in closedSet) || tentativeNode.G < closedSet[nodeKey].G) {
                    tentativeNode.PrevNode = current;
                    tentativeNode.H = this_1.CalculateRRAS(tentativeNode);
                    closedSet[nodeKey] = tentativeNode;
                    if (!openSet.some(function (x) { return x.Equals(tentativeNode) && x.Step == tentativeNode.Step; }))
                        openSet.push(tentativeNode);
                }
            };
            var this_1 = this;
            for (var _b = 0, neighborNodes_1 = neighborNodes; _b < neighborNodes_1.length; _b++) {
                var neighbor = neighborNodes_1[_b];
                _loop_1(neighbor);
            }
        }
        return false;
    };
    Agent.prototype.CalculateRRAS = function (N) {
        if (N.Equals(this.Goal))
            return 0;
        var posKey = N.GetKey();
        if (this._rrasClosedSet.hasOwnProperty(posKey))
            return this._rrasClosedSet[posKey].G;
        while (this._rrasOpenSet.length > 0) {
            this._rrasOpenSet.sort(function (a, b) { return a.F - b.F; });
            var current = this._rrasOpenSet.shift();
            this._rrasClosedSet[current.GetKey()] = current;
            if (current.X == N.X && current.Y == N.Y)
                return current.G;
            var neighbors = [];
            for (var _i = 0, _a = current.Neighbors(); _i < _a.length; _i++) {
                var neighbor = _a[_i];
                if (!this.Grid.IsWall(neighbor))
                    neighbors.push(new Neighbor(neighbor, 1));
            }
            var _loop_2 = function (neighbor) {
                var tentativeNode = new NodePos(neighbor, current.Step + 1);
                tentativeNode.G = current.G + neighbor.Score;
                var nodeKey = tentativeNode.GetKey();
                if (!(nodeKey in this_2._rrasClosedSet) || tentativeNode.G < this_2._rrasClosedSet[nodeKey].G) {
                    tentativeNode.PrevNode = current;
                    tentativeNode.H = this_2.Manhattan(tentativeNode, this_2.Start);
                    this_2._rrasClosedSet[nodeKey] = tentativeNode;
                    if (!this_2._rrasOpenSet.some(function (x) { return x.Equals(tentativeNode); }))
                        this_2._rrasOpenSet.push(tentativeNode);
                }
            };
            var this_2 = this;
            for (var _b = 0, neighbors_1 = neighbors; _b < neighbors_1.length; _b++) {
                var neighbor = neighbors_1[_b];
                _loop_2(neighbor);
            }
        }
        return Number.POSITIVE_INFINITY;
    };
    Agent.prototype.Manhattan = function (a, b) {
        return Math.abs(a.X - b.X) + Math.abs(a.Y - b.Y);
    };
    Agent.prototype.Summarize = function () {
        this.FinishStep = 0;
        this.IsFinished = false;
        this.LastMoveStep = 0;
        if (this.Path.length > 0) {
            var lastPos = this.Path[this.Path.length - 1];
            this.IsFinished = lastPos.Equals(this.Goal);
            for (var i = this.Path.length - 1; i >= 0; i--) {
                if (!this.Path[i].Equals(this.Goal)) {
                    this.FinishStep = i + 1;
                    break;
                }
            }
            for (var i = this.Path.length - 1; i >= 0; i--) {
                if (!this.Path[i].Equals(lastPos)) {
                    this.LastMoveStep = i + 1;
                    break;
                }
            }
        }
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
                var score = this.CalculateRRAS(pos2);
                push();
                strokeWeight(1);
                textAlign("left", "top");
                text(score, pos2.X * cellWidth + 6, pos2.Y * cellHeight + 6);
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
            var _loop_3 = function (ix) {
                this_3[iy][ix] = chs[ix] != "#";
                if (/[a-z]/.test(chs[ix])) {
                    var agent = new Agent(this_3, chs[ix], ix, iy);
                    if (chs[ix] in goals)
                        agent.Goal = goals[chs[ix]];
                    this_3.Agents.push(agent);
                }
                else if (/[A-Z]/.test(chs[ix])) {
                    var name_1 = chs[ix].toLowerCase();
                    var agent = this_3.Agents.filter(function (x) { return x.Name == name_1; })[0];
                    if (agent)
                        agent.Goal = new Pos(ix, iy);
                    else
                        goals[name_1] = new Pos(ix, iy);
                }
            };
            var this_3 = this;
            for (var ix = 0; ix < chs.length; ix++) {
                _loop_3(ix);
            }
            this.Width = Math.max(this.Width, chs.length);
        }
        this.Height = lines.length;
        for (var _i = 0, _a = this.Agents; _i < _a.length; _i++) {
            var agent = _a[_i];
            if (!agent.Goal)
                agent.Goal = agent.Start;
        }
        for (var _b = 0, _c = this.Agents; _b < _c.length; _b++) {
            var agent = _c[_b];
            agent.CalculatePath();
        }
        for (var _d = 0, _e = this.Agents; _d < _e.length; _d++) {
            var agent = _e[_d];
            agent.Summarize();
        }
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
        var longestPath = Math.max.apply(Math, this.Agents.map(function (x) { return x.LastMoveStep; }));
        for (var _i = 0, _a = this.Agents; _i < _a.length; _i++) {
            var agent = _a[_i];
            agent.Render(this.CellWidth, this.CellHeight, percent * longestPath);
        }
        push();
        strokeWeight(1);
        textAlign("left", "top");
        textSize(16);
        noStroke();
        fill(255, 255, 255);
        text("Step: " + Math.round(percent * longestPath), 0, CANVAS_SIZE + 10);
        pop();
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
    Pos.prototype.Neighbors = function () {
        return [this.Up(), this.Down(), this.Left(), this.Right()];
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
    Pos.prototype.GetKey = function () {
        return this.X + "-" + this.Y;
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
var INIT_STATE = "\n##############\n#B....d##A####\n###..###c...a#\n#....######C##\n#D#...b#######\n#########.####\n#...G#eF...Ef#\n#.H###########\n#..h..g#..j..#\n########.###.#\n##.####i.K#k.#\n#m.lLM######I#\n##############\n";
var ROOT_GRID = new Grid(INIT_STATE);
var RENDERER;
var TIME_SLIDER;
var CANVAS_SIZE = 0;
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
    var cellSize = Math.min(CANVAS_SIZE / ROOT_GRID.Width, CANVAS_SIZE / ROOT_GRID.Height);
    ROOT_GRID.CellWidth = cellSize;
    ROOT_GRID.CellHeight = cellSize;
    ROOT_GRID.PosX = windowWidth / 2 - CANVAS_SIZE / 2;
    ROOT_GRID.PosY = (windowHeight - 50) / 2 - CANVAS_SIZE / 2;
    TIME_SLIDER.position(ROOT_GRID.PosX, ROOT_GRID.PosY + CANVAS_SIZE + 30);
    TIME_SLIDER.style("width", CANVAS_SIZE + "px");
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