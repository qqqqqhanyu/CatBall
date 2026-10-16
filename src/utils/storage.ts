import { GAME_CONFIG } from "../config/gameConfig";
import { characterById } from "../data/characters";

export function readSelection(): string {
  try {
    return characterById(localStorage.getItem(GAME_CONFIG.storageKey)).id;
  } catch {
    return characterById(null).id;
  }
}

export function saveSelection(id: string): void {
  try {
    localStorage.setItem(GAME_CONFIG.storageKey, characterById(id).id);
  } catch {
    /* Private browsing or blocked storage must not prevent playing. */
  }
}

export interface Records { survivalSeconds: number; score: number }

export function readRecords(): Records {
  try {
    const saved = JSON.parse(localStorage.getItem(GAME_CONFIG.recordsKey) ?? "null");
    const valid = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;
    return {
      survivalSeconds: valid(saved?.survivalSeconds) ? saved.survivalSeconds : 0,
      score: valid(saved?.score) ? Math.floor(saved.score) : 0,
    };
  } catch { return { survivalSeconds: 0, score: 0 }; }
}

export function saveResult(survivalSeconds: number, score: number): Records {
  const previous = readRecords();
  const records = {
    survivalSeconds: Math.max(previous.survivalSeconds, survivalSeconds),
    score: Math.max(previous.score, score),
  };
  try { localStorage.setItem(GAME_CONFIG.recordsKey, JSON.stringify(records)); }
  catch { /* Results remain playable when storage is unavailable. */ }
  return records;
}
