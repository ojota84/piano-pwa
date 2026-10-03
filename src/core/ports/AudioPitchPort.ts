import { PitchResult } from '../models/pitch.types.ts';

export interface AudioPitchPort {
  start(onPitch: (pitch: PitchResult) => void): Promise<void>;
  stop(): void;
  resumeAudio(): Promise<void>;
  setSensitivityThreshold(threshold: number): void;
  setInputGain(multiplier: number): void;
  getIsRunning(): boolean;
  getAudioState(): string;
}
