import { AudioPitchPort } from '../../core/ports/AudioPitchPort.ts';
import { PitchResult } from '../../core/models/pitch.types.ts';
import { CHROMATIC_SOLFEGE } from '../../core/theory/musicTheory.ts';

export class WebAudioPitchAdapter implements AudioPitchPort {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private gainNode: GainNode | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private isRunning = false;
  private animFrameId: number | null = null;
  private onPitchCallback: ((pitch: PitchResult) => void) | null = null;

  // Piano frequency range: C2 (~65.4Hz) to C6 (~1046.5Hz) with headroom
  private readonly minFreq = 62;
  private readonly maxFreq = 1250;

  // Balanced RMS silence threshold & digital preamp gain to reject ambient room noise
  private silenceThresholdRms = 0.0045;
  private inputGainMultiplier = 2.0;

  public setSensitivityThreshold(threshold: number): void {
    this.silenceThresholdRms = Math.max(0.0006, threshold);
  }

  public setInputGain(multiplier: number): void {
    this.inputGainMultiplier = Math.min(6.0, Math.max(0.5, multiplier));
    if (this.gainNode && this.audioContext) {
      this.gainNode.gain.setValueAtTime(this.inputGainMultiplier, this.audioContext.currentTime);
    }
  }

  public async start(onPitch: (pitch: PitchResult) => void): Promise<void> {
    this.onPitchCallback = onPitch;
    if (this.isRunning) {
      await this.resumeAudio();
      return;
    }

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.audioContext = new AudioContextClass();
    }

    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (e) {
        console.warn('AudioContext initial resume suspended', e);
      }
    }

    // Get microphone stream without voice processing that muffles piano acoustics
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
        },
      });
    } catch {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // Highpass filter at 60Hz to eliminate sub-bass table rumble and HVAC hum
    this.filterNode = this.audioContext.createBiquadFilter();
    this.filterNode.type = 'highpass';
    this.filterNode.frequency.setValueAtTime(60, this.audioContext.currentTime);

    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.setValueAtTime(this.inputGainMultiplier, this.audioContext.currentTime);

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.15;

    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.sourceNode.connect(this.filterNode);
    this.filterNode.connect(this.gainNode);
    this.gainNode.connect(this.analyser);

    this.isRunning = true;
    this.loop();
  }

  public async resumeAudio(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.filterNode) {
      this.filterNode.disconnect();
      this.filterNode = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  public getAudioState(): string {
    return this.audioContext ? this.audioContext.state : 'uninitialized';
  }

  private loop = (): void => {
    if (!this.isRunning || !this.analyser || !this.audioContext) return;

    const buffer = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(buffer);

    const pitch = this.detectPitch(buffer, this.audioContext.sampleRate, this.audioContext.state);
    if (this.onPitchCallback) {
      this.onPitchCallback(pitch);
    }

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  /**
   * Monophonic Normalized Autocorrelation & First Prominent Peak Picker.
   * McLeod Pitch Method (MPM) principle:
   * 1. Finds global maximum correlation to determine signal periodicity.
   * 2. Selects the FIRST local peak whose correlation is >= 0.82 * globalMax.
   * This strictly chooses the fundamental period T0 and rejects both overtones (< 0.82*max)
   * and subharmonic multiples (which appear after T0).
   */
  public detectPitch(buffer: Float32Array, sampleRate: number, audioState: string): PitchResult {
    // 1. RMS Energy
    let sumSquares = 0;
    for (let i = 0; i < buffer.length; i++) {
      sumSquares += buffer[i] * buffer[i];
    }
    const rms = Math.sqrt(sumSquares / buffer.length);

    if (rms < this.silenceThresholdRms) {
      return {
        frequency: 0,
        solfegeName: '',
        octave: 0,
        midi: 0,
        cents: 0,
        confidence: 0,
        rms,
        isPitched: false,
        audioState,
        sampleRate,
        debugMessage: `Silence (RMS ${rms.toFixed(4)} < seuil ${this.silenceThresholdRms.toFixed(4)})`,
      };
    }

    // 2. Normalized Autocorrelation
    const minLag = Math.floor(sampleRate / this.maxFreq); // e.g. 44100 / 1080 = 40
    const maxLag = Math.min(Math.ceil(sampleRate / this.minFreq), Math.floor(buffer.length / 2)); // e.g. 44100 / 62 = 711
    const windowSize = Math.floor(buffer.length / 2);

    let energy0 = 0;
    for (let i = 0; i < windowSize; i++) {
      energy0 += buffer[i] * buffer[i];
    }

    if (energy0 < 1e-7) {
      return {
        frequency: 0,
        solfegeName: '',
        octave: 0,
        midi: 0,
        cents: 0,
        confidence: 0,
        rms,
        isPitched: false,
        audioState,
        sampleRate,
        debugMessage: 'Énergie nulle',
      };
    }

    const corr = new Float32Array(maxLag + 2);
    let maxOverallCorr = -1;

    for (let lag = minLag; lag <= maxLag; lag++) {
      let sum = 0;
      let energyLag = 0;
      for (let i = 0; i < windowSize; i++) {
        sum += buffer[i] * buffer[i + lag];
        energyLag += buffer[i + lag] * buffer[i + lag];
      }
      const norm = Math.sqrt(energy0 * energyLag);
      const normalizedCorr = norm > 1e-7 ? sum / norm : 0;
      corr[lag] = normalizedCorr;

      if (normalizedCorr > maxOverallCorr) {
        maxOverallCorr = normalizedCorr;
      }
    }

    // Strict correlation confidence threshold (68%) so ambient noise is never mistaken for a played piano note
    if (maxOverallCorr < 0.68) {
      return {
        frequency: 0,
        solfegeName: '',
        octave: 0,
        midi: 0,
        cents: 0,
        confidence: Math.max(0, maxOverallCorr),
        rms,
        isPitched: false,
        audioState,
        sampleRate,
        debugMessage: `Bruit ambiant (Confiance ${Math.round(maxOverallCorr * 100)}% < 68%)`,
      };
    }

    // 3. Find the fundamental period T0 using McLeod First Prominent Peak with harmonic/subharmonic verification:
    // - Pick the first local peak >= max(0.55, 0.62 * maxOverallCorr) so Do 4 is never skipped in favor of subharmonic Do 3
    // - Verify it is not a 2nd-harmonic half-period peak (where corr[2*lag] is higher than corr[lag])
    const peakThreshold = Math.max(0.55, maxOverallCorr * 0.62);
    let bestLag = -1;

    for (let lag = minLag + 1; lag < maxLag; lag++) {
      if (corr[lag] >= peakThreshold) {
        if (corr[lag] >= corr[lag - 1] && corr[lag] >= corr[lag + 1]) {
          // Check if 2*lag (one octave lower) has a much stronger correlation peak,
          // which happens only when `lag` is the 2nd harmonic (T0/2) of a true fundamental at `2*lag`
          const doubleLagCenter = lag * 2;
          let maxDoubleCorr = -1;
          if (doubleLagCenter <= maxLag) {
            const searchStart = Math.max(minLag, doubleLagCenter - 3);
            const searchEnd = Math.min(maxLag, doubleLagCenter + 3);
            for (let dLag = searchStart; dLag <= searchEnd; dLag++) {
              if (corr[dLag] > maxDoubleCorr) {
                maxDoubleCorr = corr[dLag];
              }
            }
          }

          if (maxDoubleCorr - corr[lag] > 0.12) {
            // `lag` is a 2nd harmonic overtone (e.g. La 5 harmonic of a played La 4); continue to true fundamental at 2*lag
            continue;
          }

          bestLag = lag;
          break; // Stop at true fundamental T0!
        }
      }
    }

    if (bestLag === -1) {
      return {
        frequency: 0,
        solfegeName: '',
        octave: 0,
        midi: 0,
        cents: 0,
        confidence: maxOverallCorr,
        rms,
        isPitched: false,
        audioState,
        sampleRate,
        debugMessage: 'Aucun pic distinct',
      };
    }

    // 4. Parabolic Peak Interpolation for sub-sample accuracy
    let refinedLag = bestLag;
    if (bestLag > minLag && bestLag < maxLag) {
      const alpha = corr[bestLag - 1];
      const beta = corr[bestLag];
      const gamma = corr[bestLag + 1];
      const denom = alpha - 2 * beta + gamma;
      if (Math.abs(denom) > 1e-8) {
        const delta = (alpha - gamma) / (2 * denom);
        refinedLag = bestLag + delta;
      }
    }

    const frequency = sampleRate / refinedLag;
    if (frequency < this.minFreq || frequency > this.maxFreq) {
      return {
        frequency: 0,
        solfegeName: '',
        octave: 0,
        midi: 0,
        cents: 0,
        confidence: 0,
        rms,
        isPitched: false,
        audioState,
        sampleRate,
        debugMessage: `Fréquence hors plage (${frequency.toFixed(1)} Hz)`,
      };
    }

    // 5. Frequency to MIDI & Fixed-Do Solfège
    const midiFraction = 69 + 12 * Math.log2(frequency / 440);
    const rawMidi = Math.round(midiFraction);
    const octave = Math.floor(rawMidi / 12) - 1;
    const noteIndex = ((rawMidi % 12) + 12) % 12;
    const solfegeName = CHROMATIC_SOLFEGE[noteIndex];

    const idealFreq = 440 * Math.pow(2, (rawMidi - 69) / 12);
    const cents = Math.round(1200 * Math.log2(frequency / idealFreq));

    return {
      frequency,
      solfegeName,
      octave,
      midi: rawMidi,
      cents,
      confidence: corr[bestLag],
      rms,
      isPitched: true,
      audioState,
      sampleRate,
      debugMessage: `${solfegeName} ${octave} (${frequency.toFixed(1)} Hz) | Confiance ${Math.round(corr[bestLag] * 100)}%`,
    };
  }
}
