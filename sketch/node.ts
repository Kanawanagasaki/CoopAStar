class NodePos extends Pos {
    public PrevNode: NodePos | undefined;
    public G: number = Number.POSITIVE_INFINITY;
    public H: number = Number.POSITIVE_INFINITY;

    public constructor(pos: Pos) {
        super(pos.X, pos.Y);
    }

    public get F() {
        return this.G + this.H;
    }

    public GetNodeKey() {
        return `${this.X}-${this.Y}`;
    }
}
