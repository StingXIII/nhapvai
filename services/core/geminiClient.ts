
import { GoogleGenAI, HarmCategory, HarmBlockThreshold, type SafetySetting } from "@google/genai";
import { getSettings } from '../settingsService';
import { AiPerformanceSettings, SafetySettingsConfig } from '../../types';
import { DEFAULT_AI_PERFORMANCE_SETTINGS } from '../../constants';

const DEBUG_MODE = true;
let currentDebugContext = 'Unknown Source';
const requestStats: Record<string, number> = {};
const totalSessionRequests = { count: 0 };

// Global Quota Lock
let isQuotaLocked = false;
const QUOTA_LOCK_DURATION = 15000; // 15 giây nghỉ toàn cục

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
    console.group(`📊 [DEBUG STATS] ${actionName}`);
    if (totalTurnRequests === 0) {
        console.log('%c✅ Không tốn request.', 'color: #4ade80;');
    } else {
        console.table(requestStats);
    }
    console.groupEnd();
};

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
  if (keys.length === 0) throw new Error('Không tìm thấy API Key.');
  
  if (keyIndex >= keys.length) keyIndex = 0;
  const apiKey = keys[keyIndex];
  keyIndex++;
  return new GoogleGenAI({ apiKey });
}

async function waitForQuota() {
    if (isQuotaLocked) {
        console.warn("⏳ Hệ thống đang tạm dừng để hồi phục hạn mức API...");
        while (isQuotaLocked) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
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

    const finalContents = systemInstruction ? `${systemInstruction}\n\n---\n\n${prompt}` : prompt;

    for (let i = 0; i < 1 + retryCount; i++) {
      try {
        await waitForQuota();
        incrementRequestCount(`${selectedModel} (M${i+1})`);
        const aiInstance = getAiInstance();
        const response = await aiInstance.models.generateContent({
            model: selectedModel,
            contents: finalContents,
            config: {
                safetySettings: activeSafetySettings as unknown as SafetySetting[],
                maxOutputTokens: selectedModel.includes('flash') ? 8192 : 32768,
                thinkingConfig: { thinkingBudget: selectedModel.includes('flash') ? 2048 : 16384 }
            }
        });
        if (!response.text) throw new Error("Empty response");
        return response.text.trim();
      } catch (error) {
        const lastError = handleApiError(error, safetySettings);
        if (lastError.message === 'QUOTA_EXCEEDED') {
            isQuotaLocked = true;
            const delayTime = 12000 * Math.pow(2, i);
            console.error(`🚨 CẠN HẠN MỨC (429). Khóa yêu cầu trong ${delayTime}ms...`);
            setTimeout(() => { isQuotaLocked = false; }, QUOTA_LOCK_DURATION);
            await new Promise(resolve => setTimeout(resolve, delayTime));
            continue;
        }
        if (i === retryCount) throw lastError;
      }
    }
    throw new Error("Lỗi không xác định");
}

export async function generateJson<T>(prompt: string, schema: any, systemInstruction?: string, model: string = 'gemini-2.5-flash', overrideConfig?: Partial<AiPerformanceSettings>, retryCount: number = 3): Promise<T> {
    const { safetySettings, aiPerformanceSettings } = getSettings();
    const activeSafetySettings = safetySettings.enabled ? safetySettings.settings : UNRESTRICTED_SAFETY_SETTINGS;
    const perfSettings = aiPerformanceSettings || DEFAULT_AI_PERFORMANCE_SETTINGS;
    
    let selectedModel = model;
    if (selectedModel === 'gemini-3-pro') selectedModel = 'gemini-3-pro-preview';

    const finalContents = systemInstruction ? `${systemInstruction}\n\n---\n\n${prompt}` : prompt;

    for (let i = 0; i < 1 + retryCount; i++) {
      try {
        await waitForQuota();
        incrementRequestCount(`${selectedModel} (JSON M${i+1})`);
        const aiInstance = getAiInstance();
        const response = await aiInstance.models.generateContent({
            model: selectedModel,
            contents: finalContents,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
                safetySettings: activeSafetySettings as unknown as SafetySetting[],
                maxOutputTokens: 32768,
                thinkingConfig: { thinkingBudget: 16384 }
            }
         });
        if (!response.text) throw new Error("Empty JSON");
        return JSON.parse(response.text) as T;
      } catch (error) {
        const lastError = handleApiError(error, safetySettings);
        if (lastError.message === 'QUOTA_EXCEEDED') {
            isQuotaLocked = true;
            const delayTime = 15000 * Math.pow(2, i);
            setTimeout(() => { isQuotaLocked = false; }, QUOTA_LOCK_DURATION);
            await new Promise(resolve => setTimeout(resolve, delayTime));
            continue;
        }
        if (i === retryCount) throw lastError;
      }
    }
    throw new Error("Lỗi tạo JSON");
}

export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    await waitForQuota();
    incrementRequestCount('text-embedding-004');
    const aiInstance = getAiInstance();
    const result = await aiInstance.models.embedContent({
        model: "text-embedding-004",
        contents: texts,
    });
    if (result.embeddings) return result.embeddings.map(e => e.values);
    throw new Error("Lỗi Embedding");
}
