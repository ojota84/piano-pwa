import { ClefType, SolfegeStep } from '../models/music.types.ts';

export const SOLFEGE_STEPS: SolfegeStep[] = ['Do', 'Ré', 'Mi', 'Fa', 'Sol', 'La', 'Si'];

export const CHROMATIC_SOLFEGE = [
  'Do', 'Do#', 'Ré', 'Ré#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'
];

/**
 * Calculates diatonic staff step relative to the middle line (Line 3, y = 90).
 * In Treble Clef: Line 3 is Si 4 (staffPosition = 0).
 * In Bass Clef: Line 3 is Ré 3 (staffPosition = 0).
 */
export function getDiatonicStaffPosition(
  step: SolfegeStep,
  octave: number,
  clef: ClefType
): number {
  const stepIndex = SOLFEGE_STEPS.indexOf(step);
  const diatonicRank = octave * 7 + (stepIndex >= 0 ? stepIndex : 0);

  if (clef === 'treble') {
    // Si 4 is Line 3: 4 * 7 + 6 = 34
    return diatonicRank - 34;
  } else {
    // Ré 3 is Line 3: 3 * 7 + 1 = 22
    return diatonicRank - 22;
  }
}

/**
 * Converts a frequency in Hz to MIDI number and Fixed-Do Solfège pitch representation.
 */
export function frequencyToMidiAndSolfege(frequency: number): {
  midi: number;
  solfegeName: string;
  octave: number;
  cents: number;
} {
  const midiFraction = 69 + 12 * Math.log2(frequency / 440);
  const midi = Math.round(midiFraction);
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = ((midi % 12) + 12) % 12;
  const solfegeName = CHROMATIC_SOLFEGE[noteIndex];

  const idealFreq = 440 * Math.pow(2, (midi - 69) / 12);
  const cents = Math.round(1200 * Math.log2(frequency / idealFreq));

  return {
    midi,
    solfegeName,
    octave,
    cents,
  };
}
