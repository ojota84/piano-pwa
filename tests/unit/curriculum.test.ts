import { describe, it, expect } from 'vitest';
import { partitionRepository } from '../../src/infrastructure/data/InMemoryPartitionRepository.ts';
import { DifficultyLevel } from '../../src/core/models/music.types.ts';

describe('Curriculum & Progressive Level Catalog Tests', () => {
  const allLevels = partitionRepository.getAllPartitions();

  it('should contain 12 progressive lessons with reduced beginner drills and expanded advanced studies', () => {
    expect(allLevels.length).toBe(12);
    const beginner = partitionRepository.getPartitionsByDifficulty('Débutant');
    const intermediate = partitionRepository.getPartitionsByDifficulty('Intermédiaire');
    const advanced = partitionRepository.getPartitionsByDifficulty('Avancé');

    expect(beginner.length).toBe(3);
    expect(intermediate.length).toBe(4);
    expect(advanced.length).toBe(5);
  });

  it('should have all 3 difficulty level tabs properly populated', () => {
    const levels: DifficultyLevel[] = ['Débutant', 'Intermédiaire', 'Avancé'];
    for (const diff of levels) {
      const items = partitionRepository.getPartitionsByDifficulty(diff);
      expect(items.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('should include advanced Clé de Sol lessons spanning from La 3 (MIDI 57) to Do 6 (MIDI 84)', () => {
    const advancedTreble = partitionRepository
      .getPartitionsByDifficulty('Avancé')
      .filter((p) => p.clef === 'treble');

    expect(advancedTreble.length).toBeGreaterThanOrEqual(4);

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
  });
});
