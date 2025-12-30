
import { generate, generateJson } from '../core/geminiClient';
import { KnowledgeBase, Skill, NPC, Wife, Slave } from '../../types';
import { generateCultivationSessionPrompt } from '../../prompts/cultivationPrompt';
import { generateSummarizeCultivationPrompt } from '../../prompts/summarizeCultivationPrompt';
import { parseResponse } from '../../utils/tagProcessors';

export const generateCultivationSession = async (
    kb: KnowledgeBase,
    cultivationType: 'skill' | 'method',
    duration: number, // in turns
    currentPageMessagesLog: string,
    previousPageSummaries: string[],
    lastNarrationFromPreviousPage?: string,
    skill?: Skill,
    method?: Skill,
    partner?: NPC | Wife | Slave,
    logPromptCallback?: (prompt: string) => void
): Promise<{ response: { narration: string; tags: any[] }; rawText: string }> => {
    const prompt = generateCultivationSessionPrompt(
        kb, cultivationType, duration, 
        currentPageMessagesLog, previousPageSummaries, lastNarrationFromPreviousPage,
        skill, method, partner
    );

    if (logPromptCallback) logPromptCallback(prompt);

    // Using Flash for cultivation to be fast
    const rawText = await generate(prompt, undefined, 1, 'gemini-2.5-flash');
    const parsed = parseResponse(rawText);

    return { response: parsed, rawText };
};

export const summarizeCultivationSession = async (log: string[]): Promise<string> => {
    const prompt = generateSummarizeCultivationPrompt(log);
    const summary = await generate(prompt, undefined, 0, 'gemini-2.5-flash');
    return summary;
};
