import "./style.css";
import type Phaser from "phaser";
import { CHARACTERS, characterArt, characterById } from "./data/characters";
import { GAME_CONFIG } from "./config/gameConfig";
import { InputController } from "./systems/InputController";
import { Session } from "./systems/Session";
import { readSelection, saveSelection, saveResult } from "./utils/storage";
import { difficultyAt } from "./systems/DifficultyDirector";
import { seededRandom } from "./utils/random";
import { expressionArt } from "./render/expressionAssets";
import { EXPRESSION_NAMES } from "./systems/ExpressionSystem";
import { AudioController } from "./systems/AudioController";
import { installHowToPlay } from "./ui/HowToPlay";

const app = document.querySelector<HTMLElement>("#app")!;
const audio = new AudioController();
const portraitMode = window.matchMedia(
  "(orientation: portrait) and (max-width: 900px)",
);
let selectedId = readSelection();
let engine: Phaser.Game | null = null;
let session: Session | null = null;
let controls: InputController | null = null;
let viewAbort = new AbortController();
let startRevision = 0;
let resultShown = false;
let gameModule: Promise<typeof import("./game")> | null = null;
const getGame = () =>
  (gameModule ??= import("./game").catch((error) => {
    gameModule = null;
    throw error;
  }));

const paw =
  '<svg viewBox="0 0 32 32" aria-hidden="true"><ellipse cx="16" cy="23" rx="9" ry="7"/><ellipse cx="6" cy="13" rx="4" ry="5" transform="rotate(-24 6 13)"/><ellipse cx="13" cy="7" rx="4" ry="5"/><ellipse cx="22" cy="8" rx="4" ry="5" transform="rotate(12 22 8)"/><ellipse cx="28" cy="15" rx="3.5" ry="5" transform="rotate(25 28 15)"/></svg>';
const heart =
  '<svg viewBox="0 0 16 15" aria-hidden="true"><path d="M1 2h2V0h4v2h2V0h4v2h2v7h-2v2h-2v2H9v2H7v-2H5v-2H3V9H1z"/><path class="heart-shine" d="M3 3h3v2H3z"/></svg>';
const pauseIcon =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>';
const shoe =
  '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#173661" d="M26 4h12v19l8 8v9H5V28l12-4z"/><path fill="#eff7f4" d="M27 8h8v17l7 7v4H9v-6l11-3z"/><path fill="#368cc7" d="M27 8h8v13l-9 7-9-2zM10 32h31v4H10z"/><path fill="#fff" d="M26 15h9v3h-9zM23 20h9v3h-9z"/></svg>';
const roll =
  '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#13335b" d="M15 3h18v5h7v7h5v18h-5v7h-7v5H15v-5H8v-7H3V15h5V8h7z"/><path fill="#45a4d2" d="M16 7h16v5h7v20h-7v8H16v-5H9V16h7z"/><path fill="#edf5ed" d="M17 7h14v6h6v10h-6v7H17v-5h-6V15h6z"/></svg>';

function orientationNotice(): string {
  return `<aside class="orientation-note" aria-label="横屏提示"><div class="rotate-phone"><span>↻</span></div><h2>转一下，操场更宽阔</h2><p>请将手机横过来，双手一起玩。</p><strong>CatBall</strong></aside>`;
}

function resetView(): void {
  viewAbort.abort();
  viewAbort = new AbortController();
  controls?.destroy();
  controls = null;
  engine?.destroy(true);
  engine = null;
  session = null;
  resultShown = false;
}

