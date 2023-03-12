/// <reference path="./pos.ts" />
/// <reference path="./node.ts" />
/// <reference path="./neighbor.ts" />
/// <reference path="./agent.ts" />
/// <reference path="./grid.ts" />

const INIT_STATE =
    `
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

const cells: Pos[] = [];
for (let iy = 13; iy <= 14; iy++)
    for (let ix = 12; ix <= 15; ix++)
        cells.push(new Pos(ix, iy));
for (let iy = 14; iy <= 16; iy++)
    for (let ix = 16; ix <= 19; ix++)
        cells.push(new Pos(ix, iy));
const goals: Pos[] = JSON.parse(JSON.stringify(cells));
cells.sort((a, b) => (Math.random() > .5) ? 1 : -1);
goals.sort((a, b) => (Math.random() > .5) ? 1 : -1);
let randomAgentNum = 0;
while (cells.length > 2 && goals.length > 2) {
    const start = cells.shift();
    const goal = goals.shift();
    ROOT_GRID.AddAgent("Random" + (++randomAgentNum), start.X, start.Y, goal.X, goal.Y);
}

ROOT_GRID.Calculate();

let RENDERER: p5.Renderer;
let TIME_SLIDER: p5.Element;
let CANVAS_SIZE: number = 0;

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
