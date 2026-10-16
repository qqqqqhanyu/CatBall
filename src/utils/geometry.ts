export interface Vec2 {
  x: number;
  y: number;
}
export interface Rect extends Vec2 {
  width: number;
  height: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

export function capVector(input: Vec2): Vec2 {
  const length = Math.hypot(input.x, input.y);
  if (!Number.isFinite(length) || length === 0) return { x: 0, y: 0 };
  return length > 1
    ? { x: input.x / length, y: input.y / length }
    : { ...input };
}

export function moveWithinCourt(
  position: Vec2,
  input: Vec2,
  seconds: number,
  speed: number,
  court: Rect,
  radius: number,
): Vec2 {
  const direction = capVector(input);
  return {
    x: clamp(
      position.x + direction.x * speed * seconds,
      court.x + radius,
      court.x + court.width - radius,
    ),
    y: clamp(
      position.y + direction.y * speed * seconds,
      court.y + radius,
      court.y + court.height - radius,
    ),
  };
}

/** The same fixed world is used on all viewports; only the display scale changes. */
export function perimeterPosition(distance: number, rect: Rect): Vec2 {
  const perimeter = 2 * (rect.width + rect.height);
  let s = ((distance % perimeter) + perimeter) % perimeter;
  if (s < rect.width) return { x: rect.x + s, y: rect.y };
  s -= rect.width;
  if (s < rect.height) return { x: rect.x + rect.width, y: rect.y + s };
  s -= rect.height;
  if (s < rect.width)
    return { x: rect.x + rect.width - s, y: rect.y + rect.height };
  s -= rect.width;
  return { x: rect.x, y: rect.y + rect.height - s };
}

/** First contact of two moving circles within this step, including fast/grazing hits. */
export function sweptCircleContact(
  a0: Vec2, a1: Vec2, b0: Vec2, b1: Vec2, radiusSum: number,
): number | null {
  const x = a0.x - b0.x, y = a0.y - b0.y;
  const vx = a1.x - a0.x - (b1.x - b0.x);
  const vy = a1.y - a0.y - (b1.y - b0.y);
  const c = x * x + y * y - radiusSum * radiusSum;
  if (c <= 0) return 0;
  const a = vx * vx + vy * vy;
  if (a < 1e-12) return null;
  const b = 2 * (x * vx + y * vy);
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  const t = (-b - Math.sqrt(discriminant)) / (2 * a);
  return t >= 0 && t <= 1 ? t : null;
}