function renderMenu(): void {
  audio.setActive(false);
  startRevision++;
  resetView();
  const selected = characterById(selectedId);
  app.dataset.screen = "menu";
  delete app.dataset.phase;
  app.innerHTML = `<section class="menu-screen">
    <img class="menu-background" src="${import.meta.env.BASE_URL}assets/art/arena-desktop-v2.webp" alt="" /><div class="menu-wash"></div>
    <header class="brand" aria-label="CatBall 校园躲避球"><h1 class="sr-only">CatBall 校园躲避球</h1><img src="${import.meta.env.BASE_URL}assets/art/logo-v2.webp" alt="" /></header>
    <div class="selection-layout">
      <section class="selected-panel panel" aria-label="已选角色"><h2 class="panel-tab">${paw} 已选角色 ${paw}</h2><div class="hero-art" id="hero-art">${characterArt(selected, "body")}</div><div class="hero-caption"><h2 id="hero-name">${selected.name}</h2><span class="school-label" id="hero-school">${selected.school}</span><p id="hero-description">${selected.description}</p></div></section>
      <section class="roster-panel panel"><h2 class="panel-tab">${paw} 选择你的角色 ${paw}</h2><div class="character-grid" role="radiogroup" aria-label="选择角色">${CHARACTERS.map((character) => `<button type="button" class="character-card ${character.id === selectedId ? "selected" : ""}" data-character="${character.id}" role="radio" aria-checked="${character.id === selectedId}" aria-label="${character.name}，${character.school}" tabindex="${character.id === selectedId ? 0 : -1}"><span class="card-portrait">${characterArt(character)}</span><span class="selection-check" aria-hidden="true">✓</span><span class="card-name">${character.name}</span><span class="card-school">${character.school}</span></button>`).join("")}</div><p class="equal-note">${paw} 角色能力相同，选你喜欢的伙伴 ${paw}</p><button type="button" class="start-button" id="start-game">开始游戏 <span aria-hidden="true">▶</span></button><p class="start-error" role="alert" hidden></p></section>
    </div>
    <footer class="menu-footer"><span class="touch-instruction">左手移动 · 右手踢击 / 翻滚</span><span class="keyboard-instruction"><kbd>WASD</kbd> 移动 · <kbd>Space</kbd> 踢击</span><div class="menu-tools"><button type="button" data-help>玩法介绍</button><button type="button" data-sound aria-pressed="true">声音：开</button></div></footer>
  </section>${orientationNotice()}`;
  const signal = viewAbort.signal;
  installUtilities(signal);
  app
    .querySelectorAll<HTMLButtonElement>("[data-character]")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => selectCharacter(button.dataset.character!),
        { signal },
      );
      button.addEventListener(
        "keydown",
        (event) => {
          const offsets: Record<string, number> = {
            ArrowRight: 1,
            ArrowLeft: -1,
            ArrowDown: 3,
            ArrowUp: -3,
          };
          if (!(event.code in offsets)) return;
          event.preventDefault();
          const index = CHARACTERS.findIndex(
            (character) => character.id === selectedId,
          );
          const next =
            CHARACTERS[
              (index + offsets[event.code] + CHARACTERS.length) %
                CHARACTERS.length
            ];
          selectCharacter(next.id);
          app
            .querySelector<HTMLButtonElement>(`[data-character="${next.id}"]`)
            ?.focus();
        },
        { signal },
      );
    });
  app
    .querySelector("#start-game")!
    .addEventListener("click", () => void startGame(), { signal });
}

function installUtilities(signal: AbortSignal): void {
  installHowToPlay(app, signal);
  const soundButtons = app.querySelectorAll<HTMLButtonElement>("[data-sound]");
  const update = () => soundButtons.forEach((button) => {
    button.textContent = `声音：${audio.enabled ? "开" : "关"}`;
    button.setAttribute("aria-pressed", String(audio.enabled));
  });
  soundButtons.forEach((button) => button.addEventListener("click", () => { audio.toggle(); update(); }, { signal }));
  update();
}

