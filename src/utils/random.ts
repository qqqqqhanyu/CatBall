export function pickOpponents<T extends { id: string }>(
  characters: readonly T[],
  selectedId: string,
  count: number,
  random: () => number = Math.random,
): T[] {
  const pool = characters.filter((character) => character.id !== selectedId);
  if (count > pool.length || count < 0)
    throw new RangeError("Invalid opponent count");
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

export function seededRandom(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
