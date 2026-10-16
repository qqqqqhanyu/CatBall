import sharp from "sharp";
import { mkdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const names = {
  silver_cat: "坚果",
  white_cat: "元宵",
  tabby_cat: "球球",
  point_cat: "赛赛",
  poodle: "欢欢",
  ragdoll_cat: "阿福",
};
for (const directory of ["characters", "art"])
  await mkdir(path.join(root, "public/assets", directory), { recursive: true });
async function delivery(source, destination, quality = 92) {
  // Encoding only: preserve image dimensions, colors, and generated alpha.
  const out = path.join(root, "public/assets", destination);
  await sharp(path.join(root, source))
    .webp({ quality, alphaQuality: 100, effort: 6 })
    .toFile(out);
  console.log(
    `${destination}: ${Math.round((await stat(out)).size / 1024)} KiB`,
  );
}
for (const [id, name] of Object.entries(names))
  await delivery(`Image/${name}.png`, `characters/${id}.webp`);
for (const key of [
  "arena-desktop-v2",
  "arena-mobile-v2",
  "characters-idle-v3",
  "animals-items-v1",
  "characters-kick-v1",
  ...Object.keys(names).map((id) => `${id}-walk-v1`),
  "heroes-a-v3",
  "heroes-b-v3",
  "logo-v2",
])
  await delivery(
    `Art/generated/${key}.png`,
    `art/${key}.webp`,
    key.startsWith("arena") ? 88 : 92,
  );
