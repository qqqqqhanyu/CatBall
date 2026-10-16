export interface Character {
  id: string;
  name: string;
  school: string;
  description: string;
  fur: string;
  shade: string;
  eyes: string;
  kind: "cat" | "tabby" | "point" | "poodle" | "ragdoll";
  portrait: [number, number, number, number];
  body: [number, number, number, number];
}

export const CHARACTERS: readonly Character[] = [
  {
    id: "silver_cat",
    name: "坚果",
    school: "29中",
    description: "白毛 · 灰耳灰尾 · 蓝眼睛",
    fur: "#eef0ef",
    shade: "#b8c3cb",
    eyes: "#419ac4",
    kind: "cat",
    portrait: [571, 4, 270, 239],
    body: [24, 1053, 240, 285],
  },
  {
    id: "white_cat",
    name: "元宵",
    school: "29中",
    description: "纯白毛 · 浅绿眼睛",
    fur: "#fffaf0",
    shade: "#d5dfe0",
    eyes: "#72a58c",
    kind: "cat",
    portrait: [572, 3, 263, 250],
    body: [24, 1043, 233, 305],
  },
  {
    id: "tabby_cat",
    name: "球球",
    school: "金陵中学",
    description: "灰虎斑 · 黄绿眼睛",
    fur: "#b7bdc2",
    shade: "#727f8e",
    eyes: "#c7ad49",
    kind: "tabby",
    portrait: [567, 10, 263, 232],
    body: [24, 1045, 241, 304],
  },
  {
    id: "point_cat",
    name: "赛赛",
    school: "树人中学",
    description: "重点色 · 蓝灰眼睛",
    fur: "#ecdbc0",
    shade: "#69574f",
    eyes: "#77abc3",
    kind: "point",
    portrait: [540, 8, 258, 230],
    body: [20, 1027, 245, 298],
  },
  {
    id: "poodle",
    name: "欢欢",
    school: "29中",
    description: "灰色卷毛 · 垂耳 · 短尾",
    fur: "#a8a4a7",
    shade: "#746f7c",
    eyes: "#a68a6a",
    kind: "poodle",
    portrait: [545, 0, 279, 230],
    body: [22, 1015, 242, 315],
  },
  {
    id: "ragdoll_cat",
    name: "阿福",
    school: "一中实验",
    description: "蓬松长毛 · 蓝眼睛",
    fur: "#f5efe5",
    shade: "#a99b95",
    eyes: "#69a8ce",
    kind: "ragdoll",
    portrait: [584, 7, 248, 241],
    body: [20, 1020, 247, 322],
  },
];

export const DEFAULT_CHARACTER = CHARACTERS[0];
export const characterById = (id: string | null | undefined) =>
  CHARACTERS.find((c) => c.id === id) ?? DEFAULT_CHARACTER;
export const characterAsset = (character: Character) =>
  `${import.meta.env.BASE_URL}assets/characters/${character.id}.webp`;

let artSequence = 0;

/** Original portrait windows and separate transparent hero atlas windows. */
export function characterArt(
  character: Character,
  type: "portrait" | "body" = "portrait",
): string {
  const index = CHARACTERS.findIndex((c) => c.id === character.id);
  const window =
    type === "body" ? [(index % 3) * 512, 100, 512, 840] : character.portrait;
  const [x, y, width, height] = window;
  const source =
    type === "body"
      ? `${import.meta.env.BASE_URL}assets/art/heroes-${index < 3 ? "a" : "b"}-v3.webp`
      : characterAsset(character);
  const sourceWidth = type === "body" ? 1536 : 1122;
  const sourceHeight = type === "body" ? 1024 : 1402;
  const clipId = `character-window-${++artSequence}`;
  // Clip the letterbox area too when the viewport and source window have
  // different aspect ratios, especially in narrow mobile character cards.
  return `<svg class="character-art ${type}-art" viewBox="${window.join(" ")}" role="img" aria-label="${character.name}" preserveAspectRatio="xMidYMid meet"><defs><clipPath id="${clipId}"><rect x="${x}" y="${y}" width="${width}" height="${height}" /></clipPath></defs><g clip-path="url(#${clipId})"><text x="${x + width / 2}" y="${y + height / 2}" text-anchor="middle" dominant-baseline="middle" fill="#254a72" font-size="${width * 0.18}">${character.name}</text><image href="${source}" width="${sourceWidth}" height="${sourceHeight}" /></g></svg>`;
}
