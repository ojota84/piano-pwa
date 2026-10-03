import { describe, it, expect } from 'vitest';
import { getDiatonicStaffPosition, frequencyToMidiAndSolfege } from '../../src/core/theory/musicTheory.ts';

describe('MusicTheory Unit Tests (Core Theory)', () => {
  it('should place Do 4 (Middle C) on ledger line below staff (-6) in Clé de Sol', () => {
    const pos = getDiatonicStaffPosition('Do', 4, 'treble');
    expect(pos).toBe(-6); // y = 90 - (-6 * 10) = 150px
  });

  it('should place Ré 4 hanging below Line 1 (-5) in Clé de Sol', () => {
    const pos = getDiatonicStaffPosition('Ré', 4, 'treble');
    expect(pos).toBe(-5); // y = 140px
  });

  it('should place Mi 4 on Line 1 (-4) in Clé de Sol', () => {
    const pos = getDiatonicStaffPosition('Mi', 4, 'treble');
    expect(pos).toBe(-4); // y = 130px
  });

  it('should place Sol 4 on Line 2 (-2) in Clé de Sol', () => {
    const pos = getDiatonicStaffPosition('Sol', 4, 'treble');
    expect(pos).toBe(-2); // y = 110px
  });

  it('should place Si 4 on Middle Line (0) in Clé de Sol', () => {
    const pos = getDiatonicStaffPosition('Si', 4, 'treble');
    expect(pos).toBe(0); // y = 90px
  });

  it('should place Do 5 in Space 3 (+1) in Clé de Sol', () => {
    const pos = getDiatonicStaffPosition('Do', 5, 'treble');
    expect(pos).toBe(1); // y = 80px
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
});
