import { GAME_CONFIG } from "../config/gameConfig";
import { capVector, type Vec2 } from "../utils/geometry";
import type { PlayerActions } from "./Session";

const moveKeys = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowLeft",
  "ArrowDown",
  "ArrowRight",
]);

export class InputController {
  private keys = new Set<string>();
  private touch: Vec2 = { x: 0, y: 0 };
  private pointer: number | null = null;
  private abort = new AbortController();
  private enabled = false;
  private actions: PlayerActions = {};
  private origin = { x: 0, y: 0, radius: 1 };

  constructor(
    private joystick: HTMLElement,
    private knob: HTMLElement,
    onPause: () => void,
    buttons?: { kick: HTMLButtonElement; roll: HTMLButtonElement },
  ) {
    const signal = this.abort.signal;
    window.addEventListener(
      "keydown",
      (event) => {
        if (event.code === "Escape" && !event.repeat) {
          event.preventDefault();
          onPause();
        }
        const action = event.code === "Space" ? "kick" : event.code === "ShiftLeft" || event.code === "ShiftRight" ? "roll" : null;
        if (action && this.enabled) {
          event.preventDefault();
          if (!event.repeat) this.actions[action] = true;
          return;
        }
        if (!moveKeys.has(event.code) || !this.enabled) return;
        event.preventDefault();
        this.keys.add(event.code);
      },
      { signal },
    );
    if (buttons) for (const action of ["kick", "roll"] as const) {
      buttons[action].addEventListener("pointerdown", (event) => {
        if (!this.enabled || (event.pointerType === "mouse" && event.button !== 0)) return;
        event.preventDefault();
        this.actions[action] = true;
      }, { signal });
      // Keyboard/screen-reader activation does not generate a pointerdown.
      buttons[action].addEventListener("click", (event) => {
        if (this.enabled && event.detail === 0) this.actions[action] = true;
      }, { signal });
    }
    window.addEventListener("keyup", (event) => this.keys.delete(event.code), {
      signal,
    });
    window.addEventListener("blur", () => this.clear(), { signal });
    window.addEventListener("resize", () => this.clear(), { signal });
    joystick.addEventListener(
      "contextmenu",
      (event) => event.preventDefault(),
      { signal },
    );
    joystick.addEventListener(
      "pointerdown",
      (event) => {
        if (
          !this.enabled ||
          this.pointer !== null ||
          (event.pointerType === "mouse" && event.button !== 0)
        )
          return;
        event.preventDefault();
        const rect = joystick.getBoundingClientRect();
        this.origin = {
          x: rect.x + rect.width / 2,
          y: rect.y + rect.height / 2,
          radius: rect.width * 0.32,
        };
        this.pointer = event.pointerId;
        joystick.setPointerCapture(event.pointerId);
        joystick.classList.add("engaged");
        this.updateTouch(event);
      },
      { signal },
    );
    joystick.addEventListener(
      "pointermove",
      (event) => {
        if (event.pointerId === this.pointer) {
          event.preventDefault();
          this.updateTouch(event);
        }
      },
      { signal },
    );
    for (const name of [
      "pointerup",
      "pointercancel",
      "lostpointercapture",
    ] as const) {
      joystick.addEventListener(
        name,
        (event) => {
          if (event.pointerId === this.pointer) this.releaseTouch();
        },
        { signal },
      );
    }
  }

  private updateTouch(event: PointerEvent): void {
    const vector = capVector({
      x: (event.clientX - this.origin.x) / this.origin.radius,
      y: (event.clientY - this.origin.y) / this.origin.radius,
    });
    const magnitude = Math.hypot(vector.x, vector.y);
    this.touch =
      magnitude < GAME_CONFIG.joystick.deadZone ? { x: 0, y: 0 } : vector;
    this.knob.style.transform = `translate(${vector.x * this.origin.radius}px, ${vector.y * this.origin.radius}px)`;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.clear();
  }

  vector(): Vec2 {
    if (!this.enabled) return { x: 0, y: 0 };
    const keyboard = {
      x:
        Number(this.keys.has("KeyD") || this.keys.has("ArrowRight")) -
        Number(this.keys.has("KeyA") || this.keys.has("ArrowLeft")),
      y:
        Number(this.keys.has("KeyS") || this.keys.has("ArrowDown")) -
        Number(this.keys.has("KeyW") || this.keys.has("ArrowUp")),
    };
    return this.pointer === null ? capVector(keyboard) : this.touch;
  }

  consumeActions(): PlayerActions {
    const actions = this.enabled ? this.actions : {};
    this.actions = {};
    return actions;
  }

  private releaseTouch(): void {
    const pointer = this.pointer;
    this.pointer = null;
    this.touch = { x: 0, y: 0 };
    this.knob.style.transform = "";
    this.joystick.classList.remove("engaged");
    if (pointer !== null && this.joystick.hasPointerCapture(pointer))
      this.joystick.releasePointerCapture(pointer);
  }

  clear(): void {
    this.keys.clear();
    this.actions = {};
    this.releaseTouch();
  }
  destroy(): void {
    this.clear();
    this.abort.abort();
  }
}
