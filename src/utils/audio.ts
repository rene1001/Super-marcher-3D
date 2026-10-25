/**
 * Procedural Web Audio API sound generator for the Supermarket 3D experience.
 * Zero external audio file dependencies.
 */

class SoundController {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private cartRumbleOsc: OscillatorNode | null = null;
  private cartRumbleGain: GainNode | null = null;

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.isMuted ? 0 : 0.6;
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.6, this.ctx.currentTime);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Barcode scanner laser beep
   */
  public playScannerBeep() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1760, this.ctx.currentTime); // A6
    osc.frequency.setValueAtTime(2093, this.ctx.currentTime + 0.04); // C7

    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  /**
   * Item pick up / hover pop
   */
  public playPick() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.09);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.09);
  }

  /**
   * Item dropped into shopping cart basket (satisfying soft metallic clink)
   */
  public playDropInCart() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    
    // Metallic resonant chime
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(620, t);
    osc1.frequency.exponentialRampToValueAtTime(520, t + 0.18);
    gain1.gain.setValueAtTime(0.2, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start(t);
    osc1.stop(t + 0.18);

    // Basket wire thud
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(140, t);
    gain2.gain.setValueAtTime(0.3, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start(t);
    osc2.stop(t + 0.15);
  }

  /**
   * Cash register drawer open and coin bell ("Ka-ching!")
   */
  public playCashRegister() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;

    // First bell chime
    const bell1 = this.ctx.createOscillator();
    const bell1Gain = this.ctx.createGain();
    bell1.type = 'sine';
    bell1.frequency.setValueAtTime(1318.51, t); // E6
    bell1Gain.gain.setValueAtTime(0.3, t);
    bell1Gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    bell1.connect(bell1Gain);
    bell1Gain.connect(this.masterGain);
    bell1.start(t);
    bell1.stop(t + 0.35);

    // Second bell chime
    const bell2 = this.ctx.createOscillator();
    const bell2Gain = this.ctx.createGain();
    bell2.type = 'sine';
    bell2.frequency.setValueAtTime(1975.53, t + 0.08); // B6
    bell2Gain.gain.setValueAtTime(0.35, t + 0.08);
    bell2Gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    bell2.connect(bell2Gain);
    bell2Gain.connect(this.masterGain);
    bell2.start(t + 0.08);
    bell2.stop(t + 0.5);
  }

  /**
   * Update cart movement sound (subtle rolling squeak/rumble)
   */
  public updateCartMovement(speed: number) {
    if (this.isMuted) {
      if (this.cartRumbleGain && this.ctx) {
        this.cartRumbleGain.gain.setValueAtTime(0, this.ctx.currentTime);
      }
      return;
    }
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    if (!this.cartRumbleOsc) {
      this.cartRumbleOsc = this.ctx.createOscillator();
      this.cartRumbleGain = this.ctx.createGain();
      this.cartRumbleOsc.type = 'triangle';
      this.cartRumbleOsc.frequency.setValueAtTime(65, this.ctx.currentTime);
      this.cartRumbleGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.cartRumbleOsc.connect(this.cartRumbleGain);
      this.cartRumbleGain.connect(this.masterGain);
      this.cartRumbleOsc.start();
    }

    if (this.cartRumbleGain) {
      const targetGain = Math.min(speed * 0.12, 0.15);
      this.cartRumbleGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    }
    if (this.cartRumbleOsc) {
      const targetFreq = 50 + speed * 25;
      this.cartRumbleOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.05);
    }
  }

  /**
   * Notification sound for delivery dispatch
   */
  public playDispatchSound() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + i * 0.07);
      gain.gain.setValueAtTime(0.2, t + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.25);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + i * 0.07);
      osc.stop(t + i * 0.07 + 0.25);
    });
  }
}

export const sounds = new SoundController();
