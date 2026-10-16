import { GAME_CONFIG as C } from "../config/gameConfig";
import { clamp, type Vec2 } from "../utils/geometry";
import { difficultyAt } from "./DifficultyDirector";

export type AnimalType = "DUCK" | "BOAR";
export type AnimalState = "CHASE" | "WINDUP" | "DASH" | "RECOVER";
export interface Animal {
  id: number;
  type: AnimalType;
  position: Vec2;
  heading: number;
  speed: number;
  radius: number;
  state: AnimalState;
  stateRemaining: number;
  distanceTravelled: number;
}
export interface KickedAnimal {
  type: AnimalType;
  origin: Vec2;
  direction: Vec2;
  remaining: number;
}

export function turnToward(current: number, target: number, maxRadians: number): number {
  const difference = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + clamp(difference, -maxRadians, maxRadians);
}

export class AnimalDirector {
  animal: Animal | null = null;
  kicked: KickedAnimal | null = null;
  spawnRemaining: number;
  private sequence = 0;
  constructor(private random: () => number) {
    this.spawnRemaining = this.range(C.animals.firstSpawn.min, C.animals.firstSpawn.max);
  }
  private range(min: number, max: number): number { return min + (max - min) * this.random(); }

  tick(seconds: number, elapsed: number, player: Vec2): void {
    if (this.kicked) {
      this.kicked.remaining = Math.max(0, this.kicked.remaining - seconds);
      if (this.kicked.remaining === 0) this.kicked = null;
    }
    if (!this.animal) {
      this.spawnRemaining = Math.max(0, this.spawnRemaining - seconds);
      if (this.spawnRemaining <= 1e-8) this.spawn(player);
      return;
    }
    const a = this.animal, config = C.animals[a.type];
    a.stateRemaining -= seconds;
    if (a.stateRemaining <= 1e-8) {
      if (a.state === "CHASE") { a.state = "WINDUP"; a.stateRemaining = C.animals.windupSeconds; }
      else if (a.state === "WINDUP") { a.state = "DASH"; a.stateRemaining = config.dashSeconds; }
      else if (a.state === "DASH") { a.state = "RECOVER"; a.stateRemaining = C.animals.recoverSeconds; }
      else { a.state = "CHASE"; a.stateRemaining = this.range(C.animals.chaseSeconds.min, C.animals.chaseSeconds.max); }
    }
    const target = Math.atan2(player.y - a.position.y, player.x - a.position.x);
    const turnRate = a.state === "DASH" ? config.dashTurnDegrees : config.turnDegrees;
    // Even during a dash and player immunity, both animals keep tracking the player.
    a.heading = turnToward(a.heading, target, turnRate * Math.PI / 180 * seconds);
    const multiplier = Math.min(C.animals.maxSpeedMultiplier, difficultyAt(elapsed).speedMultiplier);
    const base = a.state === "DASH" ? config.dashSpeed : config.speed;
    const stateScale = a.state === "WINDUP" ? 0.15 : a.state === "RECOVER" ? 0.45 : 1;
    a.speed = base * multiplier * stateScale;
    const next = this.clampPosition({ x: a.position.x + Math.cos(a.heading) * a.speed * seconds, y: a.position.y + Math.sin(a.heading) * a.speed * seconds }, a.radius);
    a.distanceTravelled += Math.hypot(next.x - a.position.x, next.y - a.position.y);
    a.position = next;
  }

  private spawn(player: Vec2): void {
    const type: AnimalType = this.random() < 0.5 ? "BOAR" : "DUCK";
    const radius = C.animals[type].radius;
    const c = C.court;
    const entrances: Vec2[] = [
      { x: c.x + c.width * 0.25, y: c.y + radius }, { x: c.x + c.width * 0.75, y: c.y + radius },
      { x: c.x + c.width - radius, y: c.y + c.height * 0.25 }, { x: c.x + c.width - radius, y: c.y + c.height * 0.75 },
      { x: c.x + c.width * 0.25, y: c.y + c.height - radius }, { x: c.x + c.width * 0.75, y: c.y + c.height - radius },
      { x: c.x + radius, y: c.y + c.height * 0.25 }, { x: c.x + radius, y: c.y + c.height * 0.75 },
    ];
    const safe = entrances.filter((p) => Math.hypot(p.x - player.x, p.y - player.y) >= C.animals.spawnClearance);
    if (!safe.length) { this.spawnRemaining = 0.25; return; }
    const position = safe[Math.floor(this.random() * safe.length)];
    this.animal = {
      id: ++this.sequence, type, position, radius,
      heading: Math.atan2(player.y - position.y, player.x - position.x),
      speed: C.animals[type].speed, state: "CHASE",
      stateRemaining: this.range(C.animals.chaseSeconds.min, C.animals.chaseSeconds.max), distanceTravelled: 0,
    };
  }

  kick(player: Vec2, facing: Vec2, elapsed: number): boolean {
    const a = this.animal;
    if (!a || Math.hypot(a.position.x - player.x, a.position.y - player.y) > C.kick.range) return false;
    const dx = a.position.x - player.x, dy = a.position.y - player.y;
    const length = Math.hypot(dx, dy);
    this.kicked = { type: a.type, origin: { ...a.position }, direction: length > 1e-8 ? { x: dx / length, y: dy / length } : { ...facing }, remaining: C.animals.flySeconds };
    this.animal = null;
    const stage = C.difficulty.stages.findIndex((entry) => entry.from === difficultyAt(elapsed).from);
    this.spawnRemaining = C.animals.respawnSeconds[stage] * this.range(0.75, 1.25);
    return true;
  }

  repel(player: Vec2): void {
    if (!this.animal) return;
    const a = this.animal;
    const dx = a.position.x - player.x, dy = a.position.y - player.y;
    const length = Math.hypot(dx, dy);
    const direction = length > 1e-8 ? { x: dx / length, y: dy / length } : { x: -Math.cos(a.heading), y: -Math.sin(a.heading) };
    a.position = this.clampPosition({ x: a.position.x + direction.x * C.animals.contactPushback, y: a.position.y + direction.y * C.animals.contactPushback }, a.radius);
  }
  private clampPosition(position: Vec2, radius: number): Vec2 {
    const c = C.court;
    return { x: clamp(position.x, c.x + radius, c.x + c.width - radius), y: clamp(position.y, c.y + radius, c.y + c.height - radius) };
  }
  snapshot() {
    return {
      animal: this.animal ? { ...this.animal, position: { ...this.animal.position } } : null,
      kickedAnimal: this.kicked ? { ...this.kicked, origin: { ...this.kicked.origin }, direction: { ...this.kicked.direction } } : null,
      animalSpawnRemaining: this.spawnRemaining,
    };
  }
}
