# CatBall · 校园躲避球

手机横屏优先的轻量网页游戏，使用 **Phaser 3 + TypeScript + Vite**。已接通 **M0–M4：选人、移动、弹幕、追踪冲刺动物、Kick / Roll、增益与原图表情**，并补充 **M5 浏览器兼容、历史纪录及边界回归测试**。

实际运行截图：[手机 Kick](docs/previews/m4/mobile-kick.png) · [野猪冲刺](docs/previews/m4/mobile-boar-dash.png) · [猫条无敌](docs/previews/m4/mobile-treat-pickup.png) · [圆球翻滚](docs/previews/m4/mobile-roll.png) · [原图命中表情](docs/previews/m4/mobile-hit.png) · [选人界面](docs/previews/v2/mobile-selection.png)。[M3 / M4 验证记录](docs/M3-M4-validation.md)。

## 本轮可以做什么

- 从坚果、元宵、球球、赛赛、欢欢、阿福中选一位。原始设定图用于头像，独立透明立绘用于已选角色展示；选中高亮、学校名称和上次选择会保留。
- 进入固定操场，剩余五名角色中随机抽选四名，不重复、不包含玩家，四侧各一名。
- 经过 3 秒倒计时后，用手机虚拟摇杆或键盘在蓝色球场内自由移动。斜向速度归一化；摇杆支持慢走和八方向，碰撞圆始终留在场内。
- 暂停、继续、重新开始、返回选人。切后台、失去窗口焦点、手机转为竖屏会暂停并清除输入。
- 手机横屏界面优先，触控区域在场地两侧；横竖屏切换不改变逻辑地图或角色位置。桌面也可用键盘或鼠标拖动摇杆。
- 四名投球者沿跑道随机顺逆时针移动、绕过四角并保持间距；蓄力 0.5 秒时停下，离手瞬间瞄准玩家。
- 橙色普通球、青色三射球（±20°）、金色大球（半径 2.5 倍）。球离手后匀速直行，场外移除；最多 24 球，满额时延后发射。
- 全场共用一个难度调度器：0 / 30 / 60 / 120 / 180 秒进入五个阶段，投球间隔、特殊球概率和球速按规格逐渐提升。
- 三颗心；每次有效命中扣一颗，受伤闪烁并获得 1.2 秒无敌，期间可以移动。每秒生存 +10 分，0 HP 后冻结整局并展示 Game Over、成绩与本地纪录。

- 鸭子 / 野猪持续追踪，蓄力预警后加速冲刺；无敌时也保持追踪。首次 18–32 秒出现，场内最多一只，只有被 Kick 才消失并安排下一次刷新。
- Kick 范围 72 世界单位，CD 0.8 秒，成功 +50 分；全场冻结 0.5 秒后，四名投球者震惊 3 秒，移动、投球调度及蓄力速度减半。已飞出的球保持原速。空踢也消耗 CD，不能踢球。
- Roll 锁定方向翻滚 144 世界单位 / 0.45 秒，CD 10 秒；全程无敌、圆形毛球与残影，全场没有气泡。支持左手持续移动、右手点技能；Kick 定格不会丢失持续按住的摇杆。
- 南瓜 +1 心、上限 3；猫条无敌 5 秒，重复拾取刷新时长。道具随机等待 20–30 秒，最多一个，10 秒未拾取消失。Roll、受伤保护、猫条分别计时，免疫效果可以并存。
- 表情来自六角色原设计图：开场五人专注；Kick 玩家自信、四人惊讶；被球击中时只有玩家惊讶和实际发射者开心（震惊中仍惊讶）；拾南瓜开心、猫条自信。气泡避让标题、角色、来球和控件。
- HUD 实时显示 HP、时间、分数、踢飞次数、技能冷却、受伤保护、猫条、震惊及动物状态。暂停、后台、竖屏和 Game Over 停止相应游戏计时。

## 本地运行

需要 Node.js **22.12+**，推荐 Node 22 LTS。

```sh
npm ci
npm run dev
```

打开终端打印的 `/CatBall/` 地址，默认 `http://localhost:5173/CatBall/`。手机和电脑在同一局域网时，手机可打开终端打印的 Network 地址；电脑需要允许该端口的局域网连接。

