import { PartitionRepositoryPort } from '../../core/ports/PartitionRepositoryPort.ts';
import { PartitionPiece } from '../../core/models/music.types.ts';

export class InMemoryPartitionRepository implements PartitionRepositoryPort {
  private partitions: PartitionPiece[] = [
    {
      id: 'premiers-pas',
      title: 'Niveau 1 : Premiers Pas (Do - Ré - Mi)',
      composer: 'Exercice d’initiation',
      difficulty: 'Débutant',
      clef: 'treble',
      keySignature: 'Do',
      timeSignature: [4, 4],
      tempo: 75,
      description: 'Repérez Do 4 (sur sa ligne supplémentaire sous la portée), Ré 4 et Mi 4 (1ère ligne de la portée) en Clé de Sol.',
      learningFocus: 'Repérage spatial du Do central et des deux premières notes.',
      notes: [
        { id: 'p1', solfegePitch: 'Do 4', midi: 60, step: 'Do', octave: 4, duration: 'quarter', finger: 1 },
        { id: 'p2', solfegePitch: 'Ré 4', midi: 62, step: 'Ré', octave: 4, duration: 'quarter', finger: 2 },
        { id: 'p3', solfegePitch: 'Mi 4', midi: 64, step: 'Mi', octave: 4, duration: 'quarter', finger: 3 },
        { id: 'p4', solfegePitch: 'Ré 4', midi: 62, step: 'Ré', octave: 4, duration: 'quarter', finger: 2 },
        { id: 'p5', solfegePitch: 'Do 4', midi: 60, step: 'Do', octave: 4, duration: 'half', finger: 1 },
      ],
    },
    {
      id: 'quinte-do',
      title: 'Niveau 2 : Quinte de Do Majeur',
      composer: 'Gymnastique des 5 doigts',
      difficulty: 'Débutant',
      clef: 'treble',
      keySignature: 'Do',
      timeSignature: [4, 4],
      tempo: 80,
      description: 'Parcourez les 5 premières notes de la gamme : Do 4, Ré 4, Mi 4, Fa 4, Sol 4 (2ème ligne de la Clé de Sol).',
      learningFocus: 'Fluidité sur 5 notes consécutives sans déplacer la main.',
      notes: [
        { id: 'q1', solfegePitch: 'Do 4', midi: 60, step: 'Do', octave: 4, duration: 'quarter', finger: 1 },
        { id: 'q2', solfegePitch: 'Ré 4', midi: 62, step: 'Ré', octave: 4, duration: 'quarter', finger: 2 },
        { id: 'q3', solfegePitch: 'Mi 4', midi: 64, step: 'Mi', octave: 4, duration: 'quarter', finger: 3 },
        { id: 'q4', solfegePitch: 'Fa 4', midi: 65, step: 'Fa', octave: 4, duration: 'quarter', finger: 4 },
        { id: 'q5', solfegePitch: 'Sol 4', midi: 67, step: 'Sol', octave: 4, duration: 'half', finger: 5 },
        { id: 'q6', solfegePitch: 'Fa 4', midi: 65, step: 'Fa', octave: 4, duration: 'quarter', finger: 4 },
        { id: 'q7', solfegePitch: 'Mi 4', midi: 64, step: 'Mi', octave: 4, duration: 'quarter', finger: 3 },
        { id: 'q8', solfegePitch: 'Ré 4', midi: 62, step: 'Ré', octave: 4, duration: 'quarter', finger: 2 },
        { id: 'q9', solfegePitch: 'Do 4', midi: 60, step: 'Do', octave: 4, duration: 'whole', finger: 1 },
      ],
    },
    {
      id: 'hymne-a-la-joie',
      title: 'Niveau 3 : Beethoven - Hymne à la Joie',
      composer: 'Ludwig van Beethoven',
      difficulty: 'Élémentaire',
      clef: 'treble',
      keySignature: 'Do',
      timeSignature: [4, 4],
      tempo: 90,
      description: 'Le thème intemporel de la 9ème Symphonie joué en Solfège sur le clavier.',
      learningFocus: 'Enchaînement mélodique et répétition de notes avec changement de doigté.',
      notes: [
        { id: 'h1', solfegePitch: 'Mi 4', midi: 64, step: 'Mi', octave: 4, duration: 'quarter', finger: 3 },
        { id: 'h2', solfegePitch: 'Mi 4', midi: 64, step: 'Mi', octave: 4, duration: 'quarter', finger: 3 },
        { id: 'h3', solfegePitch: 'Fa 4', midi: 65, step: 'Fa', octave: 4, duration: 'quarter', finger: 4 },
        { id: 'h4', solfegePitch: 'Sol 4', midi: 67, step: 'Sol', octave: 4, duration: 'quarter', finger: 5 },
        { id: 'h5', solfegePitch: 'Sol 4', midi: 67, step: 'Sol', octave: 4, duration: 'quarter', finger: 5 },
        { id: 'h6', solfegePitch: 'Fa 4', midi: 65, step: 'Fa', octave: 4, duration: 'quarter', finger: 4 },
        { id: 'h7', solfegePitch: 'Mi 4', midi: 64, step: 'Mi', octave: 4, duration: 'quarter', finger: 3 },
        { id: 'h8', solfegePitch: 'Ré 4', midi: 62, step: 'Ré', octave: 4, duration: 'quarter', finger: 2 },
        { id: 'h9', solfegePitch: 'Do 4', midi: 60, step: 'Do', octave: 4, duration: 'quarter', finger: 1 },
        { id: 'h10', solfegePitch: 'Do 4', midi: 60, step: 'Do', octave: 4, duration: 'quarter', finger: 1 },
        { id: 'h11', solfegePitch: 'Ré 4', midi: 62, step: 'Ré', octave: 4, duration: 'quarter', finger: 2 },
        { id: 'h12', solfegePitch: 'Mi 4', midi: 64, step: 'Mi', octave: 4, duration: 'quarter', finger: 3 },
        { id: 'h13', solfegePitch: 'Mi 4', midi: 64, step: 'Mi', octave: 4, duration: 'quarter', finger: 3 },
        { id: 'h14', solfegePitch: 'Ré 4', midi: 62, step: 'Ré', octave: 4, duration: 'half', finger: 2 },
      ],
    },
    {
      id: 'clef-de-fa',
      title: 'Niveau 4 : Clé de Fa (Main Gauche)',
      composer: 'Basse fondamentale',
      difficulty: 'Élémentaire',
      clef: 'bass',
      keySignature: 'Do',
      timeSignature: [4, 4],
      tempo: 75,
      description: 'Découvrez la Clé de Fa pour la main gauche dans le registre grave (Do 3, Mi 3, Sol 3).',
      learningFocus: 'Lecture en Clé de Fa et repérage des notes graves sur le piano.',
      notes: [
        { id: 'b1', solfegePitch: 'Do 3', midi: 48, step: 'Do', octave: 3, duration: 'quarter', finger: 5 },
        { id: 'b2', solfegePitch: 'Mi 3', midi: 52, step: 'Mi', octave: 3, duration: 'quarter', finger: 3 },
        { id: 'b3', solfegePitch: 'Sol 3', midi: 55, step: 'Sol', octave: 3, duration: 'quarter', finger: 1 },
        { id: 'b4', solfegePitch: 'Mi 3', midi: 52, step: 'Mi', octave: 3, duration: 'quarter', finger: 3 },
        { id: 'b5', solfegePitch: 'Do 3', midi: 48, step: 'Do', octave: 3, duration: 'whole', finger: 5 },
      ],
    },
  ];

  public getAllPartitions(): PartitionPiece[] {
    return [...this.partitions];
  }

  public getPartitionById(id: string): PartitionPiece | undefined {
    return this.partitions.find((p) => p.id === id);
  }
}

export const partitionRepository = new InMemoryPartitionRepository();
