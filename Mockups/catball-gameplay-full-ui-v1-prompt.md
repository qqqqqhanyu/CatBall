# CatBall 完整游戏界面样稿 v1

Tool: built-in image_gen
References: catball-field-v1.png; Image/坚果.png.

静态桌面端正常游玩样稿，未实现游戏代码。场地居中，顶部显示玩家头像、生命、存活时间、分数与暂停按钮；底部显示移动键位、踢飞次数及 Kick / Roll 状态。场内无事件表情气泡。

示例数据：生命 2/3；存活 01:24；成功 Kick 2 次；得分 940（84×10 + 2×50）；Kick 可用；Roll 剩余冷却 6.4 秒。数据仅用于展示 UI 状态，不修改玩法数值。HUD 头像参考原始角色图生成，不代表已完成精确切图。

## Prompt

Use case: ui-mockup.
Asset type: polished complete desktop browser gameplay screen for the user's CatBall game, a STATIC visual mockup.
Create one landscape 16:9 image, approximately 1920 x 1080, with a complete readable game HUD around the established pixel-art school dodgeball arena.

INPUT REFERENCES:
Image 1, catball-field-v1.png: the established arena and all five pixel-art characters. This is the PRIMARY reference for scene design, palette, character appearances, fixed overhead camera, objects, and proportions.
Image 2, original 坚果 character design sheet: supporting identity reference for the SMALL player portrait in the upper-left HUD. Use the focused portrait from the LOWER-LEFT of the sheet's upper-right 2x2 expression grid; faithfully preserve the original detailed silver-white fur, blue eyes and blue school-jacket collar. Do not copy sheet text, blue brushstrokes, full-body artwork or other portraits.

COMPOSITION:
A credible finished game screenshot, not a browser or device mockup, poster, wireframe, concept board, or menu.
Use a slim dark navy pixel-edged STATUS BAR across the top (about 10% of canvas height), a large uncluttered PLAY AREA in the middle (about 80%), and a slim dark navy CONTROL STRIP at bottom (about 10%). Keep all HUD elements outside the blue playable court. Build clean alignment, comfortable internal padding and strong numerical hierarchy. No sidebar. No floating panels covering actors, balls, or court boundaries. All four perimeter throwers must be entirely visible, including the bottom poodle above the footer.
UI uses restrained dark navy, cream-white labels, warm yellow highlights, coral-red health hearts, orange Kick accent and cyan-blue Roll accent. Borders have clean stepped pixel corners and subtle dark shadows; no shiny futuristic interface, heavy ornament or glassmorphism. Large readable numbers, tidy Chinese labels, crisp block-like lettering. Match the established friendly game style.

TOP STATUS BAR:
LEFT: one compact framed portrait of 坚果 from the supplied original focused expression, approximately 72-80px square, detailed source-art rendering inside the portrait frame. To its right show name exactly "坚果" and three large pixel hearts in a row: TWO filled coral-red hearts, ONE dim navy-gray empty heart outline. Small supporting number exactly "2/3". Maximum health is three, not four or five.
CENTER, centered on canvas: small label exactly "存活时间", below it large bright cream-white timer exactly "01:24". This is elapsed survival time, not time remaining.
RIGHT: label exactly "SCORE" and bold warm-yellow number exactly "00940". Further right, a separated square pause button with two vertical pause bars and tiny "ESC" key hint. Clear spacing, no overlap. Keep player health, time and score visually balanced.

MAIN SCENE, NORMAL ACTIVE PLAY:
Recompose the reference arena to fit inside the HUD bands while maintaining the same overhead view and recognizable balanced scene: blue rectangular sports court with white boundary, center line and circle; surrounding red running track with white lines; a little school facade and green trees at the top, grass at the margins. Keep the whole blue court boundary visible and make the court the dominant visual area.
Exactly FIVE uniformed animal characters: central player 坚果, silver-white cat with blue eyes and blue-white uniform, just left of the center circle on a small flat yellow ground indicator; pure white cat 元宵 at the top track; gray tabby 球球 at the left track; dark-mask point cat 赛赛 at the right track; gray curly poodle 欢欢 at the bottom track. Copy their recognizable pixel sprite design and scale from reference 1; no sixth character, clones or substitutions.
A small yellow duck, naturally two-legged and NOT in clothes, chases from the upper-right area of the court. One small orange normal ball in lower-left area and one golden large ball about 2.5 times its diameter in lower-right area. Give balls short straight trailing streaks to indicate movement, not curved homing paths. Preserve quiet empty space for dodging. Player is standing/moving normally, NOT kicking, NOT rolling, NOT flinching.
This is normal gameplay, with no active event bubbles. ZERO speech bubbles, ZERO floating enlarged character faces, NO "NICE KICK!", NO damage popup, no active shield, countdown, celebration or shocked indicator. The one small fixed HUD portrait is the only detailed face outside the sprites.

BOTTOM CONTROL STRIP:
LEFT: a compact tidy keyboard hint with small pixel keycaps reading "W A S D", a small four-direction-arrow icon group, and text exactly "移动". These are PC instructions, not a touch joystick.
CENTER: a small tasteful warm-yellow "CatBall" wordmark; below or beside it a very small duck icon and exact text "KICK × 2", representing two previous successful kicks. Keep this secondary and compact. Sample score is consistent: 84 survival seconds x10 + 2 kicks x50 =940.
RIGHT: two adjacent clean skill panels, each roughly 170-190px wide, equal height, comfortably spaced.
KICK panel: simple pixel shoe/kicking-foot icon, exact large label "KICK", small keycap "SPACE", and status "READY" in a warm bright accent. Ready state is visibly active.
ROLL panel: simple ROUND blue-white rolled-up ball icon with no protruding ears, legs or tail, exact large label "ROLL", small keycap "SHIFT", and remaining cooldown exactly "6.4s". Cooldown state is dimmer and has a small horizontal blue refill bar approximately 36% filled. The remaining timer is 6.4 seconds of a 10-second cooldown. Do not show a ready label on Roll.
The panels are skill indicators for desktop, not huge mobile action buttons. Keep all labels legible and avoid redundant full instructions.

CONSTRAINTS:
Preserve the established character identities and pixel scene aesthetic. Only the fixed HUD player portrait retains original detailed artwork. No invented weapons, stats, upgrades, shop, XP bar, level, currency, enemies, minimap, inventory or extra game mechanics. No browser chrome, mouse pointer, watermark, debug coordinates, explanatory annotations or decorative text.
Render the specified Chinese and Latin text accurately. All health, timer, score, pause and skill information must be fully visible and separated. The arena must remain spacious and readable, with no overlap between HUD and game objects.
