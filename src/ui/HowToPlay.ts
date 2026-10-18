import { GAME_CONFIG as C } from "../config/gameConfig";
import { CHARACTERS, characterById } from "../data/characters";
import { characterStats } from "../data/abilities";

/** Native modal gives touch scrolling, focus containment and an inert backdrop. */
export function installHowToPlay(root: HTMLElement, signal: AbortSignal, selectedId: () => string): void {
  const dialog = document.createElement("dialog");
  dialog.className = "how-to-play";
  dialog.setAttribute("aria-labelledby", "how-to-title");
  const render = () => {
    const character = characterById(selectedId()), stats = characterStats(character.id);
    dialog.innerHTML = `<header class="guide-header"><div><span>CATBALL · v1.2</span><h2 id="how-to-title">怎么玩</h2></div><button type="button" class="guide-close" aria-label="关闭玩法介绍" autofocus>✕</button></header>
    <div class="guide-scroll">
      <p class="guide-lead">在操场上躲开来球，抓住时机踢飞追来的动物。坚持越久，得分越高！</p>
      <p class="guide-selected">当前角色：<strong>${character.name}</strong> · ${stats.abilityDescription}<br><small>以下玩法数值已包含当前角色的被动加成。</small></p>
      <div class="guide-grid">
        <section><span class="guide-number">01</span><h3>移动，躲开球</h3><p>四周伙伴会投出普通球、三射球和大球。观察蓄力提示，保持移动，被球或动物碰到会扣 1 颗心。</p><p class="guide-key">手机：左手摇杆 · 电脑：WASD / 方向键</p></section>
        <section><span class="guide-number">02</span><h3>靠近动物，KICK！</h3><p>鸭子和野猪会追踪、蓄力、冲刺。等它靠近时按 KICK 踢飞，成功 +${C.kick.points} 分，并让四周伙伴震惊 ${stats.shockedSeconds} 秒。<strong>球不能踢，空踢也会进入冷却。</strong></p><p class="guide-key">手机：右侧 KICK · 电脑：空格 · 冷却 ${C.kick.cooldownSeconds} 秒</p></section>
        <section><span class="guide-number">03</span><h3>危险时，ROLL！</h3><p>向移动方向翻滚，过程中短暂无敌；站着时沿上次朝向翻滚。留给最需要脱身的时刻。</p><p class="guide-key">手机：右侧 ROLL · 电脑：Shift · 冷却 ${stats.rollCooldownSeconds} 秒</p></section>
        <section><span class="guide-number">04</span><h3>捡道具，多坚持一会儿</h3><p>开局 ${C.initialHealth} 颗心，最多 ${stats.maxHealth} 颗。南瓜每次 +1 颗心，猫条提供 ${stats.treatSeconds} 秒无敌。道具每轮等待 ${stats.itemSpawnSeconds.min}–${stats.itemSpawnSeconds.max} 秒刷新。血量归零后结束；每生存 1 秒 +10 分。</p><p class="guide-key">暂停：右上角按钮 / Esc · 后台自动暂停</p></section>
      </div>
      <section class="guide-passives"><h3>六位伙伴，六种专属被动</h3><dl>${CHARACTERS.map((c) => `<div${c.id === character.id ? ' class="current"' : ""}><dt>${c.name}</dt><dd>${characterStats(c.id).abilityDescription}</dd></div>`).join("")}</dl></section>
      <p class="guide-credit">背景音乐：Arcade Kid — David Renda / Fesliyan Studios</p>
    </div><footer class="guide-footer"><span>专属技能自动生效，无需额外按键。</span><button type="button" class="primary-button guide-done">知道了</button></footer>`;
  };
  root.append(dialog);
  let opener: HTMLButtonElement | null = null;
  root.querySelectorAll<HTMLButtonElement>("[data-help]").forEach((button) => {
    button.addEventListener("click", () => { opener = button; render(); dialog.showModal(); }, { signal });
  });
  // Safari touch activation does not focus the opener automatically.
  dialog.addEventListener("close", () => opener?.focus({ preventScroll: true }), { signal });
  dialog.addEventListener("click", (event) => {
    if ((event.target as Element).closest("button")) dialog.close();
  }, { signal });
  // Escape closes this modal only; do not let the game resume behind it.
  dialog.addEventListener("keydown", (event) => event.stopPropagation(), { signal });
  signal.addEventListener("abort", () => { dialog.close(); dialog.remove(); }, { once: true });
}
