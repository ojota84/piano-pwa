import { describe, it, expect } from 'vitest';
import {
  SOLFEGE_STEPS,
  CHROMATIC_SOLFEGE,
  getDiatonicStaffPosition,
  frequencyToMidiAndSolfege,
  getNoteDurationBeats,
  getNoteDurationLabel,
  getNoteTargetDurationMs,
  computeMeasureBarLineIndices,
} from '../../src/core/theory/musicTheory.ts';
import { MusicalNote } from '../../src/core/models/music.types.ts';

describe('MusicTheory Unit Tests (Core Theory & Rhythm)', () => {
  it('should define frozen Fixed-Do diatonic and chromatic solfège arrays', () => {
    expect(Object.isFrozen(SOLFEGE_STEPS)).toBe(true);
    expect(Object.isFrozen(CHROMATIC_SOLFEGE)).toBe(true);
    expect(SOLFEGE_STEPS).toEqual(['Do', 'Ré', 'Mi', 'Fa', 'Sol', 'La', 'Si']);
    expect(CHROMATIC_SOLFEGE).toEqual([
      'Do', 'Do#', 'Ré', 'Ré#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si',
    ]);
  });

  it('should calculate diatonic staff positions in Clé de Sol (treble) and Clé de Fa (bass)', () => {
    // Treble Clef (Si 4 is middle line 0, rank 34)
    expect(getDiatonicStaffPosition('Do', 4, 'treble')).toBe(-6);
    expect(getDiatonicStaffPosition('Ré', 4, 'treble')).toBe(-5);
    expect(getDiatonicStaffPosition('Mi', 4, 'treble')).toBe(-4);
    expect(getDiatonicStaffPosition('Fa', 4, 'treble')).toBe(-3);
    expect(getDiatonicStaffPosition('Sol', 4, 'treble')).toBe(-2);
    expect(getDiatonicStaffPosition('La', 4, 'treble')).toBe(-1);
    expect(getDiatonicStaffPosition('Si', 4, 'treble')).toBe(0);
    expect(getDiatonicStaffPosition('Do', 5, 'treble')).toBe(1);
    expect(getDiatonicStaffPosition('Do', 6, 'treble')).toBe(8);
    expect(getDiatonicStaffPosition('La', 3, 'treble')).toBe(-8);

    // Bass Clef (Ré 3 is middle line 0, rank 22)
    expect(getDiatonicStaffPosition('Ré', 3, 'bass')).toBe(0);
    expect(getDiatonicStaffPosition('Do', 3, 'bass')).toBe(-1);
    expect(getDiatonicStaffPosition('Fa', 3, 'bass')).toBe(2);
    expect(getDiatonicStaffPosition('Do', 4, 'bass')).toBe(6);
    expect(getDiatonicStaffPosition('Sol', 2, 'bass')).toBe(-4);
  });

  it('should map all 12 chromatic pitches and cents deviations into frozen objects', () => {
    const expectedChromatics = [
      'Do', 'Do#', 'Ré', 'Ré#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si',
    ];
    expectedChromatics.forEach((expectedSolfege, i) => {
      const midi = 60 + i;
      const freq = 440 * Math.pow(2, (midi - 69) / 12);
      const res = frequencyToMidiAndSolfege(freq);
      expect(Object.isFrozen(res)).toBe(true);
      expect(res.midi).toBe(midi);
      expect(res.solfegeName).toBe(expectedSolfege);
      expect(res.octave).toBe(4);
      expect(res.cents).toBe(0);
    });

    const sharpLa = 440 * Math.pow(2, 15 / 1200);
    expect(frequencyToMidiAndSolfege(sharpLa).cents).toBe(15);

    const flatLa = 440 * Math.pow(2, -20 / 1200);
    expect(frequencyToMidiAndSolfege(flatLa).cents).toBe(-20);
  });

  it('should return exact beat counts and French labels for all note durations', () => {
    expect(getNoteDurationBeats('whole')).toBe(4);
    expect(getNoteDurationBeats('half')).toBe(2);
    expect(getNoteDurationBeats('quarter')).toBe(1);
    expect(getNoteDurationBeats('eighth')).toBe(0.5);

    expect(getNoteDurationLabel('whole')).toBe('Ronde · 4 temps');
    expect(getNoteDurationLabel('half')).toBe('Blanche · 2 temps');
    expect(getNoteDurationLabel('quarter')).toBe('Noire · 1 temps');
    expect(getNoteDurationLabel('eighth')).toBe('Croche · ½ temps');
  });

  it('should calculate target ms and clamp tempo between 20 and 240 BPM', () => {
    expect(getNoteTargetDurationMs('whole', 60)).toBe(4000);
    expect(getNoteTargetDurationMs('half', 60)).toBe(2000);
    expect(getNoteTargetDurationMs('quarter', 60)).toBe(1000);
    expect(getNoteTargetDurationMs('eighth', 60)).toBe(500);

    // Clamping below 20 BPM -> uses 20 BPM (1 beat = 3000ms)
    expect(getNoteTargetDurationMs('quarter', 5)).toBe(3000);
    expect(getNoteTargetDurationMs('quarter', 20)).toBe(3000);

    // Clamping above 240 BPM -> uses 240 BPM (1 beat = 250ms)
    expect(getNoteTargetDurationMs('quarter', 300)).toBe(250);
    expect(getNoteTargetDurationMs('quarter', 240)).toBe(250);
  });

  it('should compute frozen measure bar line indices for 4/4, 3/4, 6/8, and overflow measures', () => {
    const notes: MusicalNote[] = [
      { id: '1', solfegePitch: 'Do 4', midi: 60, step: 'Do', octave: 4, duration: 'quarter' },
      { id: '2', solfegePitch: 'Ré 4', midi: 62, step: 'Ré', octave: 4, duration: 'quarter' },
      { id: '3', solfegePitch: 'Mi 4', midi: 64, step: 'Mi', octave: 4, duration: 'half' }, // End of 4/4 measure 1 (index 2)
      { id: '4', solfegePitch: 'Fa 4', midi: 65, step: 'Fa', octave: 4, duration: 'eighth' },
      { id: '5', solfegePitch: 'Sol 4', midi: 67, step: 'Sol', octave: 4, duration: 'eighth' },
      { id: '6', solfegePitch: 'La 4', midi: 69, step: 'La', octave: 4, duration: 'quarter' },
      { id: '7', solfegePitch: 'Do 5', midi: 72, step: 'Do', octave: 5, duration: 'half' }, // Final note (excluded)
    ];

    const bars44 = computeMeasureBarLineIndices(notes);
    expect(Object.isFrozen(bars44)).toBe(true);
    expect(bars44).toEqual([2]);
    expect(computeMeasureBarLineIndices(notes, [4, 4])).toEqual([2]);

    const waltzNotes: MusicalNote[] = [
      { id: 'w1', solfegePitch: 'Do 4', midi: 60, step: 'Do', octave: 4, duration: 'half' },
      { id: 'w2', solfegePitch: 'Mi 4', midi: 64, step: 'Mi', octave: 4, duration: 'quarter' }, // 3 beats -> bar after index 1
      { id: 'w3', solfegePitch: 'Sol 4', midi: 67, step: 'Sol', octave: 4, duration: 'whole' },   // 4 beats (> 3) -> bar after index 2
      { id: 'w4', solfegePitch: 'Do 5', midi: 72, step: 'Do', octave: 5, duration: 'half' },
    ];
    expect(computeMeasureBarLineIndices(waltzNotes, [3, 4])).toEqual([1, 2]);

    // 6/8 time signature: (6 * 4) / 8 = 3 quarter-note beats per measure
    const sixEightNotes: MusicalNote[] = [
      { id: 's1', solfegePitch: 'Do 4', midi: 60, step: 'Do', octave: 4, duration: 'quarter' },
      { id: 's2', solfegePitch: 'Mi 4', midi: 64, step: 'Mi', octave: 4, duration: 'half' }, // 1 + 2 = 3 beats -> bar after index 1
      { id: 's3', solfegePitch: 'Sol 4', midi: 67, step: 'Sol', octave: 4, duration: 'quarter' },
    ];
    expect(computeMeasureBarLineIndices(sixEightNotes, [6, 8])).toEqual([1]);
    expect(computeMeasureBarLineIndices([])).toEqual([]);
  });
});
