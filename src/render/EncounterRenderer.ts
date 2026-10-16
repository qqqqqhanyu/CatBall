import Phaser from "phaser";
import { CHARACTERS, type Character } from "../data/characters";
import { GAME_CONFIG as C } from "../config/gameConfig";
import type { Session } from "../systems/Session";
import type { arenaProjection } from "./projection";

type Layout = ReturnType<typeof arenaProjection>;

function rollTexture(character: Character): HTMLCanvasElement {
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 48;
  const ctx = canvas.getContext("2d")!;
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
    const d = Math.hypot(x - 23.5, y - 23.5);
    if (d > 23) continue;
    ctx.fillStyle = d > 20 ? "#102e55" : y > 32 ? "#167bc1" : x + y > 52 ? character.shade : character.fur;
    if (d < 19 && x > 12 && x < 19 && y > 7 && y < 15) ctx.fillStyle = "#fffbee";
    ctx.fillRect(x, y, 1, 1);
  }
  return canvas;
}

function fallbackTexture(type: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 80;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#17345c"; ctx.fillRect(10, 22, 60, 44);
  ctx.fillStyle = type === "BOAR" ? "#9c633d" : type === "DUCK" ? "#ffe19a" : type === "PUMPKIN" ? "#ff9b22" : "#58c8ed";
  ctx.fillRect(14, 26, 52, 36);
  if (type === "BOAR" || type === "DUCK") {
    ctx.fillStyle = type === "BOAR" ? "#e99c92" : "#ff9c27"; ctx.fillRect(53, 40, 22, 14);
    ctx.fillStyle = "#132945"; ctx.fillRect(49, 30, 7, 7);ctx.fillRect(20, 62, 12, 10);ctx.fillRect(49, 62, 12, 10);
  } else { ctx.fillStyle = type === "PUMPKIN" ? "#47914a" : "#fff6d8";ctx.fillRect(32, 12, 14, 22); }
  return canvas;
}

