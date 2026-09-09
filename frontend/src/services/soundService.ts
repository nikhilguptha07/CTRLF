// Web Audio API Procedural Synthesizer & Audio Manager
// Implements all 7 requested soundscapes without requiring external assets:
// 1. ambient-room
// 2. camera-servo
// 3. camera-power
// 4. scan-loop
// 5. detected
// 6. failed
// 7. transition

class SoundService {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterVolume: number = 0.65;
  private masterGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private isAmbientRunning: boolean = false;

  private initContext() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public enableAudio() {
    this.initContext();
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : this.masterVolume, this.ctx.currentTime, 0.05);
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.05);
    }
  }

  public getVolume(): number {
    return this.masterVolume;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  // 1. Ambient Room Drone (filtered low-frequency ventilation hum)
  public startAmbientRoom() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isAmbientRunning) return;
    this.isAmbientRunning = true;

    try {
      // Noise buffer for room air
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99 * b0 + white * 0.05;
        b1 = 0.95 * b1 + white * 0.1;
        b2 = 0.85 * b2 + white * 0.2;
        output[i] = (b0 + b1 + b2) * 0.1;
      }

      const noiseNode = this.ctx.createBufferSource();
      noiseNode.buffer = noiseBuffer;
      noiseNode.loop = true;

      const lowpass = this.ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(140, this.ctx.currentTime);

      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(55, this.ctx.currentTime); // 55Hz sub hum

      const oscGain = this.ctx.createGain();
      oscGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      this.ambientGain.gain.exponentialRampToValueAtTime(0.08, this.ctx.currentTime + 3.0);

      noiseNode.connect(lowpass);
      lowpass.connect(this.ambientGain);
      osc.connect(oscGain);
      oscGain.connect(this.ambientGain);
      this.ambientGain.connect(this.masterGain);

      noiseNode.start();
      osc.start();
    } catch {
      // Gracefully handle browser policy
    }
  }

  // 2. Camera Servo Motor Hum (pitch-modulated mechanical pan sound)
  public playCameraServo(duration: number = 1.2) {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      // Stepper motor tone ~380Hz with vibration modulation
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(360, t);
      osc.frequency.linearRampToValueAtTime(420, t + duration * 0.5);
      osc.frequency.linearRampToValueAtTime(350, t + duration);

      lfo.type = 'square';
      lfo.frequency.setValueAtTime(28, t);
      lfoGain.gain.setValueAtTime(45, t);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(650, t);
      filter.Q.setValueAtTime(4.0, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.035, t + 0.08);
      gain.gain.setValueAtTime(0.035, t + duration - 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      lfo.start(t);
      osc.start(t);
      lfo.stop(t + duration);
      osc.stop(t + duration);
    } catch {
      // Ignore
    }
  }

  // 3. Camera Power On Sound (sub bass impact + electronic charge ascent)
  public playCameraPower() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const t = this.ctx.currentTime;

      // Sub drop
      const sub = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(110, t);
      sub.frequency.exponentialRampToValueAtTime(32, t + 0.9);

      subGain.gain.setValueAtTime(0.25, t);
      subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);

      sub.connect(subGain);
      subGain.connect(this.masterGain);

      // High charge sweep
      const charge = this.ctx.createOscillator();
      const chargeGain = this.ctx.createGain();
      charge.type = 'triangle';
      charge.frequency.setValueAtTime(220, t + 0.1);
      charge.frequency.exponentialRampToValueAtTime(1450, t + 0.7);

      chargeGain.gain.setValueAtTime(0.001, t + 0.1);
      chargeGain.gain.linearRampToValueAtTime(0.08, t + 0.5);
      chargeGain.gain.exponentialRampToValueAtTime(0.001, t + 0.85);

      charge.connect(chargeGain);
      chargeGain.connect(this.masterGain);

      sub.start(t);
      sub.stop(t + 0.95);
      charge.start(t + 0.1);
      charge.stop(t + 0.9);
    } catch {
      // Ignore
    }
  }

  // 4. Radar Scan Loop Pulse (surveillance optical radar ping)
  public playScanPulse() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.exponentialRampToValueAtTime(440, t + 0.18);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(880, t);
      filter.Q.setValueAtTime(5.0, t);

      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.25);
    } catch {
      // Ignore
    }
  }

  // 5. Detection Success Chime (affirmative high-tech harmonic lock)
  public playDetected() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const t = this.ctx.currentTime;
      // Musical chord: E5 (659.25), G#5 (830.61), B5 (987.77), E6 (1318.51)
      const frequencies = [659.25, 830.61, 987.77, 1318.51];

      frequencies.forEach((freq, index) => {
        if (!this.ctx || !this.masterGain) return;
        const noteTime = t + index * 0.08;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0.001, noteTime);
        gain.gain.linearRampToValueAtTime(0.12 / (index + 1), noteTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 1.2);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(noteTime);
        osc.stop(noteTime + 1.25);
      });
    } catch {
      // Ignore
    }
  }

  // 6. Detection Failed Alarm (dissonant warning buzz)
  public playFailed() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const t = this.ctx.currentTime;
      [0, 0.22].forEach((offset) => {
        if (!this.ctx || !this.masterGain) return;
        const pulseTime = t + offset;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(220, pulseTime);
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(233.08, pulseTime); // Minor second dissonance

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, pulseTime);

        gain.gain.setValueAtTime(0.12, pulseTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, pulseTime + 0.18);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc1.start(pulseTime);
        osc2.start(pulseTime);
        osc1.stop(pulseTime + 0.2);
        osc2.stop(pulseTime + 0.2);
      });
    } catch {
      // Ignore
    }
  }

  // 7. Master Transition Swoosh (deep cinematic whoosh into darkness)
  public playTransition() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const t = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * 1.5;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, t);
      filter.frequency.exponentialRampToValueAtTime(120, t + 1.4);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.45);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noise.start(t);
      noise.stop(t + 1.5);
    } catch {
      // Ignore
    }
  }
}

export const soundService = new SoundService();
