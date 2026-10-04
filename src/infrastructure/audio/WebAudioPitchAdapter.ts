import { AudioPitchPort } from '../../core/ports/AudioPitchPort.ts';
import { PitchResult } from '../../core/models/pitch.types.ts';
import {
  detectPitchFromBuffer,
  DEFAULT_PITCH_DETECTOR_CONFIG,
} from '../../core/dsp/pitchDetector.ts';

/**
 * Infrastructure Web Audio Hardware Adapter:
 * Manages browser MediaStream, 60Hz high-pass BiquadFilterNode, GainNode, AnalyserNode,
 * and zero-allocation Float32Array buffers, delegating pitch extraction to the pure Core DSP module.
 */
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

  // Pre-allocated reusable buffers to avoid 60fps GC pressure on mobile devices
  private timeDomainBuffer: Float32Array<ArrayBuffer> = new Float32Array(2048);
  private correlationBuffer: Float32Array<ArrayBuffer> = new Float32Array(1024);

  private silenceThresholdRms = DEFAULT_PITCH_DETECTOR_CONFIG.silenceThresholdRms;
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

    // Allocate reusable buffers once per session
    if (this.timeDomainBuffer.length !== this.analyser.fftSize) {
      this.timeDomainBuffer = new Float32Array(this.analyser.fftSize);
    }
    const maxPossibleLag = Math.ceil(
      this.audioContext.sampleRate / DEFAULT_PITCH_DETECTOR_CONFIG.minFreq
    ) + 4;
    if (this.correlationBuffer.length < maxPossibleLag) {
      this.correlationBuffer = new Float32Array(maxPossibleLag);
    }

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

    this.analyser.getFloatTimeDomainData(this.timeDomainBuffer);

    const pitch = this.detectPitch(
      this.timeDomainBuffer,
      this.audioContext.sampleRate,
      this.audioContext.state
    );
    if (this.onPitchCallback) {
      this.onPitchCallback(pitch);
    }

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  public detectPitch(
    buffer: Float32Array,
    sampleRate: number,
    audioState: string
  ): Readonly<PitchResult> {
    return detectPitchFromBuffer(
      buffer,
      sampleRate,
      audioState,
      {
        ...DEFAULT_PITCH_DETECTOR_CONFIG,
        silenceThresholdRms: this.silenceThresholdRms,
      },
      this.correlationBuffer
    );
  }
}
