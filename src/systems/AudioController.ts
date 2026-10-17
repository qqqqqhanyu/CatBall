const SOUND_KEY = "catball.sound.v1";

/** One music player per page; the short, original meow is synthesized locally. */
export class AudioController {
  readonly music: HTMLAudioElement;
  enabled = true;
  private active = false;
  private unlocked = false;
  private context: AudioContext | null = null;
  private voice: OscillatorNode | null = null;
  private cleanupVoice: (() => void) | null = null;
  private observedKicks = 0;
  private meowCount = 0;

  constructor() {
    try { this.enabled = localStorage.getItem(SOUND_KEY) !== "off"; } catch { /* Optional storage. */ }
    this.music = new Audio(`${import.meta.env.BASE_URL}assets/audio/arcade-kid.m4a`);
    this.music.id = "catball-music";
    this.music.preload = "none";
    this.music.loop = true;
    this.music.volume = 0.3;
    this.music.hidden = true;
    document.body.append(this.music);
  }

  /** Call directly from a user gesture, before awaiting scene loading. */
  activate(): void {
    this.unlocked = true;
    if (!this.enabled) return;
    try {
      this.context ??= new AudioContext();
      void this.context.resume().catch(() => {});
    } catch { /* Music/gameplay still work without Web Audio. */ }
    if (this.active) this.playMusic();
  }

  startRound(): void {
    this.setActive(false);
    this.observedKicks = 0;
    this.music.currentTime = 0;
    this.active = true;
    this.activate();
  }

  toggle(): void {
    this.enabled = !this.enabled;
    try { localStorage.setItem(SOUND_KEY, this.enabled ? "on" : "off"); } catch { /* Optional storage. */ }
    if (this.enabled) this.activate();
    else this.silence();
  }

  setActive(active: boolean): void {
    if (active === this.active) return;
    this.active = active;
    if (active && this.enabled && this.unlocked) this.playMusic();
    else this.silence();
  }

  sync(phase: string, kickCount: number): void {
    this.setActive(phase === "COUNTDOWN" || phase === "PLAYING");
    // Observe successes even when muted: re-enabling sound must not replay them.
    if (kickCount > this.observedKicks && this.active && this.enabled) this.meow();
    this.observedKicks = kickCount;
  }

  private playMusic(): void {
    // Autoplay restrictions, offline media and unsupported codecs never block a round.
    void this.music.play().catch(() => {});
  }

  private silence(): void {
    this.music.pause();
    this.stopVoice();
    if (this.context?.state === "running") void this.context.suspend().catch(() => {});
  }

  private stopVoice(): void {
    if (!this.voice) return;
    this.voice.stop();
    this.cleanupVoice?.();
  }

  private meow(): void {
    const context = this.context;
    if (!context || context.state !== "running") return;
    this.stopVoice();
    const t = context.currentTime;
    const voice = context.createOscillator();
    const mouth = context.createBiquadFilter();
    const softness = context.createBiquadFilter();
    const gain = context.createGain();
    voice.type = "sawtooth";
    voice.frequency.setValueAtTime(550, t);
    voice.frequency.exponentialRampToValueAtTime(850, t + 0.1);
    voice.frequency.exponentialRampToValueAtTime(620, t + 0.28);
    voice.frequency.exponentialRampToValueAtTime(380, t + 0.58);
    mouth.type = "bandpass";
    mouth.Q.value = 1.1;
    mouth.frequency.setValueAtTime(1800, t);
    mouth.frequency.exponentialRampToValueAtTime(1200, t + 0.2);
    mouth.frequency.exponentialRampToValueAtTime(650, t + 0.6);
    softness.type = "lowpass";
    softness.frequency.value = 2600;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.22, t + 0.035);
    gain.gain.linearRampToValueAtTime(0.16, t + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.62);
    voice.connect(mouth).connect(softness).connect(gain).connect(context.destination);
    const cleanup = () => {
      voice.onended = null;
      voice.disconnect(); mouth.disconnect(); softness.disconnect(); gain.disconnect();
      if (this.voice === voice) { this.voice = null; this.cleanupVoice = null; }
    };
    voice.onended = cleanup;
    voice.start(t);
    voice.stop(t + 0.64);
    this.voice = voice;
    this.cleanupVoice = cleanup;
    this.meowCount++;
  }

  snapshot() {
    return { enabled: this.enabled, active: this.active, paused: this.music.paused,
      time: this.music.currentTime, loop: this.music.loop, context: this.context?.state ?? "unavailable", meowCount: this.meowCount };
  }
}
