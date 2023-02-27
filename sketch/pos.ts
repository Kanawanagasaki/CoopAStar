class Pos {
    public X: number;
    public Y: number;

    public constructor(x: number, y: number) {
        this.X = x;
        this.Y = y;
    }

    public Equals(pos: Pos) {
        return this.X == pos.X && this.Y == pos.Y;
    }

    public Up() {
        return new Pos(this.X, this.Y - 1);
    }

    public Down() {
        return new Pos(this.X, this.Y + 1);
    }

    public Left() {
        return new Pos(this.X - 1, this.Y);
    }

    public Right() {
        return new Pos(this.X + 1, this.Y);
    }

    public Neighbors() {
        return [this.Up(), this.Down(), this.Left(), this.Right()];
    }
}