
import { generateEmbeddingsBatch } from '../core/geminiClient';
import { EntityVector } from '../../types';
import * as dbService from '../dbService';

// Giảm Batch Size xuống 5 (thay vì 20) để cực kỳ an toàn trên Netlify
const BATCH_SIZE = 5; 
// Tăng độ trễ giữa các đợt để tránh burst traffic
const DELAY_BETWEEN_BATCHES = 5000; 

/**
 * Tạo embeddings cho mảng văn bản với cơ chế batching cực kỳ an toàn.
 */
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
        console.error(`Lỗi embedding batch:`, error);
        // Nếu bị 429 khi đang embed, đợi rất lâu (15s)
        if (error.message?.includes('QUOTA') || error.message?.includes('429')) {
            console.warn("Dừng 15 giây để hồi phục Quota Embedding...");
            await new Promise(resolve => setTimeout(resolve, 15000));
            i -= BATCH_SIZE; // Thử lại batch này
            continue;
        }
        throw new Error(`Lỗi tạo embeddings: ${error.message}`);
    }
  }

  onProgress(1);
  return allEmbeddings;
}

/**
 * Tạo vector cho một thực thể duy nhất.
 */
export async function createEntityVector(entityId: string, content: string, worldId: number): Promise<void> {
    try {
        const embeddings = await embedContents([content]);
        if (embeddings.length > 0) {
            const vector: EntityVector = {
                id: entityId,
                worldId: worldId,
                embedding: embeddings[0]
            };
            await dbService.addEntityVector(vector);
        }
    } catch (error) {
        console.error(`Lỗi tạo vector thực thể ${entityId}:`, error);
    }
}
