export type Expression = "FOCUSED" | "CONFIDENT" | "HAPPY" | "SURPRISED";
export const EXPRESSION_NAMES: Record<Expression, string> = { FOCUSED: "专注", CONFIDENT: "自信", HAPPY: "开心", SURPRISED: "惊讶" };
export interface ExpressionContext {
  elapsed: number;
  opening: boolean;
  rolling: boolean;
  hitStop: boolean;
  shocked: boolean;
  dead: boolean;
}

/** Expression priority and bubble membership are deliberately separate. */
export class ExpressionSystem {
  private hit: { owner: string | null; until: number } | null = null;
  private kickUntil = 0;
  private pickup: { expression: Expression; until: number } | null = null;
  constructor(private player: string, private opponents: readonly string[]) {}
  onHit(owner: string | null, time: number): void { this.hit = { owner, until: time + 1 }; }
  onKick(time: number): void {
    this.kickUntil = time + 1.1;
    // A successful new kick replaces the preceding hit's visual event, not its immunity.
    this.hit = null;
    this.pickup = null;
  }
  onPickup(expression: Expression, time: number): void { this.pickup = { expression, until: time + 0.6 }; }

  view(c: ExpressionContext) {
    const activeHit = this.hit && this.hit.until > c.elapsed ? this.hit : null;
    const kicked = this.kickUntil > c.elapsed || c.hitStop;
    const pickup = this.pickup && this.pickup.until > c.elapsed ? this.pickup : null;
    const states: Record<string, Expression> = {};
    states[this.player] = c.dead || activeHit ? "SURPRISED" : kicked ? "CONFIDENT" : pickup?.expression ?? "FOCUSED";
    for (const id of this.opponents)
      states[id] = c.shocked || c.hitStop ? "SURPRISED" : activeHit?.owner === id ? "HAPPY" : "FOCUSED";
    let visible: string[] = [];
    if (!c.rolling && !c.dead) {
      if (c.opening) { visible = [this.player, ...this.opponents]; for (const id of visible) states[id] = "FOCUSED"; }
      else if (activeHit) visible = [this.player, ...(activeHit.owner && this.opponents.includes(activeHit.owner) ? [activeHit.owner] : [])];
      else if (kicked) visible = [this.player, ...this.opponents];
      else if (pickup) visible = [this.player];
    }
    return { states, bubbles: visible.map((characterId) => ({ characterId, expression: states[characterId] })) };
  }
}
