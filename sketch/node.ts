class NodePos extends Pos {
    public PrevNode: NodePos | undefined;
    public G: number = Number.POSITIVE_INFINITY;
    public H: number = Number.POSITIVE_INFINITY;
    public Step:number;

    public constructor(pos: Pos, step: number) {
        super(pos.X, pos.Y);
        this.Step = step;
    }

    public get F() {
        return this.G + this.H;
    }

    public GetNodeKey() {
        return `${this.X}-${this.Y}-${this.Step}`;
    }
}
