import { characterById } from "../data/characters";
import { expressionArt } from "../render/expressionAssets";
import { placeBubbles, type BubbleAnchor } from "../render/bubbleLayout";
import { EXPRESSION_NAMES, type Expression } from "../systems/ExpressionSystem";
import type { Rect } from "../utils/geometry";

export class ExpressionOverlay {
  private nodes = new Map<string, HTMLElement>();
  private controls: Rect[] = [];
  constructor(private layer: HTMLElement) { this.resize(); }
  resize(): void {
    const bounds = this.layer.getBoundingClientRect();
    this.controls = [...this.layer.parentElement!.querySelectorAll<HTMLElement>(".joystick, .skill-controls, .status-strip, .practice-label, .game-keyboard-hint, .pickup-notice, .kick-banner")].filter((element) => !element.hidden && element.getClientRects().length > 0).map((element) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x - bounds.x - 4, y: rect.y - bounds.y - 4, width: rect.width + 8, height: rect.height + 8 };
    });
  }
  draw(bubbles: { characterId: string; expression: Expression }[], anchors: BubbleAnchor[], obstacles: Rect[], width: number, height: number): void {
    const visible = new Set(bubbles.map((bubble) => bubble.characterId));
    for (const [id, node] of this.nodes) node.hidden = !visible.has(id);
    if (!bubbles.length) return;
    // Transient chips and the kick title change size. Reserve their actual visible bounds.
    this.resize();
    const reserved = [...obstacles, ...this.controls];
    const placements = placeBubbles(anchors.filter((anchor) => visible.has(anchor.id)), width, height, reserved);
    for (const placement of placements) {
      const expression = bubbles.find((bubble) => bubble.characterId === placement.id)!.expression;
      let node = this.nodes.get(placement.id);
      if (!node) {
        node = document.createElement("div");
        node.className = "expression-bubble";
        node.dataset.character = placement.id;
        node.innerHTML = '<span class="bubble-tail"></span><span class="bubble-face"></span><span class="bubble-caption"></span>';
        this.layer.append(node); this.nodes.set(placement.id, node);
      }
      node.hidden = false;
      if (node.dataset.expression !== expression) {
        node.dataset.expression = expression;
        node.querySelector(".bubble-face")!.innerHTML = expressionArt(placement.id, expression);
        node.querySelector(".bubble-caption")!.textContent = `${characterById(placement.id).name} · ${EXPRESSION_NAMES[expression]}`;
      }
      node.style.width = `${placement.size}px`;
      node.style.transform = `translate(${Math.round(placement.x)}px, ${Math.round(placement.y)}px)`;
      const dx = placement.anchor.x - (placement.x + placement.size / 2);
      const dy = placement.anchor.y - placement.anchor.height * 0.65 - (placement.y + placement.size / 2);
      const angle = Math.atan2(dy, dx);
      const tail = node.querySelector<HTMLElement>(".bubble-tail")!;
      tail.style.transform = `translate(${Math.cos(angle) * placement.size * 0.42}px, ${Math.sin(angle) * placement.size * 0.42}px) rotate(${angle - Math.PI / 2}rad)`;
    }
  }
  destroy(): void { this.layer.replaceChildren(); this.nodes.clear(); }
}
