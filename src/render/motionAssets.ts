/** Atlas windows and foot anchors are display-only; collision stays in world units. */
export const IDLE_WINDOWS = [
  [110, 100, 330, 390, 0.62],
  [590, 100, 320, 390, 0.6],
  [1050, 100, 340, 390, 0.6],
  [115, 542, 332, 400, 0.61],
  [588, 543, 360, 400, 0.57],
  [1025, 540, 380, 405, 0.62],
] as const;

interface WalkAtlas {
  columns: number[];
  top: number;
  bottom: number;
  anchors: number[];
}
// Explicit windows also support atlases whose width is not a multiple of four.
// Per-frame anchors compensate for small layout drift in the source artwork.
export const WALK_ATLASES: Record<string, WalkAtlas> = {
  silver_cat: {
    columns: [0, 512, 1024, 1536, 2048],
    top: 119,
    bottom: 713,
    anchors: [300, 300.5, 301, 301],
  },
  white_cat: {
    columns: [0, 512, 1024, 1536, 2048],
    top: 142,
    bottom: 675,
    anchors: [287, 268.5, 254, 254.5],
  },
  tabby_cat: {
    columns: [0, 512, 1024, 1536, 2048],
    top: 129,
    bottom: 678,
    anchors: [287, 283, 277.5, 274],
  },
  point_cat: {
    columns: [0, 512, 1024, 1536, 2048],
    top: 183,
    bottom: 701,
    anchors: [295, 294.5, 294, 294],
  },
  poodle: {
    columns: [0, 525, 1035, 1536, 2046],
    top: 114,
    bottom: 710,
    anchors: [286, 293.5, 273, 273.5],
  },
  ragdoll_cat: {
    columns: [0, 512, 1024, 1536, 2048],
    top: 128,
    bottom: 651,
    anchors: [282, 282, 282, 281.5],
  },
};
export const KICK_WINDOWS = [
  [0, 48, 512, 432, 267 / 512, 422 / 432],
  [512, 48, 512, 432, 241 / 512, 426 / 432],
  [1024, 48, 512, 432, 221 / 512, 426 / 432],
  [0, 530, 512, 440, 261 / 512, 430 / 440],
  [512, 530, 512, 440, 243 / 512, 430 / 440],
  [1024, 530, 512, 440, 225 / 512, 430 / 440],
] as const;
