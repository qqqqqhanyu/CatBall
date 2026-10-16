import { GAME_CONFIG as C } from "../config/gameConfig";
import type { Session } from "../systems/Session";

/** Local browser QA starting states. Actions, collisions and effects still use normal game logic. */
export function applyScenario(session: Session, name: string | null): void {
  if (!name || !/^(kick|dash)-(duck|boar)$|^(pumpkin|treat)$/.test(name)) return;
  session.elapsed = 20;
  session.countdown = 0.5;
  if (name === "pumpkin" || name === "treat") {
    session.health = 2;
    session.items.item = { type: name === "pumpkin" ? "PUMPKIN" : "CAT_TREAT", position: { x: session.position.x + 110, y: session.position.y }, remaining: 10 };
  } else {
    const type = name.endsWith("duck") ? "DUCK" : "BOAR";
    const dash = name.startsWith("dash");
    session.animals.animal = {
      id: 1, type, position: { x: session.position.x + (dash ? 280 : 70), y: session.position.y }, heading: Math.PI,
      speed: 0, radius: C.animals[type].radius, state: dash ? "CHASE" : "WINDUP",
      stateRemaining: dash ? 0.1 : C.animals.windupSeconds, distanceTravelled: 0,
    };
  }
}