```sh
npm test          # 纯逻辑单元测试
npm run build    # TypeScript 检查与生产构建
npm run preview  # 检查生产构建，默认 http://localhost:4173/CatBall/
npm run test:e2e # 浏览器集成测试
```

开发模式可用 `/CatBall/?seed=43` 重现包含三射、大球、普通球的一局，便于复查；生产版本不启用固定种子或调试接口。

本地快速验收可加 `&scenario=kick-duck`、`kick-boar`、`dash-duck`、`dash-boar`、`pumpkin` 或 `treat`。这些开发专用场景从 20 秒的预设状态开始，便于立即测试正常技能/拾取交互；并非自然出生时刻，也不会进入生产包。正式游戏仍从 0 秒开始，按规则自然刷新。

浏览器测试包含桌面 / 手机 Chromium 和移动 WebKit。先运行 `npx playwright install chromium webkit`，再使用 `PLAYWRIGHT_BUNDLED=1 npm run test:e2e`；不设置该变量时 Chromium 项目使用本机 Google Chrome。CI 安装两个引擎，失败时保留 7 天 trace 和截图。WebKit 的兼容套件覆盖布局、生命周期、技能、纪录及缺失资源；CDP 双指测试只在 Chromium 执行。

## 操作

| 操作 | 手机横屏 | 桌面 |
| --- | --- | --- |
| 移动 | 左侧摇杆，支持小幅拖动慢走 | WASD / 方向键 / 鼠标拖动摇杆 |
| Kick | 右侧 KICK | Space / KICK 按钮 |
| Roll | 右侧 ROLL | Shift / ROLL 按钮 |
| 暂停 | 右上角暂停 | 暂停按钮 / Esc |
| 继续、重开、选人 | 暂停菜单；结束后可再来一次或选人 | 同左 |

竖屏时显示横屏提示。恢复横屏后需要手动继续，避免玩家还没握稳手机就开始移动。页面没有依赖全屏权限或强制方向锁定。

## 美术与体积

- `Image/`、`Sample/`、`Mockups/` 保持不变，不直接复制到发布目录。
- `public/assets/characters/`：六张原设定图的全分辨率 WebP 副本。卡片和 HUD 使用原头像的 SVG 展示窗口。
- `Art/generated/`：依据已确认样稿，由内置 imagegen 整理的两版空操场、六角色像素图集、两组透明立绘、标题。是参考图派生素材，并非逐像素无损抠图。原始 PNG 和完整提示词、来源保存在 `Art/asset-provenance.json` 和 `Art/movement-provenance.json`。
- `public/assets/art/`：上述素材的 WebP 发布副本，保留 alpha 和尺寸。
- `src/render/projection.ts`：按屏幕比例选用桌面/宽屏背景，背景与人物各自等比缩放，逻辑坐标映射到画面中带轻微透视的球场。横竖屏切换不修改世界位置或碰撞规则。
- 六名角色均有四帧腿部行走动画：步频跟随实际位移，静止或撞边回站立，暂停保留动作帧。当前采用正面略侧的视角与左右镜像；另有独立踢腿姿势，Roll 为圆形像素毛球。坚果为白毛、灰耳灰尾、蓝眼；欢欢为短尾。完整背面动作尚未制作。
- M2 复用现有五名在场角色的四帧行走图集，不重绘已确认画风。球为运行时生成的 32×32 像素贴图，不增加图片下载；蓄力、命中反馈由代码绘制。
- M3 / M4 增加 `characters-kick-v1.webp` 与 `animals-items-v1.webp`，共约 585 KB；对应原 PNG 在 `Art/generated/`。内置 imagegen 的完整提示词、输入图和来源见 [动物/道具记录](Art/m4-provenance.json)、[Kick 记录](Art/m4-kick-provenance.json)。四表情复用原图，不新增六套表情图片。
- 素材下载失败时仍有名称、代码操场与像素占位；不会阻塞进入游戏。

