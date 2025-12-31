
import { GoogleGenAI, HarmCategory, HarmBlockThreshold, type SafetySetting } from "@google/genai";
import { getSettings } from '../settingsService';
import { AiPerformanceSettings, SafetySettingsConfig } from '../../types';
import { DEFAULT_AI_PERFORMANCE_SETTINGS } from '../../constants';
import { processNarration } from '../../utils/textProcessing';

const DEBUG_MODE = true;
let currentDebugContext = 'Unknown Source';
const requestStats: Record<string, number> = {};
const totalSessionRequests = { count: 0 };

export const setDebugContext = (context: string) => {
    currentDebugContext = context;
};

export const resetRequestStats = () => {
    for (const key in requestStats) delete requestStats[key];
};

const incrementRequestCount = (model: string) => {
    if (!DEBUG_MODE) return;
    const key = `[${currentDebugContext}] ${model}`;
    requestStats[key] = (requestStats[key] || 0) + 1;
    totalSessionRequests.count++;
};

export const printRequestStats = (actionName: string) => {
    if (!DEBUG_MODE) return;
    const totalTurnRequests = Object.values(requestStats).reduce((a, b) => a + b, 0);
    console.group(`📊 [DEBUG STATS] Báo cáo tài nguyên cho: ${actionName}`);
    if (totalTurnRequests === 0) {
        console.log('%c✅ Không tốn request nào.', 'color: #4ade80; font-weight: bold;');
    } else {
        console.table(requestStats);
    }
    console.groupEnd();
};

let ai: GoogleGenAI | null = null;
let currentApiKey: string | null = null;
let keyIndex = 0;

const UNRESTRICTED_SAFETY_SETTINGS: SafetySetting[] = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

function getAiInstance(): GoogleGenAI {
  const { apiKeyConfig } = getSettings();
  const keys = apiKeyConfig.keys.filter(Boolean);

  if (keys.length === 0) {
    throw new Error('Không tìm thấy API Key nào. Vui lòng thêm API Key trong phần Cài đặt.');
  }
  
  if (keyIndex >= keys.length) keyIndex = 0;
  const apiKey = keys[keyIndex];
  
  ai = new GoogleGenAI({ apiKey });
  currentApiKey = apiKey;
  keyIndex++;
  return ai;
}

function handleApiError(error: unknown, safetySettings: SafetySettingsConfig): Error {
    const rawMessage = error instanceof Error ? error.message : String(error);
    
    if (rawMessage.includes('429') || rawMessage.includes('RESOURCE_EXHAUSTED') || rawMessage.includes('quota')) {
        return new Error('QUOTA_EXCEEDED');
    }

    if (safetySettings.enabled && (/safety/i.test(rawMessage) || /blocked/i.test(rawMessage))) {
        return new Error("Nội dung bị chặn bởi bộ lọc an toàn.");
    }

    return new Error(`Lỗi từ Gemini API: ${rawMessage}`);
}

