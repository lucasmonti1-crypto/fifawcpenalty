class AudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private humNode: BiquadFilterNode | null = null;
  private humSource: AudioBufferSourceNode | null = null;
  private gainHum: GainNode | null = null;

  private shouldPlayIntro = false;
  private introEl: HTMLAudioElement | null = null; // the real WC2026 anthem (mp3)
  private unlockAttached = false;

  public init() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.warn('Audio Context not supported in this browser', e);
      }
    }
    // Browsers block audio until a user gesture. Attach a persistent unlock that
    // resumes the context AND (re)starts whatever should be playing on EVERY
    // interaction — robust against missed first-gestures. Cheap when already running.
    this.attachUnlock();
    this.resumeAll();
  }

  // Persistent unlock — never self-removes, so audio always recovers on any tap/click/key.
  private attachUnlock() {
    if (this.unlockAttached || typeof document === 'undefined') return;
    this.unlockAttached = true;
    const handler = () => this.resumeAll();
    document.addEventListener('pointerdown', handler);
    document.addEventListener('click', handler);
    document.addEventListener('keydown', handler);
    document.addEventListener('touchstart', handler, { passive: true });
  }

  // Make sure the audio context is running and the right tracks are playing.
  private resumeAll() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.isMuted) return;
    if (!this.humSource) this.startAmbientHum();
    if (this.shouldPlayIntro && this.introEl && this.introEl.paused) {
      this.introEl.play().catch(() => {});
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.isMuted) {
      if (this.ctx) this.gainHum?.gain.setValueAtTime(0, this.ctx.currentTime);
      // Pause the anthem WITHOUT clearing shouldPlayIntro so unmute can resume it
      if (this.introEl) this.introEl.pause();
    } else {
      if (this.ctx) this.gainHum?.gain.setValueAtTime(0.065, this.ctx.currentTime);
      if (this.shouldPlayIntro && this.introEl) {
        this.introEl.play().catch(() => {});
      } else {
        this.startAmbientHum();
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
    if (this.humSource) return; // already running

    // Create custom noise buffer for stadium background hum (4 seconds of unique noise)
    const bufferSize = this.ctx.sampleRate * 4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    // Fill with pink-ish noise for wind/distant crowd rumble
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
      data[i] *= 0.06; // scale pink noise down
      b6 = white * 0.115926;
      
      // Keep subtle remote horns and cheering spikes inside ambient loop
      if (i % 90000 === 0 && i > 0) {
        const hornPhase = Math.sin(i * 0.008);
        data[i] += hornPhase * 0.12;
      }
    }

    this.humSource = this.ctx.createBufferSource();
    this.humSource.buffer = buffer;
    this.humSource.loop = true;

    this.humNode = this.ctx.createBiquadFilter();
    this.humNode.type = 'lowpass';
    this.humNode.frequency.setValueAtTime(260, this.ctx.currentTime); // higher frequency for stadium presence

    this.gainHum = this.ctx.createGain();
    this.gainHum.gain.setValueAtTime(0.065, this.ctx.currentTime); // louder ambient hum

    this.humSource.connect(this.humNode);
    this.humNode.connect(this.gainHum);
    this.gainHum.connect(this.ctx.destination);

    this.humSource.start(0);
  }

  public playKick(intensity = 0.85) {
    this.init();
    if (!this.ctx || this.isMuted) return;
    
    const now = this.ctx.currentTime;
    
    // Solid organic leather-ball punch
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    osc.type = 'triangle'; // triangle has richer harmonic thud than pure sine
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.09);
    
    gainNode.gain.setValueAtTime(intensity * 1.0, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    
    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);

    // Leather ball slap click
    const noise = this.ctx.createBufferSource();
    const noiseGain = this.ctx.createGain();
    const noiseFilter = this.ctx.createBiquadFilter();

    const bufferSize = this.ctx.sampleRate * 0.04;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    noise.buffer = buffer;
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(320, now);
    noiseFilter.Q.setValueAtTime(5.0, now);

    noiseGain.gain.setValueAtTime(intensity * 0.55, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + 0.06);
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
    const cheerDuration = 3.2;

    const bufferSize = this.ctx.sampleRate * cheerDuration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    // White noise for roaring sound in stadium
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    // Shift filter from low-mid to high to simulate explosive enthusiasm
    filter.frequency.setValueAtTime(250, now);
    filter.frequency.exponentialRampToValueAtTime(1300, now + 0.45);
    filter.frequency.exponentialRampToValueAtTime(450, now + cheerDuration);
    filter.Q.setValueAtTime(1.1, now);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.32, now + 0.28); // explosive swell
    gainNode.gain.exponentialRampToValueAtTime(0.14, now + 1.2);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + cheerDuration);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + cheerDuration + 0.1);

    // Warm underlying bass note for stadium crowd thickness
    const synthTone = this.ctx.createOscillator();
    const synthGain = this.ctx.createGain();
    synthTone.type = 'sawtooth';
    synthTone.frequency.setValueAtTime(110, now);
    synthTone.frequency.exponentialRampToValueAtTime(135, now + 0.5);
    
    const toneFilter = this.ctx.createBiquadFilter();
    toneFilter.type = 'lowpass';
    toneFilter.frequency.setValueAtTime(320, now);

    synthGain.gain.setValueAtTime(0, now);
    synthGain.gain.linearRampToValueAtTime(0.06, now + 0.3);
    synthGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

    synthTone.connect(toneFilter);
    toneFilter.connect(synthGain);
    synthGain.connect(this.ctx.destination);

    synthTone.start(now);
    synthTone.stop(now + 1.6);

    // Vocal synthesis for commentator shouting "GOOOOOOOOL!!!"
    const commFund = 105; // deep masculine commentator pitch
    const commOsc = this.ctx.createOscillator();
    const commHarm = this.ctx.createOscillator();
    const commGain = this.ctx.createGain();
    const commLowpass = this.ctx.createBiquadFilter();
    const commFormant = this.ctx.createBiquadFilter();

    commOsc.type = 'sawtooth';
    commOsc.frequency.setValueAtTime(commFund, now);
    commOsc.frequency.linearRampToValueAtTime(commFund - 6, now + 0.6);
    commOsc.frequency.linearRampToValueAtTime(commFund - 12, now + 1.8);

    commHarm.type = 'triangle';
    commHarm.frequency.setValueAtTime(commFund * 2.0, now);
    commHarm.frequency.linearRampToValueAtTime((commFund - 6) * 2.0, now + 0.6);
    
    // Vocal "O" formant filter mapping
    commFormant.type = 'bandpass';
    commFormant.frequency.setValueAtTime(540, now); // center first vowel vocal formant
    commFormant.Q.setValueAtTime(2.6, now);

    commLowpass.type = 'lowpass';
    commLowpass.frequency.setValueAtTime(1300, now);

    // Swell gain for "GOOOOOOOOOL!!!"
    commGain.gain.setValueAtTime(0, now);
    commGain.gain.linearRampToValueAtTime(0.24, now + 0.12);
    commGain.gain.linearRampToValueAtTime(0.20, now + 1.2);
    commGain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

    commOsc.connect(commFormant);
    commHarm.connect(commFormant);
    commFormant.connect(commLowpass);
    commLowpass.connect(commGain);
    commGain.connect(this.ctx.destination);

    commOsc.start(now);
    commHarm.start(now);
    commOsc.stop(now + 2.1);
    commHarm.stop(now + 2.1);

    // Chanted secondary commentator shout "GOL-A-ZO!"
    const chantTime = now + 1.6;
    const syllables = [
       { pitch: 120, dur: 0.22, textFreq: 500 }, // "gol"
       { pitch: 140, dur: 0.18, textFreq: 950 }, // "a"
       { pitch: 110, dur: 0.35, textFreq: 450 }  // "zo"
    ];
    syllables.forEach((syll, idx) => {
       const sTime = chantTime + idx * 0.25;
       const sOsc = this.ctx.createOscillator();
       const sFilter = this.ctx.createBiquadFilter();
       const sGain = this.ctx.createGain();

       sOsc.type = 'sawtooth';
       sOsc.frequency.setValueAtTime(syll.pitch, sTime);

       sFilter.type = 'bandpass';
       sFilter.frequency.setValueAtTime(syll.textFreq, sTime);
       sFilter.Q.setValueAtTime(3.0, sTime);

       sGain.gain.setValueAtTime(0, sTime);
       sGain.gain.linearRampToValueAtTime(0.18, sTime + 0.04);
       sGain.gain.exponentialRampToValueAtTime(0.001, sTime + syll.dur);

       sOsc.connect(sFilter);
       sFilter.connect(sGain);
       sGain.connect(this.ctx.destination);

       sOsc.start(sTime);
       sOsc.stop(sTime + syll.dur + 0.05);
    });
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

  public playGKSave(intensity = 0.8) {
    this.init();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    
    // 1. Solid blunt leather slap thud (gloves matching ball)
    const oscillator = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(220, now);
    oscillator.frequency.exponentialRampToValueAtTime(68, now + 0.12);
    
    gainNode.gain.setValueAtTime(intensity * 1.1, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
    
    oscillator.connect(gainNode);
    gainNode.connect(this.ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.18);

    // High smack noise
    const noise = this.ctx.createBufferSource();
    const noiseGain = this.ctx.createGain();
    const noiseFilter = this.ctx.createBiquadFilter();

    const bufferSize = this.ctx.sampleRate * 0.06;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    noise.buffer = buffer;
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(420, now);
    noiseFilter.Q.setValueAtTime(3.8, now);

    noiseGain.gain.setValueAtTime(intensity * 0.58, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + 0.07);

    // 2. Crowd sudden sharp gasp, then enthusiastic clapping!
    this.playGasp();

    // Rhythmic claps from stadium fans supporting the heroic save
    const clapGain = this.ctx.createGain();
    clapGain.gain.setValueAtTime(0, now);
    clapGain.gain.linearRampToValueAtTime(0.26, now + 0.2); // clap starts after initial slap gasp
    clapGain.gain.exponentialRampToValueAtTime(0.001, now + 2.3);
    clapGain.connect(this.ctx.destination);

    for (let i = 0; i < 14; i++) {
      const clapTime = now + 0.22 + i * 0.15 + Math.random() * 0.024;
      const clapOsc = this.ctx.createOscillator();
      const clapFilter = this.ctx.createBiquadFilter();
      const clapEnv = this.ctx.createGain();

      clapOsc.type = 'triangle';
      clapOsc.frequency.setValueAtTime(190 + Math.random() * 95, clapTime);

      clapFilter.type = 'bandpass';
      clapFilter.frequency.setValueAtTime(980 + Math.random() * 210, clapTime);
      clapFilter.Q.setValueAtTime(2.2, clapTime);

      clapEnv.gain.setValueAtTime(0.14, clapTime);
      clapEnv.gain.exponentialRampToValueAtTime(0.001, clapTime + 0.04);

      clapOsc.connect(clapFilter);
      clapFilter.connect(clapEnv);
      clapEnv.connect(clapGain);

      clapOsc.start(clapTime);
      clapOsc.stop(clapTime + 0.05);
    }
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

  // --- PROCEDURAL MUSIC AND CROWD AUDIO EXTENSIONS ---
  private musicSource: AudioBufferSourceNode | null = null;
  private musicGain: GainNode | null = null;

  public playIntroMusic() {
    this.shouldPlayIntro = true;
    this.init(); // ensures ctx + persistent unlock listeners are attached

    // The real WC2026 anthem plays through a plain <audio> element — the most
    // reliable way to play an mp3 and let the browser handle buffering/looping.
    if (!this.introEl) {
      this.introEl = new Audio('/INTRO.mp3');
      this.introEl.loop = true;
      this.introEl.volume = 0.6;
      this.introEl.preload = 'auto';
      this.introEl.autoplay = true; // try to start the moment the page loads
    }
    if (this.isMuted) return;
    // play() may reject until the first user gesture; the persistent unlock retries it.
    this.introEl.play().catch(() => {});
  }

  public stopMusic() {
    this.shouldPlayIntro = false;
    if (this.introEl) {
      this.introEl.pause();
      this.introEl.currentTime = 0;
    }
    if (this.musicSource) {
      try {
        this.musicSource.stop();
      } catch (e) {}
      this.musicSource = null;
    }
  }

  public playVictoryMusic() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    this.stopMusic();

    const now = this.ctx.currentTime;
    const tempo = 138;
    const secondsPerBeat = 60 / tempo;
    const duration = secondsPerBeat * 16; 
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    const fanfare = [
      523.25, 659.25, 783.99, 1046.50, // C5 E5 G5 C6
      880.00, 1046.50, 1046.50, 1046.50 // A5 C6 C6 C6
    ];

    for (let i = 0; i < bufferSize; i++) {
      const time = i / this.ctx.sampleRate;
      
      const snare = (Math.random() * 2 - 1) * Math.exp(-(time % (secondsPerBeat * 0.25)) * 15) * 0.035;
      
      const noteIdx = Math.floor((time / (secondsPerBeat * 0.5)) % fanfare.length);
      const freq = fanfare[noteIdx];
      const noteTime = time % (secondsPerBeat * 0.5);
      
      const osc = Math.sin(2 * Math.PI * freq * noteTime) + 0.4 * Math.sin(2 * Math.PI * freq * 2 * noteTime);
      const env = Math.exp(-noteTime * 3.8) * 0.09;
      const melody = osc * env;

      const subBass = Math.sin(2 * Math.PI * 65.40 * time) * 0.04;

      data[i] = snare + melody + subBass;
      if (data[i] > 1.0) data[i] = 1.0;
      else if (data[i] < -1.0) data[i] = -1.0;
    }

    this.musicSource = this.ctx.createBufferSource();
    this.musicSource.buffer = buffer;
    this.musicSource.loop = false;

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(0.09, now);

    this.musicSource.connect(this.musicGain);
    this.musicGain.connect(this.ctx.destination);
    this.musicSource.start(now);

    // Warm up continuous massive applause
    this.playCheer();
  }

  public playDefeatMusic() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    this.stopMusic();

    const now = this.ctx.currentTime;
    const tempo = 84;
    const secondsPerBeat = 60 / tempo;
    const duration = secondsPerBeat * 12;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    const sad = [
      220.00, 261.63, 196.00, 220.00, // A3 C4 G3 A3 minor chord progression
      174.61, 196.00, 164.81, 146.83 
    ];

    for (let i = 0; i < bufferSize; i++) {
      const time = i / this.ctx.sampleRate;
      
      const noteIdx = Math.floor((time / secondsPerBeat) % sad.length);
      const freq = sad[noteIdx];
      const noteTime = time % secondsPerBeat;
      
      const synth = Math.sin(2 * Math.PI * freq * noteTime) * Math.exp(-noteTime * 1.6) * 0.08;
      data[i] = synth;
    }

    this.musicSource = this.ctx.createBufferSource();
    this.musicSource.buffer = buffer;
    this.musicSource.loop = false;

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(0.1, now);

    this.musicSource.connect(this.musicGain);
    this.musicGain.connect(this.ctx.destination);
    this.musicSource.start(now);

    // Play disappointment groans
    this.playBooing();
  }

  public playBooing() {
    this.init();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const duration = 2.0;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const time = i / this.ctx.sampleRate;
      // Low voice "booo" groan
      const groan1 = Math.sin(2 * Math.PI * 110 * time + Math.sin(2 * Math.PI * 9 * time) * 0.12) * 0.1;
      const groan2 = Math.sin(2 * Math.PI * 85 * time) * 0.08;
      const white = (Math.random() * 2 - 1) * 0.035;
      data[i] = (groan1 + groan2 + white) * Math.exp(-time * 1.2);
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.16, now);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    
    source.start(now);
    source.stop(now + duration + 0.1);
  }
}

export const audioEngine = new AudioEngine();