画布按屏幕像素密度渲染（上限 2 倍），避免高分辨率手机把低分辨率画布放大。Phaser 在点击「开始游戏」后加载。当前生产目录约 **6.6 MB**，引擎与场景包 gzip 约 329 KB；没有外部字体、CDN、账户或后端请求。

```sh
npm run assets
```

该脚本仅转换 WebP 编码，不降低图片尺寸，也不做去背景或重绘。头像窗口和立绘图集窗口定义在 `src/data/characters.ts`，场内图集窗口在 `src/scenes/GameScene.ts`。

## 文件结构

```text
src/
  config/gameConfig.ts        固定世界、场地、速度、碰撞与摇杆参数
  data/characters.ts          六角色资料、原图地址与展示窗口
  render/                    响应式投影、图集窗口与缺失素材回退
  systems/CharacterAnimation.ts 位移驱动步态与独立动作时序
  systems/Session.ts         会话、移动、球体、碰撞、受伤、暂停与结束
  systems/AttackDirector.ts 四名投球者和唯一的全场攻击调度
  systems/DifficultyDirector.ts 难度阶段、间隔抖动和球种选择
  systems/AnimalDirector.ts 单只动物的追踪、预警、冲刺、踢飞与刷新
  systems/ItemDirector.ts   安全位置、拾取与过期计时
  systems/ExpressionSystem.ts 四表情优先级、事件归因与气泡可见性
  systems/InputController.ts 键盘、Pointer Events 摇杆、输入释放
  ui/ExpressionOverlay.ts  原图头像气泡与动态避让
  scenes/GameScene.ts        Phaser 场景与角色显示
  game.ts                    延迟加载 Phaser
  main.ts                    选人、HUD、暂停、结算和页面生命周期
  style.css                  横屏优先布局与安全区
tests/unit/                  抽签、运动、难度、弹道、伤害、时钟、纪录测试
tests/e2e/                   选人记忆、多指触控、旋转、重开与真实页面检查
```

## GitHub Pages

目标仓库：<https://github.com/qqqqqhanyu/CatBall>。

已设置 Vite `base: '/CatBall/'`，资源地址也使用相同基础路径。仓库配置包含：

- `Check CatBall`：push / pull request 时构建并运行测试。
- `Publish to GitHub Pages`：**手动运行**的发布工作流，不随 push 自动发布。

首次发布时：

1. 将本地代码提交并推送到上述仓库的 `main`。
2. 在仓库 **Settings → Pages → Source** 选择 **GitHub Actions**。
3. 在 **Actions → Publish to GitHub Pages → Run workflow** 手动运行。
4. 成功后预期地址为 `https://qqqqqhanyu.github.io/CatBall/`。

站点地址：[CatBall 在线试玩](https://qqqqqhanyu.github.io/CatBall/)。发布状态与日志见 [GitHub Actions](https://github.com/qqqqqhanyu/CatBall/actions/workflows/pages.yml)。后续更新需要先推送代码，再手动运行发布工作流。配置依据 [Vite 官方 GitHub Pages 部署说明](https://vite.dev/guide/static-deploy.html#github-pages)。

## 后续里程碑

完整规则在 `Protocol/GAME_SPEC_V1.0.md`，角色规范在 `Protocol/ASSET_GUIDE.md`。第 18 节已按本轮讨论拆分 M0 / M1，并将手机适配前移；原有 Kick 五气泡、被球命中两气泡、Roll 零气泡规则保留。

**M5 验证记录**：[测试范围、修复与真机待验项](docs/M5-validation.md)。涵盖 568×320 到 1024×768 的横屏布局、桌面 1440×900、Chromium / WebKit、存储和图片故障回退、晚期难度长局模拟。低帧率下倒计时与 Kick 停顿按真实帧间隔计时，物理步长仍最多 50ms，防止卡顿后突然跳跃；持续低于 20fps 时游戏会慢下来。

浏览器模拟不等同于真实手机。实体 iPhone Safari、Android 双指手感、刘海安全区与长期发热 / 难度体验仍需真机试玩；这些尚未标记通过。当前没有音效。

移动效果录像：[坚果](docs/previews/movement/silver_cat-walk.webm) · [欢欢](docs/previews/movement/poodle-walk.webm)。
