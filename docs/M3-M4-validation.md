# M3 / M4 验证记录

日期：2026-10-16。交付范围：用户要求的 M4 增益、原图表情、命中归因与状态 HUD，同时加入两种会冲刺的追踪动物，以及所需的 M3 Kick / Roll / hit-stop / 震惊。沿用已确认的背景、站立和行走画风。

## 自动验证

- `npm test`：5 个文件、57 项通过。新增 20 项覆盖动物持续追踪/冲刺/转向、安全刷新、接触后保留、Kick 边界与同帧优先级、0.5 秒冻结、其后完整 3 秒震惊、攻击与蓄力减速、已飞球不变速、Roll 方向/距离/边界/无敌、免疫叠加、道具上限/刷新/过期、暂停/重开、四表情及气泡范围。
- `npm run test:e2e`：19 项通过，1 项跳过。跳过项为桌面项目中的手机旋转检查；同项已在手机项目通过。实际 Chromium 页面验证选人、六角色腿部动画、真实弹幕生存至 Game Over、新增技能/道具/动物/UI、两指操作、暂停与重开。
- `npm run build`：TypeScript 与 Vite 生产构建通过。
- 浏览器测试使用已安装的 Chrome，桌面 1440×900、手机横屏 844×390 / DPR 2；另检查了 667×375 / DPR 2 的小屏实际截图。测试并发限制为 2，避免多个实时 WebGL 场景竞争 GPU；冷加载断言允许 10 秒。

## 关键交互

- Duck / Boar 都有四帧奔跑，追踪 → 预警 → 冲刺 → 恢复循环。Roll 和猫条期间照常追踪；被撞后退但不消失；场上最多一只，Kick 后才安排下一只。
- Kick 在动物中心距 ≤72 时有效，空踢也消耗 0.8 秒 CD，不能消球。成功 +50 分，0.5 秒暂停游戏时钟；之后震惊 3 秒，场外移动、全场投球时钟与蓄力速度减半。
- Kick 五个气泡：玩家自信，四名场外角色惊讶。原设定图直接通过 SVG 窗口展示，姓名/角色 ID 准确。气泡和标签避让真实 Kick 标题、操控区与底部信息。
- 自然 seed=43 对局的首次命中来自元宵：坚果惊讶、元宵开心，仅两个气泡。动物接触伤害不伪造投球者。
- Roll 为更圆的像素毛球与残影；0.45 秒内没有任何气泡，方向固定，无敌，10 秒 CD。旧表情事件按游戏时间自然过期，不在 Roll 后重播。
- 南瓜 +1 心，上限 3；猫条刷新到完整 5 秒。拾取当帧猫条保护生效。各无敌来源独立计时；其中一项结束不会取消另一项。
- 左手摇杆 + 右手技能可同时操作。右手释放后左手继续移动；Kick 冻结不清除持续按住的方向键或触摸指针，冻结结束后继续移动。
- 暂停冻结所有状态与表情计时，包括 hit-stop 本身。重新开始清除动物、道具、技能 CD、增益和事件。

## 生产与回退

- 生产包通过 `/CatBall/` 路径实测：选人、开始、Roll / Kick 冷却、暂停正常，脚本无 pageerror、资源无 4xx/5xx。
- 生产构建不包含 `__catball`、开发场景或固定 seed 入口；即使 URL 加 `scenario=kick-duck`，仍从 00:00 正常开始。
- 阻断全部 WebP 请求后，分别验证鸭子、野猪、南瓜、猫条：使用代码图形回退，Kick / 拾取仍正常执行，没有 pageerror。
- `dist/` 共 24 个文件、6,610,008 字节，约 6.61 MB；游戏引擎/场景 JavaScript gzip 328.32 KB。新增两个图集共 584,668 字节；原图、历史样稿、验证截图不会进入发布目录。
- 没有推送代码或执行 Pages 发布工作流。

## 运行截图

以下均由实际页面截图生成。开场与受伤截图使用自然对局；其余使用开发专用初始场景，随后通过正常按键/触摸触发效果。这些初始场景跳至 20 秒，便于验收，不能据此判断正式刷新时刻。

| 内容 | 手机 844×390 | 小屏 667×375 | 桌面 1440×900 |
| --- | --- | --- | --- |
| Kick 五气泡 | [查看](previews/m4/mobile-kick.png) | [查看](previews/m4/small-mobile-kick.png) | [查看](previews/m4/desktop-kick.png) |
| 圆球翻滚 | [查看](previews/m4/mobile-roll.png) | [查看](previews/m4/small-mobile-roll.png) | [查看](previews/m4/desktop-roll.png) |
| 鸭子冲刺 | [查看](previews/m4/mobile-duck-dash.png) | [查看](previews/m4/small-mobile-duck-dash.png) | [查看](previews/m4/desktop-duck-dash.png) |
| 野猪冲刺 | [查看](previews/m4/mobile-boar-dash.png) | [查看](previews/m4/small-mobile-boar-dash.png) | [查看](previews/m4/desktop-boar-dash.png) |
| 南瓜回血 | [查看](previews/m4/mobile-pumpkin-pickup.png) | [查看](previews/m4/small-mobile-pumpkin-pickup.png) | [查看](previews/m4/desktop-pumpkin-pickup.png) |
| 猫条无敌 | [查看](previews/m4/mobile-treat-pickup.png) | [查看](previews/m4/small-mobile-treat-pickup.png) | [查看](previews/m4/desktop-treat-pickup.png) |

[开场五人专注](previews/m4/mobile-opening.png) · [自然命中的两个气泡](previews/m4/mobile-hit.png)。

## 美术来源与后续范围

新增动物/道具和六角色 Kick 图集使用内置 imagegen；完整提示词、参考输入、保存路径在 [动物/道具记录](../Art/m4-provenance.json) 与 [Kick 记录](../Art/m4-kick-provenance.json)。原始 PNG 保存于 `Art/generated/`，发布 WebP 仅转换编码。四表情沿用六张原设计图，没有重新生成。

当前采用正面略侧视角和左右镜像，尚未制作完整背面动作。浏览器手机模拟不等于真实手机；iOS Safari、实体双指手感及长时间难度调优仍需在 M5 验证。音效不在此次交付范围。