export class EncounterRenderer {
  private animal: Phaser.GameObjects.Image;
  private animalShadow: Phaser.GameObjects.Ellipse;
  private fly: Phaser.GameObjects.Image;
  private item: Phaser.GameObjects.Image;
  private itemShadow: Phaser.GameObjects.Ellipse;
  private itemLabel: Phaser.GameObjects.Text;
  private warning: Phaser.GameObjects.Text;
  private roll: Phaser.GameObjects.Image;
  private ghosts: Phaser.GameObjects.Image[];
  private effects: Phaser.GameObjects.Graphics;
  constructor(private scene: Phaser.Scene) {
    const texture = scene.textures.exists("encounters") ? scene.textures.get("encounters") : null;
    for (const [type, top, height] of [["DUCK", 60, 310], ["BOAR", 420, 300]] as const) {
      if (texture) for (let frame = 0; frame < 4; frame++) texture.add(`${type}-${frame}`, 0, frame * 362, top, 362, height);
      else scene.textures.addCanvas(`encounter-${type}`, fallbackTexture(type));
    }
    for (const [type, x] of [["PUMPKIN", 30], ["CAT_TREAT", 440]] as const) {
      if (texture) texture.add(type, 0, x, 765, type === "PUMPKIN" ? 280 : 230, 260);
      else scene.textures.addCanvas(`encounter-${type}`, fallbackTexture(type));
    }
    for (const character of CHARACTERS) {
      scene.textures.addCanvas(`roll-${character.id}`, rollTexture(character));
      scene.textures.get(`roll-${character.id}`).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    this.animal = scene.add.image(0, 0, "__WHITE").setOrigin(0.5, 1).setVisible(false);
    this.animalShadow = scene.add.ellipse(0, 0, 1, 1, 0x143452, 0.26).setDepth(1).setVisible(false);
    this.fly = scene.add.image(0, 0, "__WHITE").setVisible(false);
    this.item = scene.add.image(0, 0, "__WHITE").setVisible(false);
    this.itemShadow = scene.add.ellipse(0, 0, 1, 1, 0x143452, 0.2).setDepth(1).setVisible(false);
    const textStyle = { fontFamily: '"PingFang SC", system-ui, sans-serif', fontStyle: "bold", color: "#fff8df", stroke: "#123153", strokeThickness: 4 };
    this.itemLabel = scene.add.text(0, 0, "", textStyle).setOrigin(0.5).setVisible(false).setDepth(10000);
    this.warning = scene.add.text(0, 0, "", { ...textStyle, color: "#ffe174" }).setOrigin(0.5).setVisible(false).setDepth(10000);
    this.roll = scene.add.image(0, 0, "__WHITE").setVisible(false);
    this.ghosts = [0, 1].map(() => scene.add.image(0, 0, "__WHITE").setVisible(false).setDepth(2));
    this.effects = scene.add.graphics().setDepth(3);
  }
  private texture(image: Phaser.GameObjects.Image, type: string, frame = 0): void {
    image.setTexture(this.scene.textures.exists("encounters") ? "encounters" : `encounter-${type}`,
      this.scene.textures.exists("encounters") ? (type === "BOAR" || type === "DUCK" ? `${type}-${frame}` : type) : undefined);
  }
  draw(s: Session, l: Layout): void {
    const h = l.characterHeight;
    const g = this.effects.clear();
    const a = s.animals.animal;
    this.animal.setVisible(!!a); this.animalShadow.setVisible(!!a); this.warning.setVisible(!!a && (a.state === "WINDUP" || a.state === "DASH"));
    if (a) {
      const p = l.project(a.position);
      this.texture(this.animal, a.type, a.state === "WINDUP" ? 0 : Math.floor(a.distanceTravelled / 18) % 4);
      this.animal.setScale(h * (a.type === "BOAR" ? 0.8 : 0.68) / this.animal.height).setPosition(p.x, p.y)
        .setFlipX(Math.cos(a.heading) < 0).setDepth(p.y + 10).setTint(a.state === "DASH" ? 0xffe6bb : 0xffffff);
      this.animalShadow.setPosition(p.x, p.y).setSize(h * 0.68, h * 0.15);
      this.warning.setPosition(p.x, p.y - this.animal.displayHeight - h * 0.14).setFontSize(Math.max(13, h * 0.2))
        .setText(a.state === "WINDUP" ? "! 蓄力" : "冲刺!");
      if (a.state === "WINDUP" || a.state === "DASH") {
        const end = l.project({ x: a.position.x + Math.cos(a.heading) * 100, y: a.position.y + Math.sin(a.heading) * 100 });
        g.lineStyle(h * 0.045, a.state === "DASH" ? 0xff8d39 : 0xffdd64, 0.65);
        for (let i = 0; i < 3; i++) g.lineBetween(p.x + (end.x - p.x) * i / 3, p.y + (end.y - p.y) * i / 3,
          p.x + (end.x - p.x) * (i + 0.55) / 3, p.y + (end.y - p.y) * (i + 0.55) / 3);
      }
    }
    const fly = s.animals.kicked;
    this.fly.setVisible(!!fly);
    if (fly) {
      const progress = 0.15 + 0.85 * (1 - fly.remaining / C.animals.flySeconds);
      const p = l.project({ x: fly.origin.x + fly.direction.x * 170 * progress, y: fly.origin.y + fly.direction.y * 170 * progress });
      this.texture(this.fly, fly.type, 1);
      this.fly.setScale(h * 0.7 / this.fly.height).setPosition(p.x, p.y - h * (0.7 + Math.sin(progress * Math.PI) * 0.6))
        .setRotation(progress * Math.PI * 2).setAlpha(Math.min(1, fly.remaining / 0.2)).setDepth(10001);
    }
    const item = s.items.item;
    this.item.setVisible(!!item); this.itemShadow.setVisible(!!item); this.itemLabel.setVisible(!!item);
    if (item) {
      const p = l.project(item.position), size = h * 0.48;
      this.texture(this.item, item.type);
      this.item.setScale(size / this.item.height).setPosition(p.x, p.y - size * 0.45).setDepth(p.y + 8)
        .setAlpha(item.remaining < 2 && Math.floor(s.elapsed * 6) % 2 ? 0.5 : 1);
      this.itemShadow.setPosition(p.x, p.y).setSize(size * 0.85, size * 0.25);
      g.lineStyle(h * 0.025, item.type === "PUMPKIN" ? 0xffb64c : 0x8de8ff, 0.9).beginPath()
        .arc(p.x, p.y, size * 0.55, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * item.remaining / C.items.lifetimeSeconds).strokePath();
      this.itemLabel.setPosition(p.x, p.y + h * 0.19).setFontSize(Math.max(12, h * 0.17))
        .setText(`${item.type === "PUMPKIN" ? "+1 ♥" : "无敌 5s"} · ${Math.ceil(item.remaining)}s`);
    }
    const rolling = s.rollRemaining > 0;
    this.roll.setVisible(rolling); this.ghosts.forEach((image) => image.setVisible(rolling));
    const player = l.project(s.position);
    if (rolling) {
      const progress = 1 - s.rollRemaining / C.roll.durationSeconds;
      const size = h * 0.59;
      this.roll.setTexture(`roll-${s.playerId}`).setPosition(player.x, player.y - size * 0.4).setDisplaySize(size, size)
        .setRotation(progress * Math.PI * 3 * (s.rollDirection.x < 0 ? -1 : 1)).setDepth(player.y + 15);
      this.ghosts.forEach((image, index) => {
        const before = l.project({ x: s.position.x - s.rollDirection.x * (index + 1) * 13, y: s.position.y - s.rollDirection.y * (index + 1) * 13 });
        image.setTexture(`roll-${s.playerId}`).setPosition(before.x, before.y - size * 0.4).setDisplaySize(size, size).setRotation(this.roll.rotation).setAlpha(0.2 - index * 0.07);
      });
    }
    if (s.treatRemaining > 0) {
      g.lineStyle(h * 0.035, 0xffe477, 0.9).strokeEllipse(player.x, player.y - h * 0.43, h * 0.83, h * 1.07);
      const angle = s.elapsed * 3;
      for (let i = 0; i < 3; i++) {
        const a = angle + i * Math.PI * 2 / 3;
        g.fillStyle(0xffefab, 0.9).fillRect(player.x + Math.cos(a) * h * 0.5, player.y - h * 0.45 + Math.sin(a) * h * 0.48, h * 0.045, h * 0.045);
      }
    }
    if (s.lastKick && (s.kickRemaining > 0 || s.hitStopRemaining > 0)) {
      const direction = s.lastKick.direction;
      const target = l.project({ x: s.position.x + direction.x * 65, y: s.position.y + direction.y * 65 });
      const angle = Math.atan2(target.y - player.y, target.x - player.x);
      g.lineStyle(h * 0.05, s.lastKick.success ? 0xffd759 : 0xd4efff, 0.95).beginPath()
        .arc(player.x, player.y - h * 0.22, h * 0.66, angle - 0.65, angle + 0.65).strokePath();
    }
  }
  snapshot() {
    return { animal: { visible: this.animal.visible, texture: this.animal.texture.key, frame: this.animal.frame.name },
      item: { visible: this.item.visible, texture: this.item.texture.key, frame: this.item.frame.name }, rollVisible: this.roll.visible };
  }
}
