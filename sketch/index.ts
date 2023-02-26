/// <reference path="./pos.ts" />
/// <reference path="./node.ts" />
/// <reference path="./neighbor.ts" />
/// <reference path="./agent.ts" />
/// <reference path="./grid.ts" />

const INIT_STATE =
`
##############
#B....d##A####
###..###c...a#
#....######C##
#D#...b#######
#########.####
#...G#eF...Ef#
#.H###########
#..h..g#..j..#
########.###.#
##.####i.K#k.#
#m.lLM######I#
##############
`;
const ROOT_GRID = new Grid(INIT_STATE);
let RENDERER: p5.Renderer;
let TIME_SLIDER: p5.Element;

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
    const canvasSize = Math.min(windowWidth - 20, windowHeight - 50);
    const cellSize = Math.min(canvasSize / ROOT_GRID.Width, canvasSize / ROOT_GRID.Height);
    ROOT_GRID.CellWidth = cellSize;
    ROOT_GRID.CellHeight = cellSize;
    ROOT_GRID.PosX = windowWidth / 2 - canvasSize / 2;
    ROOT_GRID.PosY = (windowHeight - 30) / 2 - canvasSize / 2;

    TIME_SLIDER.position(ROOT_GRID.PosX, ROOT_GRID.PosY + canvasSize + 10);
    TIME_SLIDER.style("width", `${canvasSize}px`);
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
