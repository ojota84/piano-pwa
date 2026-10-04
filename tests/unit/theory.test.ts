import { describe, it, expect } from 'vitest';
import {
  getDiatonicStaffPosition,
  frequencyToMidiAndSolfege,
  getNoteDurationBeats,
  getNoteTargetDurationMs,
  computeMeasureBarLineIndices,
} from '../../src/core/theory/musicTheory.ts';
import { MusicalNote } from '../../src/core/models/music.types.ts';

describe('MusicTheory Unit Tests (Core Theory & Rhythm)', () => {
  it('should place Do 4 (Middle C) on ledger line below staff (-6) in Clé de Sol', () => {
    const pos = getDiatonicStaffPosition('Do', 4, 'treble');
    expect(pos).toBe(-6);
  });

  it('should place Ré 4 hanging below Line 1 (-5) in Clé de Sol', () => {
    const pos = getDiatonicStaffPosition('Ré', 4, 'treble');
    expect(pos).toBe(-5);
  });

  it('should place Mi 4 on Line 1 (-4) in Clé de Sol', () => {
    const pos = getDiatonicStaffPosition('Mi', 4, 'treble');
    expect(pos).toBe(-4);
  });

  it('should place Sol 4 on Line 2 (-2) in Clé de Sol', () => {
    const pos = getDiatonicStaffPosition('Sol', 4, 'treble');
    expect(pos).toBe(-2);
  });

  it('should place Si 4 on Middle Line (0) in Clé de Sol', () => {
    const pos = getDiatonicStaffPosition('Si', 4, 'treble');
    expect(pos).toBe(0);
  });

  it('should place Do 5 in Space 3 (+1) in Clé de Sol', () => {
    const pos = getDiatonicStaffPosition('Do', 5, 'treble');
    expect(pos).toBe(1);
  });

  it('should map 261.63 Hz to Do 4 (MIDI 60)', () => {
    const res = frequencyToMidiAndSolfege(261.63);
    expect(res.midi).toBe(60);
    expect(res.solfegeName).toBe('Do');
    expect(res.octave).toBe(4);
    expect(Math.abs(res.cents)).toBeLessThan(5);
  });

  it('should map 440 Hz to La 4 (MIDI 69)', () => {
    const res = frequencyToMidiAndSolfege(440.0);
    expect(res.midi).toBe(69);
    expect(res.solfegeName).toBe('La');
    expect(res.octave).toBe(4);
    expect(res.cents).toBe(0);
  });

  it('should calculate exact beat counts and target ms for whole, half, quarter, and eighth notes', () => {
    expect(getNoteDurationBeats('whole')).toBe(4);
    expect(getNoteDurationBeats('half')).toBe(2);
    expect(getNoteDurationBeats('quarter')).toBe(1);
    expect(getNoteDurationBeats('eighth')).toBe(0.5);

    // At 60 BPM (1 beat = 1000ms)
    expect(getNoteTargetDurationMs('whole', 60)).toBe(4000);
    expect(getNoteTargetDurationMs('half', 60)).toBe(2000);
    expect(getNoteTargetDurationMs('quarter', 60)).toBe(1000);
    expect(getNoteTargetDurationMs('eighth', 60)).toBe(500);
  });

  it('should compute measure bar line indices accurately for 4/4 and 3/4 time signatures', () => {
    const notes: MusicalNote[] = [
      { id: '1', solfegePitch: 'Do 4', midi: 60, step: 'Do', octave: 4, duration: 'quarter' },
      { id: '2', solfegePitch: 'Ré 4', midi: 62, step: 'Ré', octave: 4, duration: 'quarter' },
      { id: '3', solfegePitch: 'Mi 4', midi: 64, step: 'Mi', octave: 4, duration: 'half' }, // End of 4/4 measure 1 (index 2)
      { id: '4', solfegePitch: 'Fa 4', midi: 65, step: 'Fa', octave: 4, duration: 'eighth' },
      { id: '5', solfegePitch: 'Sol 4', midi: 67, step: 'Sol', octave: 4, duration: 'eighth' },
      { id: '6', solfegePitch: 'La 4', midi: 69, step: 'La', octave: 4, duration: 'quarter' },
      { id: '7', solfegePitch: 'Do 5', midi: 72, step: 'Do', octave: 5, duration: 'half' }, // Final note
    ];

    expect(computeMeasureBarLineIndices(notes, [4, 4])).toEqual([2]);

    const waltzNotes: MusicalNote[] = [
      { id: 'w1', solfegePitch: 'Do 4', midi: 60, step: 'Do', octave: 4, duration: 'half' },
      { id: 'w2', solfegePitch: 'Mi 4', midi: 64, step: 'Mi', octave: 4, duration: 'quarter' }, // 3 beats -> bar after index 1
      { id: 'w3', solfegePitch: 'Sol 4', midi: 67, step: 'Sol', octave: 4, duration: 'quarter' },
      { id: 'w4', solfegePitch: 'Do 5', midi: 72, step: 'Do', octave: 5, duration: 'half' },
    ];
    expect(computeMeasureBarLineIndices(waltzNotes, [3, 4])).toEqual([1]);
  });
});
