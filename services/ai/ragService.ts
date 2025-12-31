
import { generate, generateJson } from '../core/geminiClient';
import { GameState, GameTurn, FandomDataset, WorldConfig, VectorUpdate, EntityVector } from '../../types';
import { 
    getRetrieveRelevantSummariesPrompt,
    getRetrieveRelevantKnowledgePrompt,
    getDistillKnowledgePrompt,
    getContextualizePrompt,
    getSummarizeNpcDossierPrompt
} from '../../prompts/analysisPrompts';
import { buildBackgroundKnowledgePrompt } from '../../prompts/worldCreationPrompts';
import { isFandomDataset, extractCleanTextFromDataset } from '../../utils/datasetUtils';
import * as embeddingService from './embeddingService';
import * as fandomFileService from '../fandomFileService';
import { cosineSimilarity } from '../../utils/vectorUtils';
import { buildNsfwPayload } from '../../utils/promptBuilders';
import * as dbService from '../dbService';

const DEBUG_MODE = true;
const DOSSIER_FRESH_LIMIT = 20;

export async function generateSummary(turns: GameTurn[], worldConfig: WorldConfig): Promise<string> {
    if (turns.length === 0) return "";
    const historyText = turns.map(turn => `${turn.type === 'action' ? 'Người chơi' : 'AI'}: ${turn.content.replace(/<[^>]*>/g, '')}`).join('\n\n');
    
    const nsfwPayload = buildNsfwPayload(worldConfig);
    const systemInstruction = `${nsfwPayload}\n--- GIAO THỨC GHI CHÉP HỌC THUẬT ---`;

    const prompt = `Dựa vào đoạn hội thoại và diễn biến sau, hãy viết một đoạn tóm tắt ngắn gọn (3-4 câu) về các sự kiện chính. \n\n--- LỊCH SỬ ---\n${historyText}`;

    const summary = await generate(prompt, systemInstruction, 0, 'gemini-2.5-flash');
    return summary.replace(/<[^>]*>/g, '');
}

export async function compressNpcDossier(gameState: GameState, npcName: string): Promise<GameState> {
    const npcNameLower = npcName.toLowerCase();
    const dossier = gameState.npcDossiers?.[npcNameLower];

    if (!dossier || dossier.fresh.length <= DOSSIER_FRESH_LIMIT) {
        return gameState;
    }
    
    const turnsToSummarizeCount = dossier.fresh.length - DOSSIER_FRESH_LIMIT;
    const turnsToSummarizeIndices = dossier.fresh.slice(0, turnsToSummarizeCount);
    const turnsToKeepIndices = dossier.fresh.slice(turnsToSummarizeCount);

    const interactionHistoryText = turnsToSummarizeIndices
        .map(index => gameState.history[index])
        .filter(Boolean)
        .map(turn => `${turn.type === 'action' ? 'Người chơi' : 'AI'}: ${turn.content.replace(/<[^>]*>/g, '')}`);

    try {
        const prompt = getSummarizeNpcDossierPrompt(npcName, interactionHistoryText);
        const summaryText = await generate(prompt, undefined, 0, 'gemini-2.5-flash');
        const newArchivedFacts = summaryText.split('\n').map(s => s.trim()).filter(s => s.startsWith('- ')).map(s => s.substring(2).trim());

        if (newArchivedFacts.length > 0) {
            const newDossier = {
                fresh: turnsToKeepIndices,
                archived: [...dossier.archived, ...newArchivedFacts]
            };
            return {
                ...gameState,
                npcDossiers: { ...gameState.npcDossiers, [npcNameLower]: newDossier }
            };
        }
    } catch (error) {
        console.error(`Không thể nén hồ sơ cho ${npcName}:`, error);
    }
    return gameState;
}

export async function retrieveRelevantKnowledgeChunks(context: string, allKnowledge: {name: string, content: string}[], topK: number, queryEmbedding: number[]): Promise<{name: string, content: string}[]> {
    if (!allKnowledge || allKnowledge.length === 0) return [];

    const summaries = allKnowledge.filter(k => k.name.startsWith('tom_tat_'));
    const datasetFiles = allKnowledge.filter(k => k.name.startsWith('[DATASET]'));
    
    let relevantChunks: { text: string; score: number }[] = [];

    if (datasetFiles.length > 0 && context) {
        for (const file of datasetFiles) {
            try {
                const dataset: FandomDataset = JSON.parse(file.content);
                if (dataset.chunks) {
                    for (const chunk of dataset.chunks) {
                        const score = cosineSimilarity(queryEmbedding, chunk.embedding!);
                        if (score > 0.7) { 
                            relevantChunks.push({ text: chunk.text, score });
                        }
                    }
                }
            } catch (e) {}
        }
    }

    relevantChunks.sort((a, b) => b.score - a.score);
    const topKChunks = relevantChunks.slice(0, topK);

    return [
        ...summaries,
        ...topKChunks.map((chunk, i) => ({
            name: `Chi_tiet_lien_quan_${i + 1}`,
            content: chunk.text
        }))
    ];
}

export async function retrieveRelevantKnowledge(context: string, allKnowledge: {name: string, content: string}[], topK: number, queryEmbedding: number[]): Promise<string> {
    const selectedKnowledgeFiles = await retrieveRelevantKnowledgeChunks(context, allKnowledge, topK, queryEmbedding);
    if (selectedKnowledgeFiles.length === 0) return "";
    const hasDetailFiles = selectedKnowledgeFiles.some(f => f.name.startsWith('Chi_tiet_lien_quan_'));
    return buildBackgroundKnowledgePrompt(selectedKnowledgeFiles, hasDetailFiles);
}

const CHUNK_SIZE_DISTILL = 15000;

export async function distillKnowledgeForWorldCreation(
    idea: string,
    knowledge: { name: string; content: string }[]
): Promise<{ name: string; content: string }[]> {
    const fullContent = knowledge.map(k => {
        return isFandomDataset(k.content) ? extractCleanTextFromDataset(k.content) : k.content;
    }).join('\n\n');
    
    const textChunks: string[] = [];
    for (let i = 0; i < fullContent.length; i += CHUNK_SIZE_DISTILL) {
        textChunks.push(fullContent.substring(i, i + CHUNK_SIZE_DISTILL));
    }

    if (textChunks.length <= 1) return knowledge;

    const chunkSummaries: string[] = [];
    // QUOTA PROTECT: Xử lý TUẦN TỰ từng chunk, không dùng Promise.all
    for (const chunk of textChunks) {
        try {
            const prompt = getDistillKnowledgePrompt(idea, chunk);
            const summary = await generate(prompt, undefined, 0, 'gemini-2.5-flash');
            chunkSummaries.push(summary);
            // Nghỉ 2s giữa các chunk để tránh chạm ngưỡng RPM
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            console.error("Lỗi distill chunk:", error);
        }
    }

    const combinedSummaries = chunkSummaries.join('\n\n---\n\n');
    const finalReducePrompt = getDistillKnowledgePrompt(idea, combinedSummaries, true);
    const finalSummary = await generate(finalReducePrompt, undefined, 0, 'gemini-2.5-flash');
    
    return [{
        name: `tom_tat_dai_cuong_tu_${knowledge.length}_tep.txt`,
        content: finalSummary
    }];
}
