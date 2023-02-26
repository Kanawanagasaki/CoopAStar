class Neighbor extends Pos {
    public Score:number;

    public constructor(pos:Pos, score:number) {
        super(pos.X, pos.Y);
        this.Score = score;
    }
}