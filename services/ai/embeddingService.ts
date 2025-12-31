
import { generateEmbeddingsBatch } from '../core/geminiClient';
import { EntityVector } from '../../types';
import * as dbService from '../dbService';

// CỰC KỲ THẤP để tránh 429 trên môi trường Web chung IP
const BATCH_SIZE = 3; 
const DELAY_BETWEEN_BATCHES = 7000; 

export async function embedContents(chunks: string[], onProgress: (progress: number) => void = () => {}): Promise<number[][]> {
  if (!chunks || chunks.length === 0) return [];

  const allEmbeddings: number[][] = [];
  onProgress(0);

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batchChunks = chunks.slice(i, i + BATCH_SIZE);
    try {
        const batchEmbeddings = await generateEmbeddingsBatch(batchChunks);
        allEmbeddings.push(...batchEmbeddings);
        const progress = Math.min(1, (i + batchChunks.length) / chunks.length);
        onProgress(progress);
        if (i + BATCH_SIZE < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
        }
    } catch (error: any) {
        if (error.message?.includes('QUOTA') || error.message?.includes('429')) {
            console.error("🛑 Embedding Quota Exceeded. Đang đợi 20 giây...");
            await new Promise(resolve => setTimeout(resolve, 20000));
            i -= BATCH_SIZE; 
            continue;
        }
        throw error;
    }
  }
  onProgress(1);
  return allEmbeddings;
}

export async function createEntityVector(entityId: string, content: string, worldId: number): Promise<void> {
    try {
        const embeddings = await embedContents([content]);
        if (embeddings.length > 0) {
            const vector: EntityVector = { id: entityId, worldId: worldId, embedding: embeddings[0] };
            await dbService.addEntityVector(vector);
        }
    } catch (error) {
        console.error(`Lỗi tạo vector thực thể ${entityId}:`, error);
    }
}
