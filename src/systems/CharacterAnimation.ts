/** Animation timing is independent of rendering and collision geometry. */
export type CharacterMotion = "idle" | "walk" | "kick" | "roll";
export interface ActionClip {
  state: "kick" | "roll";
  frameCount: number;
  duration: number;
}
export interface CharacterPose {
  state: CharacterMotion;
  frame: number;
}

export class CharacterAnimation {
  static readonly walkFrames = 4;
  static readonly strideDistance = 96;
  private distance = 0;
  private action: { clip: ActionClip; elapsed: number } | null = null;
  private pose: CharacterPose = { state: "idle", frame: 0 };

  /** Later combat code can play a one-shot clip without mixing it with walking. */
  playAction(clip: ActionClip): boolean {
    if (
      this.action ||
      !Number.isFinite(clip.duration) ||
      clip.duration <= 0 ||
      !Number.isInteger(clip.frameCount) ||
      clip.frameCount < 1
    )
      return false;
    this.action = { clip: { ...clip }, elapsed: 0 };
    this.pose = { state: clip.state, frame: 0 };
    return true;
  }

  update(seconds: number, travelled: number, frozen: boolean): CharacterPose {
    if (frozen || !Number.isFinite(seconds) || seconds < 0)
      return this.snapshot();
    if (this.action) {
      this.action.elapsed += seconds;
      const { clip, elapsed } = this.action;
      if (elapsed < clip.duration) {
        this.pose = {
          state: clip.state,
          frame: Math.min(
            clip.frameCount - 1,
            Math.floor((elapsed / clip.duration) * clip.frameCount),
          ),
        };
        return this.snapshot();
      }
      this.action = null;
      this.distance = 0;
    }
    if (Number.isFinite(travelled) && travelled > 0.001) {
      this.distance =
        (this.distance + travelled) % CharacterAnimation.strideDistance;
      this.pose = {
        state: "walk",
        frame:
          Math.floor(
            ((this.distance + 1e-7) / CharacterAnimation.strideDistance) *
              CharacterAnimation.walkFrames,
          ) % CharacterAnimation.walkFrames,
      };
    } else {
      this.distance = 0;
      this.pose = { state: "idle", frame: 0 };
    }
    return this.snapshot();
  }

  snapshot(): CharacterPose {
    return { ...this.pose };
  }
}
