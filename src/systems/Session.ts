import { GAME_CONFIG as C } from "../config/gameConfig";
import { CHARACTERS } from "../data/characters";
import { capVector, moveWithinCourt, sweptCircleContact, type Vec2 } from "../utils/geometry";
import { pickOpponents, seededRandom } from "../utils/random";
import { AttackDirector, type Projectile } from "./AttackDirector";
import { AnimalDirector } from "./AnimalDirector";
import { ItemDirector, type ItemType } from "./ItemDirector";
import { ExpressionSystem } from "./ExpressionSystem";

export type SessionPhase = "COUNTDOWN" | "PLAYING" | "PAUSED" | "GAME_OVER";
export interface PlayerActions { kick?: boolean; roll?: boolean }

/** Pure fixed-world state. All gameplay clocks advance here, never in browser timers. */
export class Session {
  phase: SessionPhase = "COUNTDOWN";
  private resumePhase: Exclude<SessionPhase, "PAUSED"> = "COUNTDOWN";
  countdown: number = C.countdownSeconds;
  elapsed = 0;
  position: Vec2 = { x: C.width / 2, y: C.court.y + C.court.height / 2 };
  facing: Vec2 = { x: 0, y: -1 };
  moving = false;
  health: number = C.maxHealth;
  hurtRemaining = 0;
  treatRemaining = 0;
  rollRemaining = 0;
  rollCooldown = 0;
  rollDirection: Vec2 = { x: 0, y: -1 };
  kickCooldown = 0;
  kickRemaining = 0;
  kickCount = 0;
  hitStopRemaining = 0;
  shockedRemaining = 0;
  hitCount = 0;
  lastHit: { source: "BALL" | "ANIMAL"; ownerCharacterId: string | null; projectileId: number | null; at: number } | null = null;
  lastPickup: { type: ItemType; at: number } | null = null;
  lastKick: { at: number; success: boolean; direction: Vec2 } | null = null;
  projectiles: Projectile[] = [];
  readonly attacks: AttackDirector;
  readonly animals: AnimalDirector;
  readonly items: ItemDirector;
  readonly expressions: ExpressionSystem;
  readonly opponents: string[];

  get score(): number { return Math.floor(this.elapsed + 1e-8) * 10 + this.kickCount * C.kick.points; }
  get isInvulnerable(): boolean { return this.rollRemaining > 1e-8 || this.hurtRemaining > 1e-8 || this.treatRemaining > 1e-8; }
  get playerState(): string {
    return this.phase === "GAME_OVER" ? "DEAD" : this.rollRemaining > 0 ? "ROLLING" : this.kickRemaining > 0 ? "KICKING"
      : this.hurtRemaining > 0 ? "HURT_INVULNERABLE" : this.treatRemaining > 0 ? "TREAT_INVULNERABLE" : "NORMAL";
  }
  expressionView() {
    return this.expressions.view({ elapsed: this.elapsed, opening: this.phase === "COUNTDOWN" || this.elapsed < C.goSeconds,
      rolling: this.rollRemaining > 1e-8, hitStop: this.hitStopRemaining > 0, shocked: this.shockedRemaining > 0, dead: this.phase === "GAME_OVER" });
  }

