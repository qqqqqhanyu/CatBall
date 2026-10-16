import Phaser from "phaser";
import { GAME_CONFIG } from "../config/gameConfig";
import { CHARACTERS } from "../data/characters";
import { makeArenaCanvas } from "../render/arena";
import { makeCharacterSprite } from "../render/characterSprites";
import { arenaProjection } from "../render/projection";
import { BALL_COLORS, makeBallTexture } from "../render/projectiles";
import type { InputController } from "../systems/InputController";
import { CharacterAnimation } from "../systems/CharacterAnimation";
import { IDLE_WINDOWS, WALK_ATLASES, KICK_WINDOWS } from "../render/motionAssets";
import { Session } from "../systems/Session";
import { EncounterRenderer } from "../render/EncounterRenderer";
import { ExpressionOverlay } from "../ui/ExpressionOverlay";
import type { BubbleAnchor } from "../render/bubbleLayout";
import type { Rect } from "../utils/geometry";

export interface SceneOptions {
  session: Session;
  input: InputController;
  onUpdate: (session: Session) => void;
  expressionLayer?: HTMLElement;
}

interface PetView {
  id: string;
  image: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
  motion: CharacterAnimation;
}

export class GameScene extends Phaser.Scene {
  private player!: PetView;
  private background!: Phaser.GameObjects.Image;
  private ring!: Phaser.GameObjects.Ellipse;
  private effects!: Phaser.GameObjects.Graphics;
  private opponents: PetView[] = [];
  private balls = new Map<number, { image: Phaser.GameObjects.Image; shadow: Phaser.GameObjects.Ellipse }>();
  private layout = arenaProjection(1280, 720);
  private hasArtwork = false;
  private encounters!: EncounterRenderer;
  private expressions?: ExpressionOverlay;
  constructor(private options: SceneOptions) { super("Playground"); }

  private walkKey(id: string): string {
    return id === this.options.session.playerId ? "player-walk" : `walk-${id}`;
  }

  preload(): void {
    const base = `${import.meta.env.BASE_URL}assets/art/`;
    this.load.image("arena-desktop", `${base}arena-desktop-v2.webp`);
    this.load.image("arena-mobile", `${base}arena-mobile-v2.webp`);
    this.load.image("characters-idle", `${base}characters-idle-v3.webp`);
    this.load.image("encounters", `${base}animals-items-v1.webp`);
    this.load.image("characters-kick", `${base}characters-kick-v1.webp`);
    for (const id of [this.options.session.playerId, ...this.options.session.opponents])
      this.load.image(this.walkKey(id), `${base}${id}-walk-v1.webp`);
  }

