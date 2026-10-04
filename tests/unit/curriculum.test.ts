import { describe, it, expect } from 'vitest';
import { partitionRepository } from '../../src/infrastructure/data/InMemoryPartitionRepository.ts';
import { DifficultyLevel, NoteDuration } from '../../src/core/models/music.types.ts';

describe('Curriculum & Progressive Level Catalog Tests', () => {
  const allLevels = partitionRepository.getAllPartitions();

  it('should contain 20 sequential lessons divided into Lecture (8) and Rythme (12) modes', () => {
    expect(allLevels.length).toBe(20);
    const lectureLessons = partitionRepository.getPartitionsByMode('lecture');
    const rhythmLessons = partitionRepository.getPartitionsByMode('rythme');

    expect(lectureLessons.length).toBe(8);
    expect(rhythmLessons.length).toBe(12);

    allLevels.forEach((piece, idx) => {
      expect(piece.levelNumber).toBe(idx + 1);
    });
  });

  it('should have all 3 difficulty level tabs properly populated with both Lecture and Rythme lessons', () => {
    const levels: DifficultyLevel[] = ['Débutant', 'Intermédiaire', 'Avancé'];
    for (const diff of levels) {
      const items = partitionRepository.getPartitionsByDifficulty(diff);
      expect(items.length).toBeGreaterThanOrEqual(6);
      expect(items.some((p) => p.mode === 'lecture')).toBe(true);
      expect(items.some((p) => p.mode === 'rythme')).toBe(true);
    }
  });

  it('should include Rythme lessons combining whites (half), blacks (quarter), wholes, and eighths across all difficulties', () => {
    const rhythmLessons = partitionRepository.getPartitionsByMode('rythme');
    const allFourDurations: NoteDuration[] = ['whole', 'half', 'quarter', 'eighth'];

    // Verify that several single Rythme lessons contain all 4 note durations (Ronde, Blanche, Noire, Croche)
    const fullRangeRhythmLessons = rhythmLessons.filter((piece) => {
      const presentDurations = new Set(piece.notes.map((n) => n.duration));
      return allFourDurations.every((d) => presentDurations.has(d));
    });

    expect(fullRangeRhythmLessons.length).toBeGreaterThanOrEqual(4);

    // Both Clé de Sol and Clé de Fa have Rythme lessons with mixed Blanches (half) and Noires (quarter)
    const trebleRhythm = rhythmLessons.filter((p) => p.clef === 'treble');
    const bassRhythm = rhythmLessons.filter((p) => p.clef === 'bass');
    expect(trebleRhythm.length).toBeGreaterThanOrEqual(9);
    expect(bassRhythm.length).toBeGreaterThanOrEqual(3);

    for (const piece of bassRhythm) {
      const durations = new Set(piece.notes.map((n) => n.duration));
      expect(durations.has('half')).toBe(true);
      expect(durations.has('quarter')).toBe(true);
    }
  });

  it('should include advanced Clé de Sol lessons spanning from La 3 (MIDI 57) to Do 6 (MIDI 84)', () => {
    const advancedTreble = partitionRepository
      .getPartitionsByDifficulty('Avancé')
      .filter((p) => p.clef === 'treble');

    expect(advancedTreble.length).toBe(5);

    for (const piece of advancedTreble) {
      const midis = piece.notes.map((n) => n.midi);
      expect(Math.min(...midis)).toBe(57); // La 3
      expect(Math.max(...midis)).toBe(84); // Do 6
    }
  });

  it('should ensure each note in every level has valid Solfège and MIDI representation', () => {
    for (const piece of allLevels) {
      expect(piece.notes.length).toBeGreaterThan(0);
      for (const note of piece.notes) {
        expect(['Do', 'Ré', 'Mi', 'Fa', 'Sol', 'La', 'Si']).toContain(note.step);
        expect(note.midi).toBeGreaterThanOrEqual(36); // C2 or above
        expect(note.midi).toBeLessThanOrEqual(84);    // C6 or below
        expect(note.solfegePitch).toContain(note.step);
      }
    }
  });

  it('should retrieve individual partitions by id', () => {
    const p1 = partitionRepository.getPartitionById('level-1-do-central');
    expect(p1).toBeDefined();
    expect(p1?.difficulty).toBe('Débutant');
    expect(p1?.mode).toBe('lecture');
  });
});