function selectCharacter(id: string): void {
  selectedId = characterById(id).id;
  saveSelection(selectedId);
  const selected = characterById(selectedId);
  app
    .querySelectorAll<HTMLButtonElement>("[data-character]")
    .forEach((button) => {
      const checked = button.dataset.character === selectedId;
      button.classList.toggle("selected", checked);
      button.setAttribute("aria-checked", String(checked));
      button.tabIndex = checked ? 0 : -1;
    });
  app.querySelector("#hero-art")!.innerHTML = characterArt(selected, "body");
  app.querySelector("#hero-name")!.textContent = selected.name;
  app.querySelector("#hero-school")!.textContent = selected.school;
  app.querySelector("#hero-description")!.textContent = selected.description;
}

async function startGame(): Promise<void> {
  audio.startRound();
  const revision = ++startRevision;
  const startButton = app.querySelector<HTMLButtonElement>("#start-game");
  if (startButton) {
    startButton.disabled = true;
    startButton.textContent = "正在打开操场…";
  }
  try {
    const { createGame } = await getGame();
    if (revision !== startRevision) return;
    resetView();
    saveSelection(selectedId);
    const selected = characterById(selectedId);
    // Reproducible local QA only; production always draws a fresh round.
    const seed = import.meta.env.DEV ? new URLSearchParams(location.search).get("seed") : null;
    session = new Session(selectedId, seed !== null && /^\d{1,9}$/.test(seed) ? seededRandom(Number(seed)) : Math.random);
    if (import.meta.env.DEV) {
      const { applyScenario } = await import("./dev/scenarios");
      if (revision !== startRevision) return;
      applyScenario(session, new URLSearchParams(location.search).get("scenario"));
    }
    app.dataset.screen = "game";
    app.innerHTML = `<section class="game-screen">
      <header class="hud"><div class="hud-player"><span class="hud-portrait" data-expression="FOCUSED">${expressionArt(selectedId, "FOCUSED")}</span><div class="hud-identity"><div class="hud-name"><strong>${selected.name}</strong><small id="hud-expression">专注</small></div><div class="hearts" role="img" aria-label="生命 ${session.health} / ${GAME_CONFIG.maxHealth}">${Array.from({ length: GAME_CONFIG.maxHealth }, (_, i) => i < session!.health ? heart : heart.replace("<svg ", '<svg class="lost" ')).join("")}</div><span class="sr-only" id="health-status" role="status"></span></div></div><div class="hud-clock"><span>生存时间</span><time id="game-time">00:00</time></div><div class="hud-right"><div class="score"><span>SCORE</span><strong id="game-score">00000</strong></div><button type="button" class="pause-button icon-button" aria-label="暂停游戏">${pauseIcon}</button></div></header>
      <div class="game-field"><div id="phaser-host"></div><div class="hurt-flash" aria-hidden="true"></div><span class="practice-label" id="difficulty-label">第 1 阶段 · 注意蓄力提示</span>
        <div class="joystick" aria-label="移动摇杆" role="group"><span class="joystick-arrows" aria-hidden="true"><i>▲</i><i>▶</i><i>▼</i><i>◀</i></span><span class="joystick-ring"></span><span class="joystick-knob"></span></div>
        <div class="skill-controls"><button class="skill roll" type="button" disabled aria-label="Roll 翻滚">${roll}<strong>ROLL</strong><small>准备</small></button><button class="skill kick" type="button" disabled aria-label="Kick 踢击">${shoe}<strong>KICK</strong><small>准备</small></button></div>
        <div class="status-strip"><span id="status-treat" class="effect-chip treat" hidden></span><span id="status-hurt" class="effect-chip" hidden></span><span id="status-shock" class="effect-chip shock" hidden></span><span id="status-animal" class="effect-chip animal" hidden></span></div>
        <div class="expression-layer" aria-label="角色表情"></div><div class="kick-banner" hidden>NICE KICK! <small>+50</small></div><div class="pickup-notice" hidden></div>
        <div class="countdown" aria-live="polite" aria-atomic="true"><strong id="countdown-number">3</strong><span>准备好了吗？</span></div>
        <p class="game-keyboard-hint"><kbd>WASD</kbd> 移动 · <kbd>Space</kbd> 踢击 · <kbd>Shift</kbd> 翻滚 · <kbd>Esc</kbd> 暂停</p>
      </div>
      <div class="pause-overlay" hidden><section class="pause-panel panel" role="dialog" aria-modal="true" aria-labelledby="pause-title"><span class="pause-paw">${paw}</span><h2 id="pause-title">休息一下</h2><p>伙伴们在操场等你</p><button class="primary-button" id="resume-game">继续游戏</button><button class="secondary-button" id="restart-game">重新开始</button><button class="text-button" id="return-menu">返回选人</button><div class="pause-tools"><button type="button" data-help>玩法介绍</button><button type="button" data-sound aria-pressed="true">声音：开</button></div></section></div>
      <div class="result-overlay" hidden><section class="result-panel panel" role="dialog" aria-modal="true" aria-labelledby="result-title"><span class="result-eyebrow">校园躲避球</span><h2 id="result-title">GAME OVER</h2><p class="result-message">休息一下，再挑战一次吧！</p><div class="result-stats"><div class="result-survival"><span>本局生存</span><strong id="result-time">00:00</strong></div><div><span>本局得分</span><strong id="result-score">0</strong></div><div><span>最长生存</span><strong id="record-time">00:00</strong></div><div><span>最高得分</span><strong id="record-score">0</strong></div></div><p class="result-kicks">本局踢飞 <strong>0</strong></p><div class="result-actions"><button class="primary-button" id="retry-game">再来一次</button><button class="secondary-button" id="result-menu">返回角色选择</button></div></section></div>
    </section>${orientationNotice()}`;
    const signal = viewAbort.signal;
    installUtilities(signal);
    controls = new InputController(
      app.querySelector(".joystick")!,
      app.querySelector(".joystick-knob")!,
      togglePause,
      { kick: app.querySelector<HTMLButtonElement>(".skill.kick")!, roll: app.querySelector<HTMLButtonElement>(".skill.roll")! },
    );
    app
      .querySelector(".pause-button")!
      .addEventListener("click", togglePause, { signal });
    app
      .querySelector("#resume-game")!
      .addEventListener("click", resume, { signal });
    app
      .querySelector("#restart-game")!
      .addEventListener("click", () => void startGame(), { signal });
    app
      .querySelector("#return-menu")!
      .addEventListener("click", renderMenu, { signal });
    app.querySelector("#retry-game")!.addEventListener("click", () => void startGame(), { signal });
    app.querySelector("#result-menu")!.addEventListener("click", renderMenu, { signal });
    app.querySelectorAll("[role=dialog]").forEach((dialog) => dialog.addEventListener(
      "keydown",
      (event) => {
        const keyboard = event as KeyboardEvent;
        if (keyboard.key !== "Tab") return;
        const buttons = [
          ...dialog.querySelectorAll<HTMLButtonElement>("button"),
        ];
        const first = buttons[0],
          last = buttons[buttons.length - 1];
        if (keyboard.shiftKey && document.activeElement === first) {
          keyboard.preventDefault();
          last.focus();
        } else if (!keyboard.shiftKey && document.activeElement === last) {
          keyboard.preventDefault();
          first.focus();
        }
      },
      { signal },
    ));
    engine = createGame(app.querySelector("#phaser-host")!, {
      session,
      input: controls,
      onUpdate: updateHUD,
      expressionLayer: app.querySelector<HTMLElement>(".expression-layer")!,
    });
    if (portraitMode.matches || document.hidden) pause();
  } catch (error) {
    console.error("Could not open playground", error);
    renderMenu();
    const message = app.querySelector<HTMLElement>(".start-error")!;
    message.hidden = false;
    message.textContent = "操场加载失败，请再试一次。";
  }
}

