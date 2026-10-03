import { PartitionPiece } from '../models/music.types.ts';

export interface PartitionRepositoryPort {
  getAllPartitions(): PartitionPiece[];
  getPartitionById(id: string): PartitionPiece | undefined;
}