  create(): void {
    this.textures.addCanvas("arena-fallback", makeArenaCanvas());
    this.hasArtwork = this.textures.exists("characters-idle");
    CHARACTERS.forEach((character, index) => {
      if (this.hasArtwork) {
        const [x, y, w, h] = IDLE_WINDOWS[index];
        this.textures.get("characters-idle").add(character.id, 0, x, y, w, h);
      } else this.textures.addCanvas(character.id, makeCharacterSprite(character, 0));
      if (this.textures.exists("characters-kick")) {
        const [x, y, width, height] = KICK_WINDOWS[index];
        this.textures.get("characters-kick").add(character.id, 0, x, y, width, height);
      }
      const key = this.walkKey(character.id);
      if (this.textures.exists(key)) {
        const atlas = WALK_ATLASES[character.id];
        for (let i = 0; i < CharacterAnimation.walkFrames; i++)
          this.textures.get(key).add(i, 0, atlas.columns[i], atlas.top, atlas.columns[i + 1] - atlas.columns[i], atlas.bottom - atlas.top);
      } else if (!this.hasArtwork) {
        for (let i = 0; i < CharacterAnimation.walkFrames; i++)
          this.textures.addCanvas(`fallback-${character.id}-${i}`, makeCharacterSprite(character, i));
      }
    });
    for (const type of ["NORMAL", "SPREAD", "GIANT"] as const) {
      this.textures.addCanvas(`ball-${type}`, makeBallTexture(type));
      this.textures.get(`ball-${type}`).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    this.background = this.add.image(0, 0, "arena-fallback").setOrigin(0).setDepth(-10);
    this.opponents = this.options.session.opponents.map((id) => this.makePet(id));
    this.ring = this.add.ellipse(0, 0, 1, 1).setDepth(2);
    this.player = this.makePet(this.options.session.playerId);
    this.encounters = new EncounterRenderer(this);
    if (this.options.expressionLayer) this.expressions = new ExpressionOverlay(this.options.expressionLayer);
    this.effects = this.add.graphics().setDepth(Number.MAX_SAFE_INTEGER);
    this.resize();
    this.scale.on("resize", this.resize, this);
    this.events.once("shutdown", () => { this.scale.off("resize", this.resize, this); this.expressions?.destroy(); });
    this.game.canvas.setAttribute("aria-label", "校园躲避球，使用左侧摇杆、WASD 或方向键移动并躲避来球");
    this.options.onUpdate(this.options.session);
  }

  private makePet(id: string): PetView {
    const index = CHARACTERS.findIndex((c) => c.id === id);
    return {
      id,
      image: this.add.image(0, 0, this.hasArtwork ? "characters-idle" : id, this.hasArtwork ? id : undefined)
        .setOrigin(this.hasArtwork ? IDLE_WINDOWS[index][4] : 0.5, 1),
      shadow: this.add.ellipse(0, 0, 1, 1, 0x14304a, 0.27).setDepth(1),
      motion: new CharacterAnimation(),
    };
  }

  private resize(): void {
    this.layout = arenaProjection(this.scale.width, this.scale.height);
    const l = this.layout;
    const key = l.mobile ? "arena-mobile" : "arena-desktop";
    if (this.textures.exists(key)) {
      this.background.setTexture(key).setPosition(l.x, l.y)
        .setDisplaySize(l.source.width * l.scale, l.source.height * l.scale);
    } else {
      this.background.setTexture("arena-fallback").setPosition(0, 0).setDisplaySize(this.scale.width, this.scale.height);
      l.project = (p) => ({ x: p.x * this.scale.width / GAME_CONFIG.width, y: p.y * this.scale.height / GAME_CONFIG.height });
    }
    for (const pet of [this.player, ...this.opponents])
      pet.shadow.setSize(l.characterHeight * 0.65, l.characterHeight * 0.16);
    this.ring.setSize(l.characterHeight * 0.75, l.characterHeight * 0.24)
      .setStrokeStyle(Math.max(2, l.characterHeight * 0.035), 0xffdc35);
    this.expressions?.resize();
    this.draw();
  }

  update(_time: number, delta: number): void {
    const { session: s, input } = this.options;
    const previous = { ...s.position };
    const opponentPositions = s.attacks.throwers.map((t) => ({ ...t.position }));
    const elapsed = s.elapsed;
    // Hit-stop ignores actions inside Session but retains held keys/the movement finger.
    input.setEnabled(s.phase === "PLAYING");
    s.tick(delta / 1000, input.vector(), input.consumeActions());
    input.setEnabled(s.phase === "PLAYING");
    const seconds = s.elapsed - elapsed;
    const frozen = s.phase === "PAUSED" || s.phase === "GAME_OVER" || s.hitStopRemaining > 0 || seconds === 0;
    this.player.motion.update(seconds, Math.hypot(s.position.x - previous.x, s.position.y - previous.y), frozen);
    this.opponents.forEach((pet, index) => {
      const t = s.attacks.throwers[index];
      const before = opponentPositions[index];
      pet.motion.update(seconds, t.windup ? 0 : Math.hypot(t.position.x - before.x, t.position.y - before.y), frozen);
    });
    this.options.onUpdate(s);
    this.draw();
  }

  animationSnapshot() {
    return {
      ...this.player.motion.snapshot(), texture: this.player.image.texture.key, atlasFrame: this.player.image.frame.name,
      opponents: this.opponents.map((p) => ({ id: p.id, ...p.motion.snapshot(), texture: p.image.texture.key, atlasFrame: p.image.frame.name })),
      playerState: this.options.session.playerState,
      encounters: this.encounters.snapshot(),
    };
  }

  private drawPet(pet: PetView, position: { x: number; y: number }, facingX: number): void {
    const pose = pet.motion.snapshot();
    const walkKey = this.walkKey(pet.id);
    const s = this.options.session;
    const kicking = pet.id === s.playerId && (s.kickRemaining > 0 || s.hitStopRemaining > 0);
    if (kicking && this.textures.exists("characters-kick")) {
      const window = KICK_WINDOWS[CHARACTERS.findIndex((c) => c.id === pet.id)];
      pet.image.setTexture("characters-kick", pet.id).setOrigin(window[4], window[5]);
    } else if (pose.state === "walk" && this.textures.exists(walkKey)) {
      const atlas = WALK_ATLASES[pet.id];
      pet.image.setTexture(walkKey, pose.frame).setOrigin(atlas.anchors[pose.frame] / pet.image.width, 1);
    } else if (pose.state === "walk" && !this.hasArtwork) {
      pet.image.setTexture(`fallback-${pet.id}-${pose.frame}`).setOrigin(0.5, 1);
    } else {
      const index = CHARACTERS.findIndex((c) => c.id === pet.id);
      pet.image.setTexture(this.hasArtwork ? "characters-idle" : pet.id, this.hasArtwork ? pet.id : undefined)
        .setOrigin(this.hasArtwork ? IDLE_WINDOWS[index][4] : 0.5, 1);
    }
    const p = this.layout.project(position);
    pet.image.setScale(this.layout.characterHeight / pet.image.height)
      .setPosition(p.x, p.y).setDepth(p.y + 10).setRotation(0);
    if (facingX) pet.image.setFlipX(facingX < 0);
    if (kicking) pet.image.setFlipX((s.lastKick?.direction.x ?? facingX) < 0);
    pet.shadow.setPosition(p.x, p.y);
  }

  private draw(): void {
    const s = this.options.session;
    const h = this.layout.characterHeight;
    const g = this.effects.clear();
    this.drawPet(this.player, s.position, s.facing.x);
    this.player.image.setVisible(s.rollRemaining <= 0);
    const player = this.layout.project(s.position);
    this.ring.setPosition(player.x, player.y);
    const hurtAge = s.lastHit ? s.elapsed - s.lastHit.at : Infinity;
    this.player.image.setAlpha(s.phase !== "GAME_OVER" && s.hurtRemaining > 0 && Math.floor(hurtAge * 12) % 2 === 1 ? 0.35 : 1);
    this.player.image.setTint(hurtAge < 0.12 ? 0xffa9a0 : 0xffffff);
    if (hurtAge < 0.32) {
      const radius = h * (0.22 + hurtAge * 1.2);
      g.lineStyle(Math.max(2, h * 0.035), 0xfff1a1, 1 - hurtAge / 0.32);
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        g.lineBetween(player.x + Math.cos(a) * radius, player.y - h * 0.35 + Math.sin(a) * radius,
          player.x + Math.cos(a) * (radius + h * 0.13), player.y - h * 0.35 + Math.sin(a) * (radius + h * 0.13));
      }
    }
    this.opponents.forEach((pet, index) => {
      const t = s.attacks.throwers[index];
      this.drawPet(pet, t.position, t.facing.x);
      if (t.windup) {
        const p = this.layout.project(t.position);
        const progress = 1 - t.windup.remaining / GAME_CONFIG.thrower.windupSeconds;
        const color = BALL_COLORS[t.windup.type];
        g.lineStyle(Math.max(3, h * 0.04), 0x123255, 0.9).strokeEllipse(p.x, p.y, h * 0.85, h * 0.27);
        g.lineStyle(Math.max(2, h * 0.03), color, 1).beginPath()
          .arc(p.x, p.y - h * 0.52, h * 0.57, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress).strokePath();
        // Type-colored windup marks, separate from M4 expression bubbles.
        const marks = t.windup.type === "SPREAD" ? 3 : 1;
        for (let i = 0; i < marks; i++) {
          const x = p.x + (i - (marks - 1) / 2) * h * 0.17;
          g.fillStyle(0x163456).fillRect(x - h * 0.055, p.y - h * 1.18, h * 0.11, h * 0.16);
          g.fillStyle(color).fillRect(x - h * 0.025, p.y - h * 1.15, h * 0.05, h * 0.1);
        }
      }
    });
    const live = new Set(s.projectiles.map((b) => b.projectileId));
    for (const [id, view] of this.balls) if (!live.has(id)) {
      view.image.destroy(); view.shadow.destroy(); this.balls.delete(id);
    }
    for (const ball of s.projectiles) {
      let view = this.balls.get(ball.projectileId);
      if (!view) {
        view = {
          image: this.add.image(0, 0, `ball-${ball.type}`),
          shadow: this.add.ellipse(0, 0, 1, 1, 0x123453, 0.24).setDepth(1),
        };
        this.balls.set(ball.projectileId, view);
      }
      const p = this.layout.project(ball.position);
      const edge = this.layout.project({ x: ball.position.x + ball.radius, y: ball.position.y });
      const radius = edge.x - p.x;
      view.image.setPosition(p.x, p.y - radius * 0.4).setDisplaySize(radius * 2, radius * 2).setDepth(p.y + 12);
      view.shadow.setPosition(p.x, p.y + radius * 0.5).setSize(radius * 1.7, radius * 0.65);
    }
    this.encounters.draw(s, this.layout);
    this.drawExpressions();
  }

