import { describe, it, expect } from 'vitest';
import { partitionRepository } from '../../src/infrastructure/data/InMemoryPartitionRepository.ts';
import { TrainingCategory } from '../../src/core/models/music.types.ts';

describe('Curriculum & Progressive Level Catalog Tests', () => {
  const allLevels = partitionRepository.getAllPartitions();

  it('should contain 14 progressive levels', () => {
    expect(allLevels.length).toBe(14);
  });

  it('should have all 4 pedagogical categories properly populated', () => {
    const categories: TrainingCategory[] = ['landmarks', 'bass_clef', 'intervals', 'repertoire'];
    for (const cat of categories) {
      const items = partitionRepository.getPartitionsByCategory(cat);
      expect(items.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('should have sequential level numbers from 1 to 14 without gaps', () => {
    const numbers = allLevels.map((l) => l.levelNumber);
    for (let i = 1; i <= 14; i++) {
      expect(numbers).toContain(i);
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
    expect(p1?.title).toBe('Le Do Central & ses Voisins');
    expect(p1?.category).toBe('landmarks');
  });
});
