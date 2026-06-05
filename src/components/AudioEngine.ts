class AudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private humNode: BiquadFilterNode | null = null;
  private humSource: AudioBufferSourceNode | null = null;
  private gainHum: GainNode | null = null;

  public init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.startAmbientHum();
    } catch (e) {
      console.warn('Audio Context not supported in this browser', e);
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.ctx) {
      if (this.isMuted) {
        this.gainHum?.gain.setValueAtTime(0, this.ctx.currentTime);
      } else {
        this.gainHum?.gain.setValueAtTime(0.04, this.ctx.currentTime);
      }
    }
  }

  public toggleMute(): boolean {
    this.setMute(!this.isMuted);
    return this.isMuted;
  }

  public getMuteStatus(): boolean {
    return this.isMuted;
  }

  private startAmbientHum() {
    if (!this.ctx || this.isMuted) return;

    // Create custom noise buffer for stadium background hum
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    // Fill with pink-ish noise
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      data[i] *= 0.11; // scale pink noise down
      b6 = white * 0.115926;
    }

    this.humSource = this.ctx.createBufferSource();
    this.humSource.buffer = buffer;
    this.humSource.loop = true;

    this.humNode = this.ctx.createBiquadFilter();
    this.humNode.type = 'lowpass';
    this.humNode.frequency.setValueAtTime(150, this.ctx.currentTime);

    this.gainHum = this.ctx.createGain();
    this.gainHum.gain.setValueAtTime(0.04, this.ctx.currentTime);

    this.humSource.connect(this.humNode);
    this.humNode.connect(this.gainHum);
    this.gainHum.connect(this.ctx.destination);

    this.humSource.start(0);
  }

  public playKick(intensity = 0.8) {
    this.init();
    if (!this.ctx || this.isMuted) return;
    
    const now = this.ctx.currentTime;
    
    // Low punch
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);
    
    gainNode.gain.setValueAtTime(intensity * 0.7, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);

    // Kicking impact noise
    const noise = this.ctx.createBufferSource();
    const noiseGain = this.ctx.createGain();
    const noiseFilter = this.ctx.createBiquadFilter();

    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    noise.buffer = buffer;
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(200, now);
    noiseFilter.Q.setValueAtTime(3, now);

    noiseGain.gain.setValueAtTime(intensity * 0.4, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + 0.07);
  }

  public playWhistle() {
    this.init();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc1.frequency.setValueAtTime(1300, now);
    osc2.frequency.setValueAtTime(1308, now); // beat factor for vibrato

    // Gentle frequency modulation for whistle blow sensation
    osc1.frequency.linearRampToValueAtTime(1330, now + 0.15);
    osc1.frequency.linearRampToValueAtTime(1290, now + 0.35);

    filter.type = 'highpass';
    filter.frequency.setValueAtTime(800, now);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.12, now + 0.05);
    gainNode.gain.linearRampToValueAtTime(0.1, now + 0.25);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.4);
    osc2.stop(now + 0.4);
  }

  public playCheer() {
    this.init();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const cheerDuration = 3.0;

    const bufferSize = this.ctx.sampleRate * cheerDuration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    // White noise for roaring sound
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    // Slowly shift filter from low-mid to high to simulate growing enthusiasm
    filter.frequency.setValueAtTime(250, now);
    filter.frequency.exponentialRampToValueAtTime(1200, now + 0.5);
    filter.frequency.exponentialRampToValueAtTime(400, now + cheerDuration);
    filter.Q.setValueAtTime(1.2, now);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.25, now + 0.3); // explosive swell
    gainNode.gain.exponentialRampToValueAtTime(0.12, now + 1.2);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + cheerDuration);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + cheerDuration + 0.1);

    // Warm underlying bass note for stadium vibe
    const synthTone = this.ctx.createOscillator();
    const synthGain = this.ctx.createGain();
    synthTone.type = 'sawtooth';
    synthTone.frequency.setValueAtTime(110, now);
    synthTone.frequency.exponentialRampToValueAtTime(130, now + 0.5);
    
    const toneFilter = this.ctx.createBiquadFilter();
    toneFilter.type = 'lowpass';
    toneFilter.frequency.setValueAtTime(300, now);

    synthGain.gain.setValueAtTime(0, now);
    synthGain.gain.linearRampToValueAtTime(0.05, now + 0.3);
    synthGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

    synthTone.connect(toneFilter);
    toneFilter.connect(synthGain);
    synthGain.connect(this.ctx.destination);

    synthTone.start(now);
    synthTone.stop(now + 1.6);
  }

  public playGasp() {
    this.init();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const duration = 1.0;

    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + duration);
    filter.Q.setValueAtTime(2.0, now);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.12, now);
    gainNode.gain.linearRampToValueAtTime(0.18, now + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + duration + 0.1);
  }

  public playWoodwork() {
    this.init();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;

    // High metal ring
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.frequency.setValueAtTime(880, now); // high metallic A
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);

    // Deep hollow resonance of goalpost
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.frequency.setValueAtTime(140, now); // low thud
    gain2.gain.setValueAtTime(0.4, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.5);
    osc2.stop(now + 0.5);
  }

  public playNetSwish() {
    this.init();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const duration = 0.45;

    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + duration);
    filter.Q.setValueAtTime(1.0, now);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.08, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + duration + 0.1);
  }
}

export const audioEngine = new AudioEngine();