export async function generate(prompt: string, systemInstruction?: string, retryCount: number = 3, modelOverride?: string): Promise<string> {
    const { safetySettings, aiPerformanceSettings } = getSettings();
    const activeSafetySettings = safetySettings.enabled ? safetySettings.settings : UNRESTRICTED_SAFETY_SETTINGS;
    const perfSettings = aiPerformanceSettings || DEFAULT_AI_PERFORMANCE_SETTINGS;
    
    let selectedModel = modelOverride || perfSettings.selectedModel || 'gemini-2.5-flash';
    if (selectedModel === 'gemini-3-pro') selectedModel = 'gemini-3-pro-preview';

    const isProModel = selectedModel.includes('pro');
    const effectiveMaxTokens = (isProModel || selectedModel.includes('gemini-3')) ? 32768 : perfSettings.maxOutputTokens;
    const effectiveThinkingBudget = (isProModel || selectedModel.includes('gemini-3')) ? 16384 : perfSettings.thinkingBudget;

    const maxAttempts = 1 + retryCount;
    let lastError: Error | null = null;
    const finalContents = systemInstruction ? `${systemInstruction}\n\n---\n\n${prompt}` : prompt;

    for (let i = 0; i < maxAttempts; i++) {
      try {
        incrementRequestCount(`${selectedModel} (Attempt ${i+1})`);
        const aiInstance = getAiInstance();
        const response = await aiInstance.models.generateContent({
            model: selectedModel,
            contents: finalContents,
            config: {
                safetySettings: activeSafetySettings as unknown as SafetySetting[],
                maxOutputTokens: effectiveMaxTokens,
                thinkingConfig: { thinkingBudget: effectiveThinkingBudget }
            }
        });
        
        if (!response.text) throw new Error("Empty response");
        return response.text.trim();

      } catch (error) {
        lastError = handleApiError(error, safetySettings);
        
        if (lastError.message === 'QUOTA_EXCEEDED' && i < maxAttempts - 1) {
            // Netlify Quota Protection: Tăng thời gian chờ lâu hơn (8s, 16s, 32s)
            const delayTime = 8000 * Math.pow(2, i);
            console.warn(`⚠️ Hạn mức API tạm hết (429) trên Netlify. Thử lại sau ${delayTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, delayTime));
            continue;
        }
        if (i === maxAttempts - 1) throw lastError;
      }
    }
    throw lastError || new Error("Lỗi không xác định");
}

export async function generateJson<T>(prompt: string, schema: any, systemInstruction?: string, model: string = 'gemini-2.5-flash', overrideConfig?: Partial<AiPerformanceSettings>, retryCount: number = 3): Promise<T> {
    const { safetySettings, aiPerformanceSettings } = getSettings();
    const activeSafetySettings = safetySettings.enabled ? safetySettings.settings : UNRESTRICTED_SAFETY_SETTINGS;
    const perfSettings = aiPerformanceSettings || DEFAULT_AI_PERFORMANCE_SETTINGS;
    
    let selectedModel = model;
    if (selectedModel === 'gemini-3-pro') selectedModel = 'gemini-3-pro-preview';

    const isProModel = selectedModel.includes('pro');
    const effectiveMaxTokens = (isProModel || selectedModel.includes('gemini-3')) ? 32768 : (overrideConfig?.maxOutputTokens ?? perfSettings.maxOutputTokens);
    const effectiveThinkingBudget = (isProModel || selectedModel.includes('gemini-3')) ? 16384 : (overrideConfig?.thinkingBudget ?? perfSettings.thinkingBudget);

    const maxAttempts = 1 + retryCount;
    let lastError: Error | null = null;
    const finalContents = systemInstruction ? `${systemInstruction}\n\n---\n\n${prompt}` : prompt;

    for (let i = 0; i < maxAttempts; i++) {
      try {
        incrementRequestCount(`${selectedModel} (JSON Attempt ${i+1})`);
        const aiInstance = getAiInstance();
        const response = await aiInstance.models.generateContent({
            model: selectedModel,
            contents: finalContents,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
                safetySettings: activeSafetySettings as unknown as SafetySetting[],
                maxOutputTokens: effectiveMaxTokens,
                thinkingConfig: { thinkingBudget: effectiveThinkingBudget }
            }
         });
  
        if (!response.text) throw new Error("Empty JSON");
        const parsedJson = JSON.parse(response.text) as T;
        return parsedJson;

      } catch (error) {
        lastError = handleApiError(error, safetySettings);
        if (lastError.message === 'QUOTA_EXCEEDED' && i < maxAttempts - 1) {
            const delayTime = 8000 * Math.pow(2, i);
            console.warn(`⚠️ Hạn mức JSON API tạm hết. Đang thử lại sau ${delayTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, delayTime));
            continue;
        }
        if (i === maxAttempts - 1) throw lastError;
      }
    }
    throw lastError || new Error("Lỗi tạo JSON");
}

export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    incrementRequestCount('text-embedding-004 (Batch)');
    const aiInstance = getAiInstance();
    const result = await aiInstance.models.embedContent({
        model: "text-embedding-004",
        contents: texts,
    });
    const embeddings = result.embeddings;
    if (embeddings && embeddings.length === texts.length) {
        return embeddings.map(e => e.values);
    }
    throw new Error("Lỗi Embedding");
}
