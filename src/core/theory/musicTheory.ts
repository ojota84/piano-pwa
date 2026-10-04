import { ClefType, MusicalNote, NoteDuration, SolfegeStep } from '../models/music.types.ts';

export const SOLFEGE_STEPS: readonly SolfegeStep[] = Object.freeze([
  'Do', 'Ré', 'Mi', 'Fa', 'Sol', 'La', 'Si',
]);

export const CHROMATIC_SOLFEGE: readonly string[] = Object.freeze([
  'Do', 'Do#', 'Ré', 'Ré#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si',
]);

const DURATION_BEATS_MAP: Readonly<Record<NoteDuration, number>> = Object.freeze({
  whole: 4,
  half: 2,
  quarter: 1,
  eighth: 0.5,
});

const DURATION_LABELS_MAP: Readonly<Record<NoteDuration, string>> = Object.freeze({
  whole: 'Ronde · 4 temps',
  half: 'Blanche · 2 temps',
  quarter: 'Noire · 1 temps',
  eighth: 'Croche · ½ temps',
});

/**
 * Calculates diatonic staff step relative to the middle line (Line 3).
 * In Treble Clef: Line 3 is Si 4 (staffPosition = 0).
 * In Bass Clef: Line 3 is Ré 3 (staffPosition = 0).
 */
export function getDiatonicStaffPosition(
  step: SolfegeStep,
  octave: number,
  clef: ClefType
): number {
  const stepIndex = SOLFEGE_STEPS.indexOf(step);
  const diatonicRank = octave * 7 + stepIndex;
  const referenceLineRank = clef === 'treble' ? 34 : 22;
  return diatonicRank - referenceLineRank;
}

/**
 * Converts a frequency in Hz to an immutable MIDI number and Fixed-Do Solfège representation.
 */
export function frequencyToMidiAndSolfege(frequency: number): Readonly<{
  midi: number;
  solfegeName: string;
  octave: number;
  cents: number;
}> {
  const midiFraction = 69 + 12 * Math.log2(frequency / 440);
  const midi = Math.round(midiFraction);
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = ((midi % 12) + 12) % 12;
  const solfegeName = CHROMATIC_SOLFEGE[noteIndex];

  const idealFreq = 440 * Math.pow(2, (midi - 69) / 12);
  const cents = Math.round(1200 * Math.log2(frequency / idealFreq));

  return Object.freeze({
    midi,
    solfegeName,
    octave,
    cents,
  });
}

/**
 * Returns the number of quarter-note beats for a given NoteDuration.
 */
export function getNoteDurationBeats(duration: NoteDuration): number {
  return DURATION_BEATS_MAP[duration];
}

/**
 * Returns the French Solfège rhythm label for a NoteDuration.
 */
export function getNoteDurationLabel(duration: NoteDuration): string {
  return DURATION_LABELS_MAP[duration];
}

/**
 * Computes the target duration in milliseconds for a note at a given tempo (BPM).
 */
export function getNoteTargetDurationMs(duration: NoteDuration, tempoBpm: number): number {
  const safeBpm = Math.max(20, Math.min(240, tempoBpm));
  const beatMs = 60000 / safeBpm;
  return Math.round(beatMs * getNoteDurationBeats(duration));
}

/**
 * Computes the immutable list of note indices AFTER which a vertical measure bar line
 * should be drawn, using a pure functional reduction over the note sequence.
 * Excludes the final note index since the piece ends with a double bar line.
 */
export function computeMeasureBarLineIndices(
  notes: readonly MusicalNote[],
  timeSignature: readonly [number, number] = [4, 4]
): readonly number[] {
  const beatsPerMeasure = (timeSignature[0] * 4) / timeSignature[1];

  const reduction = notes.slice(0, -1).reduce<{
    readonly barIndices: readonly number[];
    readonly accumulatedBeats: number;
  }>(
    (acc, note, index) => {
      const nextBeats = acc.accumulatedBeats + getNoteDurationBeats(note.duration);
      return nextBeats >= beatsPerMeasure
        ? { barIndices: [...acc.barIndices, index], accumulatedBeats: 0 }
        : { barIndices: acc.barIndices, accumulatedBeats: nextBeats };
    },
    { barIndices: [], accumulatedBeats: 0 }
  );

  return Object.freeze(reduction.barIndices);
}
