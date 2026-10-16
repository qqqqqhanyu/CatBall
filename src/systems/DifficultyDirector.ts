import { GAME_CONFIG } from "../config/gameConfig";

export type ProjectileType = "NORMAL" | "SPREAD" | "GIANT";

export function difficultyAt(elapsed: number) {
  const c = GAME_CONFIG.difficulty;
  const time = Math.max(0, elapsed);
  const stage = [...c.stages].reverse().find((entry) => time >= entry.from)!;
  const earlySteps = Math.floor(Math.min(time, 180) / c.speedStepSeconds);
  const lateSteps = Math.floor(Math.max(0, time - 180) / c.speedStepSeconds);
  const speedMultiplier = Math.min(
    c.maxSpeedMultiplier,
    Math.min(c.earlySpeedCap, c.speedGrowth ** earlySteps) + lateSteps * c.lateSpeedStep,
  );
  return { ...stage, speedMultiplier };
}

export function attackInterval(elapsed: number, random: () => number): number {
  const jitter = GAME_CONFIG.difficulty.intervalJitter;
  return difficultyAt(elapsed).interval * (1 - jitter + 2 * jitter * random());
}

export function chooseProjectile(elapsed: number, random: () => number): ProjectileType {
  if (random() >= difficultyAt(elapsed).specialChance) return "NORMAL";
  return random() < 0.5 ? "SPREAD" : "GIANT";
}