  private drawExpressions(): void {
    const layer = this.options.expressionLayer;
    if (!layer || !this.expressions) return;
    const s = this.options.session;
    const scale = layer.clientWidth / this.scale.width;
    const height = this.layout.characterHeight * scale;
    const anchors: BubbleAnchor[] = [
      { id: s.playerId, ...this.layout.project(s.position), height, player: true },
      ...s.attacks.throwers.map((t) => ({ id: t.characterId, ...this.layout.project(t.position), height })),
    ].map((a) => ({ ...a, x: a.x * scale, y: a.y * scale }));
    const obstacles: Rect[] = anchors.map((a) => ({ x: a.x - height * 0.43, y: a.y - height, width: height * 0.86, height: height + 7 }));
    for (const ball of s.projectiles) {
      const p = this.layout.project(ball.position), edge = this.layout.project({ x: ball.position.x + ball.radius, y: ball.position.y });
      const radius = (edge.x - p.x) * scale + 3;
      obstacles.push({ x: p.x * scale - radius, y: p.y * scale - radius * 1.4, width: radius * 2, height: radius * 2.4 });
    }
    for (const position of [s.animals.animal?.position, s.items.item?.position, s.animals.kicked?.origin]) if (position) {
      const p = this.layout.project(position);
      obstacles.push({ x: p.x * scale - height * 0.55, y: p.y * scale - height, width: height * 1.1, height });
    }
    this.expressions.draw(s.expressionView().bubbles, anchors, obstacles, layer.clientWidth, layer.clientHeight);
  }
}
