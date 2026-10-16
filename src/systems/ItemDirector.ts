import { GAME_CONFIG as C } from "../config/gameConfig";
import { type Vec2 } from "../utils/geometry";
import type { Animal } from "./AnimalDirector";

export type ItemType = "PUMPKIN" | "CAT_TREAT";
export interface Item { type: ItemType; position: Vec2; remaining: number }

export class ItemDirector {
  item: Item | null = null;
  spawnRemaining: number;
  constructor(private random: () => number) { this.spawnRemaining = this.interval(); }
  private interval(): number { return C.items.spawnSeconds.min + this.random() * (C.items.spawnSeconds.max - C.items.spawnSeconds.min); }
  tick(seconds: number, player: Vec2, animal: Animal | null): void {
    if (this.item) {
      this.item.remaining = Math.max(0, this.item.remaining - seconds);
      if (this.item.remaining <= 1e-8) { this.item = null; this.spawnRemaining = this.interval(); }
      return;
    }
    this.spawnRemaining = Math.max(0, this.spawnRemaining - seconds);
    if (this.spawnRemaining > 1e-8) return;
    const c = C.court, margin = C.items.edgeMargin;
    for (let attempt = 0; attempt < 24; attempt++) {
      const position = { x: c.x + margin + this.random() * (c.width - 2 * margin), y: c.y + margin + this.random() * (c.height - 2 * margin) };
      if (Math.hypot(position.x - player.x, position.y - player.y) < C.items.playerClearance) continue;
      if (animal && Math.hypot(position.x - animal.position.x, position.y - animal.position.y) < animal.radius + C.items.animalClearance) continue;
      this.item = { type: this.random() < C.items.pumpkinChance ? "PUMPKIN" : "CAT_TREAT", position, remaining: C.items.lifetimeSeconds };
      return;
    }
    this.spawnRemaining = 0.5;
  }
  take(): ItemType | null {
    if (!this.item) return null;
    const type = this.item.type;
    this.item = null;
    this.spawnRemaining = this.interval();
    return type;
  }
  snapshot() {
    return { item: this.item ? { ...this.item, position: { ...this.item.position } } : null, itemSpawnRemaining: this.spawnRemaining };
  }
}
