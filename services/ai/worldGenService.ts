
import { generate, generateJson } from '../core/geminiClient';
import { WorldConfig, InitialEntity, GameState, CoreEntityType } from '../../types';
import { 
    getGenerateGenrePrompt, 
    getGenerateSettingPrompt, 
    getGenerateWorldFromIdeaPrompt,
    getGenerateFanfictionWorldPrompt,
    getGenerateEntityInfoOnTheFlyPrompt
} from '../../prompts/worldCreationPrompts';
import {
    getGenerateEntityNamePrompt,
    getGenerateEntityPersonalityPrompt,
    getGenerateEntityDescriptionPrompt
} from '../../prompts/entityPrompts';
import { 
    getGenerateFandomSummaryPrompt,
    getExtractArcListFromSummaryPrompt,
    getGenerateFandomGenesisPrompt
} from '../../prompts/fandomPrompts';
import { retrieveRelevantKnowledgeChunks } from './ragService';
import * as embeddingService from './embeddingService';
import { detectEntityTypeAndCategory } from '../../utils/textProcessing';

// --- World Creation Screen AI Helpers ---

export const generateGenre = (config: WorldConfig): Promise<string> => {
    const prompt = getGenerateGenrePrompt(config);
    return generate(prompt, undefined, 0);
};

export const generateSetting = (config: WorldConfig): Promise<string> => {
    const prompt = getGenerateSettingPrompt(config);
    return generate(prompt, undefined, 0);
};

/**
 * Kiến tạo thế giới từ ý tưởng.
 * SỬ DỤNG gemini-3-flash-preview ĐỂ TRÁNH QUOTA_EXCEEDED TRÊN NETLIFY.
 */
export async function generateWorldFromIdea(idea: string, enableMilestoneSystem: boolean, backgroundKnowledge?: {name: string, content: string}[]): Promise<WorldConfig> {
    let knowledgeForGeneration = backgroundKnowledge;
    const KNOWLEDGE_SIZE_THRESHOLD = 30000;

    if (backgroundKnowledge && backgroundKnowledge.length > 0) {
        const hasDataset = backgroundKnowledge.some(f => f.name.startsWith('[DATASET]'));
        if (hasDataset) {
            console.log("🔍 Đang sàng lọc bối cảnh liên quan cho việc kiến tạo...");
            const [queryEmbedding] = await embeddingService.embedContents([idea]);
            knowledgeForGeneration = await retrieveRelevantKnowledgeChunks(idea, backgroundKnowledge, 5, queryEmbedding);
            // Nghỉ 3s để tránh chạm RPM trước khi gọi model chính
            await new Promise(r => setTimeout(r, 3000));
        }
    }
    
    const { prompt, schema, creativeCallConfig } = getGenerateWorldFromIdeaPrompt(idea, enableMilestoneSystem, knowledgeForGeneration);
    
    // Model 3.0 Flash có RPM cao hơn nhiều so với 2.5 Pro
    return generateJson<WorldConfig>(prompt, schema, undefined, 'gemini-3-flash-preview', creativeCallConfig, 2);
}

export async function generateFanfictionWorld(idea: string, enableMilestoneSystem: boolean, backgroundKnowledge?: {name: string, content: string}[]): Promise<WorldConfig> {
    let knowledgeForGeneration = backgroundKnowledge;

    if (backgroundKnowledge && backgroundKnowledge.length > 0) {
        const hasDataset = backgroundKnowledge.some(f => f.name.startsWith('[DATASET]'));
        if (hasDataset) {
            const [queryEmbedding] = await embeddingService.embedContents([idea]);
            knowledgeForGeneration = await retrieveRelevantKnowledgeChunks(idea, backgroundKnowledge, 5, queryEmbedding);
            await new Promise(r => setTimeout(r, 3000));
        }
    }

    const { prompt, schema, creativeCallConfig } = getGenerateFanfictionWorldPrompt(idea, enableMilestoneSystem, knowledgeForGeneration);
    return generateJson<WorldConfig>(prompt, schema, undefined, 'gemini-3-flash-preview', creativeCallConfig, 2);
}

// --- Entity Creation AI Helpers ---

export const generateEntityName = (config: WorldConfig, entity: InitialEntity): Promise<string> => {
    const prompt = getGenerateEntityNamePrompt(config, entity);
    return generate(prompt, undefined, 0);
};

export const generateEntityPersonality = (config: WorldConfig, entity: InitialEntity): Promise<string> => {
    const prompt = getGenerateEntityPersonalityPrompt(config, entity);
    return generate(prompt, undefined, 0);
};

export const generateEntityDescription = (config: WorldConfig, entity: InitialEntity): Promise<string> => {
    const prompt = getGenerateEntityDescriptionPrompt(config, entity);
    return generate(prompt, undefined, 0);
};

// --- Fandom Genesis AI ---

export async function generateFandomSummary(workName: string, authorName?: string): Promise<string> {
    const { prompt, systemInstruction } = getGenerateFandomSummaryPrompt(workName, authorName);
    return generate(prompt, systemInstruction, 0);
}

export async function extractArcListFromSummary(summaryContent: string): Promise<string[]> {
    const { prompt, schema } = getExtractArcListFromSummaryPrompt(summaryContent);
    const result = await generateJson<{ arcs: string[] }>(prompt, schema, undefined, 'gemini-2.5-flash', undefined, 0);
    return result.arcs || [];
}

export async function generateFandomGenesis(summaryContent: string, arcName: string, workName: string, authorName?: string): Promise<string> {
    const { prompt, systemInstruction, creativeCallConfig } = getGenerateFandomGenesisPrompt(summaryContent, arcName, workName, authorName);
    return generate(prompt, systemInstruction, 0);
}

export const generateEntityInfoOnTheFly = (
    gameState: GameState, 
    entityName: string,
    preDetectedType?: CoreEntityType | null,
    preDetectedCategory?: string | null
): Promise<InitialEntity> => {
    const { worldConfig, history } = gameState;
    let finalType = preDetectedType;
    let finalCategory = preDetectedCategory;
    if (!finalType) {
        const detection = detectEntityTypeAndCategory(entityName);
        finalType = detection.type;
        finalCategory = detection.category;
    }
    const { prompt, schema, creativeCallConfig } = getGenerateEntityInfoOnTheFlyPrompt(
        worldConfig, history.slice(-10), entityName, finalType, finalCategory
    );
    return generateJson<InitialEntity>(prompt, schema, undefined, 'gemini-2.5-flash', creativeCallConfig, 1);
};