  constructor(readonly playerId: string, random: () => number = Math.random) {
    this.opponents = pickOpponents(CHARACTERS, playerId, C.thrower.count, random).map((c) => c.id);
    this.attacks = new AttackDirector(this.opponents, random);
    // Derive independent streams from the opening draw without consuming the projectile RNG.
    const opening = JSON.stringify({ playerId, opponents: this.opponents, attacks: this.attacks.snapshot() });
    let seed = 2166136261;
    for (const character of opening) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619);
    this.animals = new AnimalDirector(seededRandom(seed ^ 0x51a3));
    this.items = new ItemDirector(seededRandom(seed ^ 0x71b5));
    this.expressions = new ExpressionSystem(playerId, this.opponents);
  }

  tick(delta: number, input: Vec2, actions: PlayerActions = {}): void {
    if (this.phase === "PAUSED" || this.phase === "GAME_OVER" || !Number.isFinite(delta) || delta <= 0) return;
    const seconds = Math.min(delta, C.maxDeltaSeconds);
    if (this.phase === "COUNTDOWN") {
      // Presentation clocks follow elapsed frame time even on a slow renderer.
      // Physics below keeps its short-step cap to avoid jumps after stalls.
      this.countdown = Math.max(0, this.countdown - delta);
      if (this.countdown <= 1e-6) { this.countdown = 0; this.phase = "PLAYING"; }
      return;
    }
    if (this.hitStopRemaining > 0) {
      // Presentation time alone advances; game time, cooldowns, NPCs and items stay frozen.
      this.hitStopRemaining = Math.max(0, this.hitStopRemaining - delta);
      if (this.hitStopRemaining <= 1e-8) { this.hitStopRemaining = 0; this.shockedRemaining = C.kick.shockedSeconds; }
      return;
    }
    const direction = capVector(input);
    if (direction.x || direction.y) this.facing = direction;
    if (actions.roll && this.rollCooldown <= 1e-8 && this.rollRemaining <= 1e-8) {
      const length = Math.hypot(this.facing.x, this.facing.y) || 1;
      this.rollDirection = { x: this.facing.x / length, y: this.facing.y / length };
      this.rollRemaining = C.roll.durationSeconds;
      this.rollCooldown = C.roll.cooldownSeconds;
      this.kickRemaining = 0;
    } else if (!actions.roll && actions.kick && this.rollRemaining <= 1e-8 && this.kickCooldown <= 1e-8) {
      this.kickCooldown = C.kick.cooldownSeconds;
      this.kickRemaining = C.kick.poseSeconds;
      const target = this.animals.animal?.position;
      const aim = target ? { x: target.x - this.position.x, y: target.y - this.position.y } : this.facing;
      const length = Math.hypot(aim.x, aim.y) || 1;
      const kickDirection = { x: aim.x / length, y: aim.y / length };
      const success = this.animals.kick(this.position, this.facing, this.elapsed);
      this.lastKick = { at: this.elapsed, success, direction: kickDirection };
      if (success) {
        this.kickCount++;
        this.expressions.onKick(this.elapsed);
        this.hitStopRemaining = C.kick.hitStopSeconds;
        this.moving = false;
        return;
      }
    }
    let immuneAtStart = Math.max(this.hurtRemaining, this.treatRemaining, this.rollRemaining);
    const shockAtStart = this.shockedRemaining;
    const rollStep = Math.min(seconds, this.rollRemaining);
    this.elapsed += seconds;
    this.hurtRemaining = Math.max(0, this.hurtRemaining - seconds);
    this.treatRemaining = Math.max(0, this.treatRemaining - seconds);
    this.rollCooldown = Math.max(0, this.rollCooldown - seconds);
    this.kickCooldown = Math.max(0, this.kickCooldown - seconds);
    this.kickRemaining = Math.max(0, this.kickRemaining - seconds);
    this.shockedRemaining = Math.max(0, this.shockedRemaining - seconds);
    const previousPlayer = this.position;
    this.position = rollStep > 0
      ? moveWithinCourt(this.position, this.rollDirection, rollStep, C.roll.distance / C.roll.durationSeconds, C.court, C.player.radius)
      : moveWithinCourt(this.position, direction, seconds, C.player.speed, C.court, C.player.radius);
    this.rollRemaining = Math.max(0, this.rollRemaining - seconds);
    if (this.rollRemaining < 1e-8) this.rollRemaining = 0;
    this.moving = Math.hypot(this.position.x - previousPlayer.x, this.position.y - previousPlayer.y) > 0.001;

    const previousAnimal = this.animals.animal ? { ...this.animals.animal.position } : null;
    this.animals.tick(seconds, this.elapsed, this.position);
    this.items.tick(seconds, this.position, this.animals.animal);
    const item = this.items.item;
    if (item && sweptCircleContact(previousPlayer, this.position, item.position, item.position, C.player.radius + C.items.radius) !== null) {
      const type = this.items.take()!;
      this.lastPickup = { type, at: this.elapsed };
      if (type === "PUMPKIN") this.health = Math.min(C.maxHealth, this.health + 1);
      else { this.treatRemaining = C.items.treatSeconds; immuneAtStart = Math.max(immuneAtStart, C.items.treatSeconds); }
      this.expressions.onPickup(type === "PUMPKIN" ? "HAPPY" : "CONFIDENT", this.elapsed);
    }
    this.moveAndCollide(seconds, previousPlayer, previousAnimal, immuneAtStart);
    if (this.health <= 0) { this.phase = "GAME_OVER"; this.moving = false; return; }
    const attackRate = 1 - 0.5 * Math.min(seconds, shockAtStart) / seconds;
    this.projectiles.push(...this.attacks.tick(seconds, this.elapsed, this.position, this.projectiles.length, attackRate));
  }

  private moveAndCollide(seconds: number, previousPlayer: Vec2, previousAnimal: Vec2 | null, immuneAtStart: number): void {
    let hit: Projectile | "ANIMAL" | null = null;
    let firstContact = Infinity;
    const vulnerableFrom = Math.min(1, immuneAtStart / seconds);
    const interpolate = (start: Vec2, end: Vec2): Vec2 => ({ x: start.x + (end.x - start.x) * vulnerableFrom, y: start.y + (end.y - start.y) * vulnerableFrom });
    const contactWith = (before: Vec2, after: Vec2, radius: number) => vulnerableFrom >= 1 - 1e-8 ? null
      : sweptCircleContact(interpolate(before, after), after, interpolate(previousPlayer, this.position), this.position, radius + C.player.radius);
    for (const ball of this.projectiles) {
      const before = ball.position;
      ball.position = { x: before.x + ball.velocity.x * seconds, y: before.y + ball.velocity.y * seconds };
      const contact = contactWith(before, ball.position, ball.radius);
      if (contact !== null && contact < firstContact) { hit = ball; firstContact = contact; }
    }
    const animal = this.animals.animal;
    if (animal) {
      const contact = contactWith(previousAnimal ?? animal.position, animal.position, animal.radius);
      if (contact !== null && contact < firstContact) hit = "ANIMAL";
    }
    if (hit) {
      this.health--; this.hitCount++; this.hurtRemaining = C.hurtInvulnerabilitySeconds;
      const owner = hit === "ANIMAL" ? null : hit.ownerCharacterId;
      this.lastHit = { source: hit === "ANIMAL" ? "ANIMAL" : "BALL", ownerCharacterId: owner, projectileId: hit === "ANIMAL" ? null : hit.projectileId, at: this.elapsed };
      this.expressions.onHit(owner, this.elapsed);
      if (hit === "ANIMAL") this.animals.repel(this.position);
    }
    const buffer = C.projectiles.exitBuffer;
    this.projectiles = this.projectiles.filter((ball) => {
      const { x, y } = ball.position;
      return ball !== hit && x >= -buffer - ball.radius && x <= C.width + buffer + ball.radius
        && y >= -buffer - ball.radius && y <= C.height + buffer + ball.radius;
    });
  }

  pause(): void {
    if (this.phase === "PAUSED" || this.phase === "GAME_OVER") return;
    this.resumePhase = this.phase; this.phase = "PAUSED"; this.moving = false;
  }
  resume(): void { if (this.phase === "PAUSED") this.phase = this.resumePhase; }
  snapshot() {
    return {
      phase: this.phase, countdown: this.countdown, elapsed: this.elapsed, playerId: this.playerId, opponents: [...this.opponents],
      position: { ...this.position }, facing: { ...this.facing }, health: this.health, score: this.score,
      hurtRemaining: this.hurtRemaining, treatRemaining: this.treatRemaining, rollRemaining: this.rollRemaining,
      rollCooldown: this.rollCooldown, rollDirection: { ...this.rollDirection }, kickCooldown: this.kickCooldown, kickRemaining: this.kickRemaining,
      kickCount: this.kickCount, hitStopRemaining: this.hitStopRemaining, shockedRemaining: this.shockedRemaining,
      playerState: this.playerState, isInvulnerable: this.isInvulnerable, expressions: this.expressionView(),
      hitCount: this.hitCount, lastHit: this.lastHit ? { ...this.lastHit } : null, lastPickup: this.lastPickup ? { ...this.lastPickup } : null,
      lastKick: this.lastKick ? { ...this.lastKick, direction: { ...this.lastKick.direction } } : null,
      projectiles: this.projectiles.map((ball) => ({ ...ball, position: { ...ball.position }, velocity: { ...ball.velocity } })),
      ...this.attacks.snapshot(), ...this.animals.snapshot(), ...this.items.snapshot(),
    };
  }
}