function formatTime(elapsed: number): string {
  const seconds = Math.floor(elapsed + 1e-8);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function updateHUD(current: Session): void {
  audio.sync(current.phase, current.kickCount);
  const text = formatTime(current.elapsed);
  const timer = app.querySelector("#game-time");
  if (timer && timer.textContent !== text) timer.textContent = text;
  app.dataset.phase = current.phase.toLowerCase();
  const score = app.querySelector("#game-score");
  const scoreText = String(current.score).padStart(5, "0");
  if (score && score.textContent !== scoreText) score.textContent = scoreText;
  const hearts = app.querySelector<HTMLElement>(".hearts");
  if (hearts && hearts.dataset.health !== String(current.health)) {
    hearts.dataset.health = String(current.health);
    hearts.setAttribute("aria-label", `生命 ${current.health} / ${GAME_CONFIG.maxHealth}`);
    hearts.querySelectorAll("svg").forEach((icon, index) => icon.classList.toggle("lost", index >= current.health));
    app.querySelector("#health-status")!.textContent = `剩余 ${current.health} 颗心`;
  }
  const stage = GAME_CONFIG.difficulty.stages.findIndex((entry) => entry.from === difficultyAt(current.elapsed).from) + 1;
  const label = app.querySelector("#difficulty-label");
  const difficultyText = `第 ${stage} 阶段 · 踢飞 ${current.kickCount}`;
  if (label && label.textContent !== difficultyText) label.textContent = difficultyText;
  const hurtAge = current.lastHit ? current.elapsed - current.lastHit.at : Infinity;
  app.querySelector<HTMLElement>(".hurt-flash")?.style.setProperty("opacity", String(Math.max(0, 1 - hurtAge / 0.35)));
  updateStatusHUD(current);
  if (current.phase === "GAME_OVER" && !resultShown) showResult(current);
  const countdown = app.querySelector<HTMLElement>(".countdown");
  if (!countdown) return;
  const show =
    current.phase === "COUNTDOWN" ||
    (current.phase === "PLAYING" && current.elapsed < GAME_CONFIG.goSeconds);
  countdown.hidden = !show;
  const number =
    current.countdown > 0 ? String(Math.ceil(current.countdown)) : "GO!";
  const element = app.querySelector("#countdown-number")!;
  if (element.textContent !== number) element.textContent = number;
  const hint = countdown.querySelector("span")!;
  hint.textContent =
    current.countdown > 0 ? "观察四周，准备躲球！" : "躲开来球，坚持更久！";
}

function updateStatusHUD(current: Session): void {
  const expression = current.expressionView().states[current.playerId];
  const portrait = app.querySelector<HTMLElement>(".hud-portrait")!;
  if (portrait.dataset.expression !== expression) {
    portrait.dataset.expression = expression;
    portrait.innerHTML = expressionArt(current.playerId, expression);
    app.querySelector("#hud-expression")!.textContent = EXPRESSION_NAMES[expression];
  }
  const active = current.phase === "PLAYING" && current.hitStopRemaining === 0;
  for (const action of ["kick", "roll"] as const) {
    const cooldown = action === "kick" ? current.kickCooldown : current.rollCooldown;
    const button = app.querySelector<HTMLButtonElement>(`.skill.${action}`)!;
    button.disabled = !active || cooldown > 1e-8 || current.rollRemaining > 0;
    const remaining = `${(Math.ceil(cooldown * 10) / 10).toFixed(1)}s`;
    const label = cooldown > 1e-8 ? remaining : current.phase === "COUNTDOWN" ? "准备" : "就绪";
    if (button.querySelector("small")!.textContent !== label) button.querySelector("small")!.textContent = label;
  }
  const status = (id: string, visible: boolean, text: string) => {
    const element = app.querySelector<HTMLElement>(`#status-${id}`)!;
    element.hidden = !visible;
    if (element.textContent !== text) element.textContent = text;
  };
  const timer = (value: number) => (Math.ceil(value * 10) / 10).toFixed(1);
  status("treat", current.treatRemaining > 0, `猫条无敌 ${timer(current.treatRemaining)}s`);
  status("hurt", current.hurtRemaining > 0, `受伤保护 ${timer(current.hurtRemaining)}s`);
  status("shock", current.shockedRemaining > 0, `全场震惊 ${timer(current.shockedRemaining)}s`);
  const animal = current.animals.animal;
  const animalStates = { CHASE: "追踪", WINDUP: "冲刺预警", DASH: "冲刺中", RECOVER: "缓冲" };
  status("animal", !!animal, animal ? `${animal.type === "DUCK" ? "鸭子" : "野猪"} · ${animalStates[animal.state]}` : "");
  const banner = app.querySelector<HTMLElement>(".kick-banner")!;
  banner.hidden = !(current.lastKick?.success && (current.hitStopRemaining > 0 || current.elapsed - current.lastKick.at < 0.8));
  const pickup = app.querySelector<HTMLElement>(".pickup-notice")!;
  pickup.hidden = !(current.lastPickup && current.elapsed - current.lastPickup.at < 0.6);
  if (!pickup.hidden) pickup.textContent = current.lastPickup!.type === "PUMPKIN" ? current.lastPickup!.healed ? "南瓜 +1 ♥" : "生命已满 · 5 ♥" : "猫条 · 无敌 5 秒";
}

function showResult(current: Session): void {
  resultShown = true;
  controls?.setEnabled(false);
  const records = saveResult(current.elapsed, current.score);
  app.querySelector("#result-time")!.textContent = formatTime(current.elapsed);
  app.querySelector("#result-score")!.textContent = String(current.score);
  app.querySelector("#record-time")!.textContent = formatTime(records.survivalSeconds);
  app.querySelector("#record-score")!.textContent = String(records.score);
  app.querySelector(".result-kicks strong")!.textContent = String(current.kickCount);
  app.querySelector<HTMLElement>(".game-field")!.inert = true;
  app.querySelector<HTMLButtonElement>(".pause-button")!.disabled = true;
  app.querySelector<HTMLElement>(".result-overlay")!.hidden = false;
  app.querySelector<HTMLButtonElement>("#retry-game")!.focus();
}

function pause(): void {
  if (!session || session.phase === "PAUSED" || session.phase === "GAME_OVER") return;
  session.pause();
  controls?.setEnabled(false);
  app.querySelector<HTMLElement>(".pause-overlay")!.hidden = false;
  app.querySelector<HTMLElement>(".game-field")!.inert = true;
  app.querySelector<HTMLButtonElement>(".pause-button")!.disabled = true;
  app.querySelector<HTMLButtonElement>("#resume-game")!.focus();
  updateHUD(session);
}

function resume(): void {
  if (!session || session.phase !== "PAUSED" || portraitMode.matches) return;
  audio.activate();
  session.resume();
  controls?.clear();
  app.querySelector<HTMLElement>(".pause-overlay")!.hidden = true;
  app.querySelector<HTMLElement>(".game-field")!.inert = false;
  const button = app.querySelector<HTMLButtonElement>(".pause-button")!;
  button.disabled = false;
  button.focus();
  updateHUD(session);
}

function togglePause(): void {
  if (session?.phase === "PAUSED") resume();
  else pause();
}

window.addEventListener("blur", () => { pause(); audio.setActive(false); });
document.addEventListener("visibilitychange", () => {
  if (document.hidden) { pause(); audio.setActive(false); }
});
portraitMode.addEventListener("change", () => {
  controls?.clear();
  if (portraitMode.matches) pause();
});
window.addEventListener("resize", () => {
  if (portraitMode.matches) pause();
});

// Development-only observability for meaningful movement and lifecycle integration tests.
if (import.meta.env.DEV) {
  Object.defineProperty(window, "__catball", {
    value: {
      snapshot: () => session?.snapshot() ?? null,
      audio: () => audio.snapshot(),
      animation: () =>
        (
          engine?.scene.getScene("Playground") as
            | import("./scenes/GameScene").GameScene
            | undefined
        )?.animationSnapshot() ?? null,
    },
    configurable: true,
  });
}

renderMenu();
