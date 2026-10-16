# 样图派生素材

2026-10-16，使用内置 `imagegen`（非 CLI）生成。原始 Image、Sample、Mockups 未修改。

| 文件 | 用途 / 参考 |
| --- | --- |
| generated/arena-desktop-v2.png | 从 catball-field-v1 整理空操场 |
| generated/arena-mobile-v2.png | 从手机横屏样稿整理空操场 |
| generated/characters-idle-v2.png | 五个样稿角色 + 阿福原设定，六角色透明像素图集 |
| generated/heroes-a-v3.png | 坚果 / 元宵 / 球球透明立绘，按三等分列展示 |
| generated/heroes-b-v3.png | 赛赛 / 欢欢 / 阿福透明立绘，按三等分列展示 |
| generated/logo-v2.png | 从选人样稿整理透明标题 |

完整输入、精确提示词、工具输出路径及立绘边界修订记录见 `asset-provenance.json`。这些是生成式派生素材，不能视为逐像素无损抠图。卡片和 HUD 头像继续直接显示用户原图。

PNG 是保留原稿；`npm run assets` 仅将它们转换成 `public/assets/art/` 下的 WebP，保留尺寸及 alpha。全身图集的 v2 因脚部接近相邻列而弃用，最终使用 v3；弃用版本不参与发布。

## 场内形象与步态修订

最新站立图集：`generated/characters-idle-v3.png`，修正坚果灰耳灰尾/白毛/蓝眼和欢欢短尾。
六个 `generated/<id>-walk-v1.png` 为行走动作图集；保留 PNG，发布 WebP。
本轮使用内置 imagegen，精确提示词、输入与来源另存 `movement-provenance.json`。
旧站立图集仍作历史稿保留，不进入发布目录。
实际运行录像和截图位于 `docs/previews/movement/`。
