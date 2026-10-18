import { GAME_CONFIG as C } from "../config/gameConfig";

export interface CharacterStats {
  readonly speed: number;
  readonly rollCooldownSeconds: number;
  readonly treatSeconds: number;
  readonly shockedSeconds: number;
  readonly maxHealth: number;
  readonly itemSpawnSeconds: Readonly<{ min: number; max: number }>;
  readonly abilityDescription: string;
}

/** A fresh, immutable set of player-only stats; opponents never grant passives. */
export function characterStats(id: string): CharacterStats {
  const speed = C.player.speed * (id === "ragdoll_cat" ? 1.1 : 1);
  const rollCooldownSeconds = C.roll.cooldownSeconds - (id === "poodle" ? 3 : 0);
  const treatSeconds = C.items.treatSeconds + (id === "silver_cat" ? 3 : 0);
  const shockedSeconds = C.kick.shockedSeconds + (id === "tabby_cat" ? 1 : 0);
  const maxHealth = C.maxHealth + (id === "point_cat" ? 1 : 0);
  const itemBonus = id === "white_cat" ? 3 : 0;
  const itemSpawnSeconds = Object.freeze({ min: C.items.spawnSeconds.min - itemBonus, max: C.items.spawnSeconds.max - itemBonus });
  const descriptions: Record<string, string> = {
    silver_cat: `猫条无敌 ${treatSeconds} 秒（+3 秒）`,
    white_cat: `道具刷新 ${itemSpawnSeconds.min}–${itemSpawnSeconds.max} 秒（−3 秒）`,
    tabby_cat: `踢飞后震惊 ${shockedSeconds} 秒（+1 秒）`,
    point_cat: `生命上限 ${maxHealth} 颗（开局 ${C.initialHealth} 颗）`,
    poodle: `翻滚冷却 ${rollCooldownSeconds} 秒（−3 秒）`,
    ragdoll_cat: "移动速度 ×1.1",
  };
  return Object.freeze({ speed, rollCooldownSeconds, treatSeconds, shockedSeconds, maxHealth, itemSpawnSeconds,
    abilityDescription: descriptions[id] ?? "标准属性" });
}
