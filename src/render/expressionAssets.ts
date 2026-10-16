import { characterAsset, characterById } from "../data/characters";
import { EXPRESSION_NAMES, type Expression } from "../systems/ExpressionSystem";

type Window = readonly [number, number, number, number];
/** Display windows into the user's unmodified original four-expression sheets. */
export const EXPRESSION_WINDOWS: Record<string, Record<Expression, Window>> = {
  silver_cat: { CONFIDENT: [571, 4, 270, 239], HAPPY: [846, 6, 270, 239], FOCUSED: [622, 285, 245, 228], SURPRISED: [866, 285, 255, 230] },
  white_cat: { CONFIDENT: [572, 3, 263, 250], HAPPY: [846, 0, 270, 250], FOCUSED: [614, 285, 252, 230], SURPRISED: [868, 285, 251, 230] },
  tabby_cat: { CONFIDENT: [567, 10, 263, 232], HAPPY: [837, 0, 276, 250], FOCUSED: [610, 282, 251, 230], SURPRISED: [850, 282, 264, 235] },
  point_cat: { CONFIDENT: [540, 8, 258, 230], HAPPY: [803, 0, 315, 245], FOCUSED: [594, 282, 233, 215], SURPRISED: [841, 281, 270, 218] },
  poodle: { CONFIDENT: [545, 0, 279, 230], HAPPY: [842, 2, 278, 226], FOCUSED: [580, 272, 256, 218], SURPRISED: [842, 273, 276, 218] },
  ragdoll_cat: { CONFIDENT: [584, 7, 248, 241], HAPPY: [856, 0, 264, 250], FOCUSED: [616, 280, 240, 230], SURPRISED: [859, 276, 260, 234] },
};
let sequence = 0;
export function expressionArt(characterId: string, expression: Expression): string {
  const character = characterById(characterId);
  const [x, y, width, height] = EXPRESSION_WINDOWS[character.id][expression];
  const clip = `expression-${++sequence}`;
  return `<svg class="expression-art" viewBox="${x} ${y} ${width} ${height}" role="img" aria-label="${character.name} · ${EXPRESSION_NAMES[expression]}" preserveAspectRatio="xMidYMid meet"><defs><clipPath id="${clip}"><rect x="${x}" y="${y}" width="${width}" height="${height}"/></clipPath></defs><g clip-path="url(#${clip})"><rect x="${x}" y="${y}" width="${width}" height="${height}" fill="#fff9e7"/><text x="${x + width / 2}" y="${y + height / 2}" text-anchor="middle" fill="#17365b" font-size="32">${EXPRESSION_NAMES[expression]}</text><image href="${characterAsset(character)}" width="1122" height="1402"/></g></svg>`;
}
