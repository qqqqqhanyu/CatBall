import { GAME_CONFIG as C } from "../config/gameConfig";
import { perimeterPosition, type Vec2 } from "../utils/geometry";
import { attackInterval, chooseProjectile, difficultyAt, type ProjectileType } from "./DifficultyDirector";

export interface Projectile {
  projectileId: number;
  ownerCharacterId: string;
  type: ProjectileType;
  position: Vec2;
  velocity: Vec2;
  radius: number;
}

export interface Thrower {
  characterId: string;
  distance: number;
  direction: number;
  turnRemaining: number;
  position: Vec2;
  facing: Vec2;
  moving: boolean;
  windup: { type: ProjectileType; remaining: number } | null;
}

export function launchProjectiles(
  owner: string, origin: Vec2, target: Vec2, type: ProjectileType,
  multiplier: number, nextId: () => number,
): Projectile[] {
  const angle = Math.atan2(target.y - origin.y, target.x - origin.x);
  const spread = C.projectiles.spreadDegrees * Math.PI / 180;
  const offsets = type === "SPREAD" ? [-spread, 0, spread] : [0];
  return offsets.map((offset) => ({
    projectileId: nextId(), ownerCharacterId: owner, type,
    position: { ...origin }, radius: C.projectiles[type].radius,
    velocity: {
      x: Math.cos(angle + offset) * C.projectiles[type].speed * multiplier,
      y: Math.sin(angle + offset) * C.projectiles[type].speed * multiplier,
    },
  }));
}

/** One global scheduler: no per-character firing timers and no catch-up bursts. */
export class AttackDirector {
  readonly throwers: Thrower[];
  private nextAttack: number;
  private pending: Thrower | null = null;
  private lastGiantOwner: string | null = null;
  private projectileSequence = 0;
  attacksFired = 0;

  constructor(ids: readonly string[], private random: () => number) {
    const { width: w, height: h } = C.thrower.track;
    const starts = [w / 2, w + h / 2, w * 1.5 + h, 2 * w + h * 1.5];
    this.throwers = ids.map((characterId, index) => ({
      characterId, distance: starts[index],
      direction: random() < 0.5 ? -1 : 1,
      turnRemaining: this.turnInterval(),
      position: perimeterPosition(starts[index], C.thrower.track),
      facing: { x: index === 1 ? -1 : 1, y: 0 },
      moving: false, windup: null,
    }));
    this.nextAttack = attackInterval(0, random);
  }

  private turnInterval(): number {
    const { min, max } = C.thrower.turnSeconds;
    return min + (max - min) * this.random();
  }

  tick(seconds: number, elapsed: number, player: Vec2, activeCount: number, rate = 1): Projectile[] {
    // Shock slows movement, windup and the global clock together. Existing balls are independent.
    seconds *= rate;
    this.moveThrowers(seconds);
    this.nextAttack -= seconds;
    if (this.pending) {
      const owner = this.pending;
      const windup = owner.windup!;
      windup.remaining = Math.max(0, windup.remaining - seconds);
      const needed = windup.type === "SPREAD" ? 3 : 1;
      if (windup.remaining > 1e-8 || activeCount + needed > C.projectiles.maxActive) return [];
      const balls = launchProjectiles(
        owner.characterId, owner.position, player, windup.type,
        difficultyAt(elapsed).speedMultiplier, () => ++this.projectileSequence,
      );
      if (windup.type === "GIANT") this.lastGiantOwner = owner.characterId;
      owner.facing = { x: player.x - owner.position.x, y: player.y - owner.position.y };
      owner.windup = null;
      this.pending = null;
      this.attacksFired++;
      // A full field postpones the shot, never banks overdue attacks.
      if (this.nextAttack <= 0) this.nextAttack = attackInterval(elapsed, this.random);
      return balls;
    }
    if (this.nextAttack > 1e-8) return [];
    const type = chooseProjectile(elapsed, this.random);
    const eligible = this.throwers.filter((t) => type !== "GIANT" || t.characterId !== this.lastGiantOwner);
    const owner = eligible[Math.floor(this.random() * eligible.length)];
    owner.windup = { type, remaining: C.thrower.windupSeconds };
    owner.moving = false;
    owner.facing = { x: player.x - owner.position.x, y: player.y - owner.position.y };
    this.pending = owner;
    this.nextAttack = attackInterval(elapsed, this.random);
    return [];
  }

  private moveThrowers(seconds: number): void {
    const track = C.thrower.track;
    const perimeter = 2 * (track.width + track.height);
    for (const t of this.throwers) {
      t.moving = false;
      if (t.windup) continue;
      t.turnRemaining -= seconds;
      if (t.turnRemaining <= 0) {
        t.direction = this.random() < 0.5 ? -1 : 1;
        t.turnRemaining = this.turnInterval();
      }
      const next = (t.distance + t.direction * C.thrower.speed * seconds + perimeter) % perimeter;
      const blocked = this.throwers.some((other) => {
        if (other === t) return false;
        const gap = Math.abs(next - other.distance);
        return Math.min(gap, perimeter - gap) < C.thrower.minSeparation;
      });
      if (blocked) { t.direction *= -1; continue; }
      const position = perimeterPosition(next, track);
      t.facing = { x: position.x - t.position.x, y: position.y - t.position.y };
      t.position = position;
      t.distance = next;
      t.moving = true;
    }
  }

  snapshot() {
    return {
      nextAttack: this.nextAttack, attacksFired: this.attacksFired,
      throwers: this.throwers.map((t) => ({ ...t, position: { ...t.position }, facing: { ...t.facing }, windup: t.windup ? { ...t.windup } : null })),
    };
  }
}
