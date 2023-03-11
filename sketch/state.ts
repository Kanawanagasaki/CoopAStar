class State {
    public CoopPath: Record<number, Pos>[] = [];
    public CurrentPos: Record<number, Pos> = {};
    public FinishedAgents: Record<number, Pos> = {};

    public Push() {
        const step: Record<number, Pos> = {};
        for (const id in this.CurrentPos)
            step[id] = this.CurrentPos[id];
        this.CoopPath.push(step);
    }

    public PushFromState(state: State) {
        for (const stateStep of state.CoopPath) {
            const step: Record<number, Pos> = {};
            for (const id in stateStep)
                step[id] = stateStep[id];
            this.CoopPath.push(step);
        }
        this.CurrentPos = state.CurrentPos;
    }

    public PushFromStateReverse(state: State, agentId1: number, agentId2: number) {
        for (let i = state.CoopPath.length - 1; 0 <= i; i--) {
            const stateStep = state.CoopPath[i];
            const step: Record<number, Pos> = {};
            for (const id in stateStep) {
                if (id == agentId1.toString())
                    step[id] = stateStep[agentId2];
                else if (id == agentId2.toString())
                    step[id] = stateStep[agentId1];
                else
                    step[id] = stateStep[id];
            }
            this.CoopPath.push(step);

            const copy: Record<number, Pos> = {};
            for (const id in step)
                copy[id] = step[id];
            this.CurrentPos = copy;
        }
    }

    public GetAgentPos(agent: Agent) {
        return this.CurrentPos[agent.Id];
    }

    public GetAgentIdAtPos(pos: Pos) {
        for (const id in this.CurrentPos)
            if (this.CurrentPos[id].Equals(pos))
                return id;
        return false;
    }

    public GetFinishedPositions() {
        return Object.values(this.FinishedAgents);
    }

    public GetCurrentPosShallowCopy() {
        const copy: Record<number, Pos> = {};
        for (const id in this.CurrentPos)
            copy[id] = this.CurrentPos[id];
        return copy;
    }
}