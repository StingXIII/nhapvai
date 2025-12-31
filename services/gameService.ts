
import { GameState, SaveSlot, TurnVector, SummaryVector, PendingVectorItem } from '../types';
import * as dbService from './dbService';
import * as embeddingService from './ai/embeddingService';
import * as ragService from './ai/ragService';
import { getSettings } from './settingsService';
import { setDebugContext, resetRequestStats, printRequestStats } from './core/geminiClient';
import * as firebaseService from './firebaseService';

const LEGACY_SAVES_STORAGE_KEY = 'ai_rpg_all_saves';
const MAX_MANUAL_SAVES = 5;
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

export const importExternalSave = async (save: SaveSlot): Promise<void> => {
    try {
        await dbService.addSave(save);
        console.log("📥 Đã đồng bộ bản lưu từ Cloud.");
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

    // Logic quan trọng: Nếu là Auto Save, tìm bản lưu Auto cũ của cùng thế giới để ghi đè (tránh lặp)
    let saveIdToUse = Date.now();
    if (saveType === 'auto' && gameState.worldId) {
        const existingAutoSave = allSaves.find(s => s.worldId === gameState.worldId && s.saveType === 'auto');
        if (existingAutoSave) {
            saveIdToUse = existingAutoSave.saveId;
        }
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
    
    await dbService.addSave(newSave);
    await trimSaves();

    // Đồng bộ lên Cloud
    firebaseService.syncSaveToCloud(newSave).catch(e => console.error("Cloud Save failed:", e));

  } catch (error) {
    console.error('Error saving game state:', error);
  }
};

export const deleteSave = async (saveId: number): Promise<void> => {
    try {
        // Xóa local
        await dbService.deleteSave(saveId);

        // Kiểm tra xem đây có phải bản lưu đang có trên Cloud không (dựa trên slot duy nhất của User)
        const cloudData = await firebaseService.loadAllFromCloud();
        if (cloudData.lastSave && cloudData.lastSave.saveId === saveId) {
            await firebaseService.deleteSaveFromCloud();
        }
        
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
