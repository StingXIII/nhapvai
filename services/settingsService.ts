
import { AppSettings, ApiKeyStorage, SafetySettingsConfig, RagSettings } from '../types';
import { DEFAULT_SAFETY_SETTINGS, DEFAULT_RAG_SETTINGS, DEFAULT_AI_PERFORMANCE_SETTINGS } from '../constants';
import * as firebaseService from './firebaseService';

const SETTINGS_STORAGE_KEY = 'ai_rpg_settings';

const DEFAULT_SETTINGS: AppSettings = {
  apiKeyConfig: { keys: [] },
  safetySettings: DEFAULT_SAFETY_SETTINGS,
  ragSettings: DEFAULT_RAG_SETTINGS,
  aiPerformanceSettings: DEFAULT_AI_PERFORMANCE_SETTINGS,
};

export const getSettings = (): AppSettings => {
  try {
    const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (storedSettings) {
      const parsed = JSON.parse(storedSettings) as Partial<AppSettings>;
      const mergedSettings: AppSettings = {
        ...DEFAULT_SETTINGS,
        ...parsed,
        apiKeyConfig: parsed.apiKeyConfig || DEFAULT_SETTINGS.apiKeyConfig,
        safetySettings: parsed.safetySettings || DEFAULT_SETTINGS.safetySettings,
        ragSettings: {
          ...DEFAULT_SETTINGS.ragSettings,
          ...(parsed.ragSettings || {}),
        },
        aiPerformanceSettings: {
          ...DEFAULT_SETTINGS.aiPerformanceSettings,
          ...(parsed.aiPerformanceSettings || {}),
        },
      };
      return mergedSettings;
    }
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Error getting settings from localStorage:', error);
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = (settings: AppSettings): void => {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    
    // CLOUD SYNC: Đẩy cấu hình (API Keys) lên Firebase
    firebaseService.syncSettingsToCloud(settings).catch(e => console.error("Cloud Settings sync failed:", e));

  } catch (error) {
    console.error('Error saving settings to localStorage:', error);
  }
};
