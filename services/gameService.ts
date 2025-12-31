
import { GameState, SaveSlot, TurnVector, SummaryVector, PendingVectorItem } from '../types';
import * as dbService from './dbService';
import * as embeddingService from './ai/embeddingService';
import * as ragService from './ai/ragService';
import { getSettings } from './settingsService';
import { setDebugContext, resetRequestStats, printRequestStats } from './core/geminiClient';
import * as firebaseService from './firebaseService';

const LEGACY_SAVES_STORAGE_KEY = 'ai_rpg_all_saves';
const MAX_MANUAL_SAVES = 10;
const MAX_AUTO_SAVES = 10;

const loadAllSavesFromLocalStorage = (): SaveSlot[] => {
    try {
        const storedSaves = localStorage.getItem(LEGACY_SAVES_STORAGE_KEY);
        if (storedSaves) {
            const parsed = JSON.parse(storedSaves) as SaveSlot[];
            if (Array.isArray(parsed)) return parsed;
        }
        return [];
    } catch (error) {
        return [];
    }
};

const clearLocalStorageSaves = (): void => {
    try { localStorage.removeItem(LEGACY_SAVES_STORAGE_KEY); } catch (error) {}
};

export const migrateSaves = async (): Promise<void> => {
    const legacySaves = loadAllSavesFromLocalStorage();
    if (legacySaves.length > 0) {
        for (const save of legacySaves.reverse()) {
            await dbService.addSave(save);
        }
        clearLocalStorageSaves();
    }
};

const trimSaves = async (): Promise<void> => {
    const allSaves = await dbService.getAllSaves();
    const manualSaves = allSaves.filter(s => s.saveType === 'manual');
    const autoSaves = allSaves.filter(s => s.saveType === 'auto');

    const savesToDelete: number[] = [];
    if (manualSaves.length > MAX_MANUAL_SAVES) {
        savesToDelete.push(...manualSaves.slice(MAX_MANUAL_SAVES).map(s => s.saveId));
    }
    if (autoSaves.length > MAX_AUTO_SAVES) {
        savesToDelete.push(...autoSaves.slice(MAX_AUTO_SAVES).map(s => s.saveId));
    }
    if (savesToDelete.length > 0) {
        await Promise.all(savesToDelete.map(id => dbService.deleteSave(id)));
    }
};

export const loadAllSaves = async (): Promise<SaveSlot[]> => {
    return dbService.getAllSaves();
};

/**
 * Nhập bản lưu từ Cloud. 
 * Đảm bảo ghi đè nếu trùng ID thay vì tạo bản copy.
 */
export const importExternalSave = async (save: SaveSlot): Promise<void> => {
    if (!save || !save.saveId) return;
    try {
        await dbService.addSave(save);
        console.log(`📥 Đã đồng bộ/ghi đè bản lưu ${save.saveId} từ Cloud.`);
    } catch (error) {
        console.error("Lỗi khi import bản lưu:", error);
    }
};

export const saveGame = async (gameState: GameState, saveType: 'manual' | 'auto' = 'auto'): Promise<void> => {
  try {
    const allSaves = await dbService.getAllSaves();
    const lastTurn = gameState.history.length > 0 ? gameState.history[gameState.history.length - 1] : null;
    
    let previewText = "Bắt đầu cuộc phiêu lưu...";
    if (lastTurn) {
        const contentSnippet = lastTurn.content.replace(/<[^>]*>/g, '').substring(0, 80);
        previewText = `${lastTurn.type === 'action' ? 'Bạn' : 'AI'}: ${contentSnippet}...`;
    }

    // Logic quan trọng chống lặp:
    // Nếu worldId đã tồn tại, dùng lại saveId cũ của world đó cho cùng loại save
    let saveIdToUse = (gameState as any).saveId || Date.now();
    
    const existingSameWorldSave = allSaves.find(s => s.worldId === gameState.worldId && s.saveType === saveType);
    if (existingSameWorldSave) {
        saveIdToUse = existingSameWorldSave.saveId;
    }

    const newSave: SaveSlot = {
      ...gameState,
      worldId: gameState.worldId || saveIdToUse,
      worldName: gameState.worldConfig.storyContext.worldName || 'Cuộc phiêu lưu không tên',
      saveId: saveIdToUse,
      saveDate: new Date().toISOString(),
      previewText: previewText,
      saveType: saveType,
    };
    
    // Lưu local (IndexedDB .put sẽ tự động ghi đè nếu trùng saveId)
    await dbService.addSave(newSave);
    await trimSaves();

    // Chỉ đồng bộ manual lên cloud
    if (saveType === 'manual') {
        firebaseService.syncSaveToCloud(newSave).catch(e => console.error("Cloud Save failed:", e));
    }

  } catch (error) {
    console.error('Error saving game state:', error);
  }
};

export const deleteSave = async (saveId: number): Promise<void> => {
    try {
        await dbService.deleteSave(saveId);
        await firebaseService.deleteSaveFromCloud(saveId);
        console.log(`🗑️ Đã xóa bản lưu ${saveId} thành công.`);
    } catch (error) {
        console.error("Lỗi khi xóa bản lưu:", error);
    }
};

export const hasSavedGames = async (): Promise<boolean> => {
    const legacySaves = loadAllSavesFromLocalStorage();
    if (legacySaves.length > 0) return true;
    const saves = await loadAllSaves();
    return saves.length > 0;
};
