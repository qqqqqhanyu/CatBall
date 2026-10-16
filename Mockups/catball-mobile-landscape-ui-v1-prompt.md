# CatBall 手机横屏界面样稿 v1

Tool: built-in image_gen
Reference: catball-gameplay-full-ui-v1.png.

静态手游横屏样稿：左下虚拟摇杆，右侧下部为 Kick / Roll 两个独立触控按钮；顶部保留角色头像、三格血量、存活时间、分数与暂停。移除桌面键位与底栏，利用两侧草地布置触控区域，保留完整蓝色球场及四名场外角色的可见性。

示例状态：正常游玩、无事件表情气泡；生命 2/3，存活 01:24，得分 940；Kick 可用，Roll 剩余冷却 6.4 秒。本图只用于视觉讨论，不代表已实现触控、设备适配或验证按钮触达范围。后续实现应保持逻辑世界尺寸，按设备安全区适配并检查投球者移动至角落时与触控区域的重叠。

## Prompt

Use case: ui-mockup.
Asset type: CatBall MOBILE LANDSCAPE gameplay interface, static screen design.
Create one complete mobile gameplay screenshot using the supplied desktop screenshot as the established visual reference. Adapt the layout thoughtfully for TWO-THUMB TOUCH CONTROLS. A wide 20:9 landscape canvas, approximately 2160 x 972 pixels. The output is the game screen itself, not a picture of a phone.

REFERENCE ROLE:
The supplied image is the desktop CatBall UI. Preserve its exact world style and identities: pixel-art school playground, blue court, red track, school and trees, five animal characters in blue uniforms, a yellow duck, orange normal ball and larger golden ball. Preserve the identity and original detailed-art style of the small fixed player portrait. Redesign UI placement for mobile. This is a normal gameplay snapshot, not Kick, Roll, injury or countdown.

MOBILE COMPOSITION:
Slim navy HUD strip at the top, around 11% of image height. Below is the full familiar fixed-camera arena centered on screen. Allow wider grass margins at the LEFT and RIGHT for comfortable thumb controls. Use the extra horizontal space for controls, not for changing the playable world. Keep the complete blue court, all four outside throwers, red track, and bottom poodle visible.
Center the playable scene in approximately the middle 70% of screen width. Scale the whole established arena uniformly as needed to fit, keeping the same rectangular court proportions and actor-to-court size relationships. Do not crop the arena, elongate the court or increase playable territory. Court and character outlines are crisp.
Use the side grass margins and lower corner spaces for touch controls. All control disks must lie OUTSIDE the blue playable court and must not hide any of the five actors. There must be clear visual gaps between controls, red track throwers, and ball paths.
No solid sidebars, no heavy bottom toolbar. The grass naturally continues beneath the subtle translucent controls. Leave the bottom center open for the poodle and court. Allow comfortable safe insets at the left/right edges and along the bottom, with no UI clipped by the screen. Do not draw a notch, hardware bezel, browser chrome or operating-system bars.

TOP HUD:
At left: small fixed framed portrait of 坚果 copied faithfully from reference, text "坚果", exactly THREE heart slots: TWO filled coral red pixel hearts and ONE gray empty heart. The hearts and portrait must be large enough to read on a phone.
At exact screen center: small label "存活时间" above large cream-white timer "01:24".
At right: small "SCORE" label with gold number "00940", and a separate large square pause button with two vertical bars. Pause button is a credible touch target with generous surrounding spacing.
No keyboard key hints anywhere. No ESC, SPACE, SHIFT, WASD, arrows arranged as keyboard keys, cursor or desktop footer. Omit redundant "2/3" if needed for clean phone spacing; three visible heart slots clearly show 2/3 health.

LEFT THUMB CONTROL:
One large semi-transparent virtual analog joystick low on the LEFT grass margin, around x=8%, y=76%. Outer circle diameter around 200px in a 2160px canvas, with stepped navy outline, translucent light-blue interior, subtle four-direction tick marks, and a smaller movable thumb disk. Show the thumb disk slightly displaced toward upper-right to imply movement. It must unmistakably read as a touch joystick, not a D-pad or keyboard. Discrete, readable, no big instruction text.
The joystick should be visually quiet and never overlap the left tabby, the running track boundary, the player, or the orange ball.

RIGHT THUMB ACTIONS:
Two separate circular touch buttons in the RIGHT-side lower grass margin, comfortably separated and staggered diagonally:
- Primary KICK button larger and lower, around x=93%, y=79%, roughly 190px diameter: dark navy semi-transparent fill, bold warm golden-orange pixel border, familiar blue-white kicking shoe icon from reference, and exact label "KICK". A small "READY" label indicates ready state. It must look clearly active.
- Secondary ROLL button slightly smaller and higher-left of KICK, around x=88%, y=56%, roughly 160px diameter: navy fill and cyan-blue border, compact ROUND blue-white curled-up player ball icon with no protruding ears or tail, exact label "ROLL", and cooldown number "6.4s". Muted cooldown appearance plus a progress arc showing about 36% recovered, rather than an arbitrary full glowing ring.
No overlaps between these two touch targets. Do not put ROLL on top of the right-side Siamese thrower. Adjust their positions within the right margin as needed to maintain visible separation from the arena and actors. Large touch targets and ample thumb room matter more than exact coordinate suggestions.
Both are action buttons, not keyboard-themed rectangular cards.

SCENE INVARIANTS:
Exactly five uniformed animal characters: central silver-white blue-eyed 坚果 on yellow ground ring just left of center circle; pure white 元宵 at top; gray tabby 球球 at left; dark-mask point cat 赛赛 at right; gray curly poodle 欢欢 at bottom.
One natural yellow duck chasing inside the upper-right court, no uniform. One small orange ball lower-left and one larger golden ball lower-right with short straight motion trails. Keep small sprite style consistent with supplied reference.
No expression bubbles anywhere during this normal gameplay snapshot. No floating large portrait faces, no hit effects, no NICE KICK, no roll afterimages. Only the small fixed player HUD portrait uses detailed original-art fur.
Keep a clean, bright and spacious schoolyard. Detailed grass background must not compete with controls. Do not add weapons, coins, levels, inventory, minimap, upgrades, extra actors, large title logo, explanatory callouts, arrows pointing to UI, hands, fingers, screenshots within screenshots or watermark.
All specified text and numbers must be crisp and accurate. Friendly restrained navy/cream/gold/cyan pixel UI, consistent with the desktop screenshot, adapted to phone ergonomics.
