
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

// --- Legacy localStorage functions for migration ---
const loadAllSavesFromLocalStorage = (): SaveSlot[] => {
    try {
        const storedSaves = localStorage.getItem(LEGACY_SAVES_STORAGE_KEY);
        if (storedSaves) {
            const parsed = JSON.parse(storedSaves) as SaveSlot[];
            if (Array.isArray(parsed)) {
                return parsed;
            }
        }
        return [];
    } catch (error) {
        console.error('Error loading legacy saves from localStorage:', error);
        return [];
    }
};

const clearLocalStorageSaves = (): void => {
    try {
        localStorage.removeItem(LEGACY_SAVES_STORAGE_KEY);
    } catch (error) {
        console.error('Error clearing legacy saves:', error);
    }
};

let migrationPromise: Promise<void> | null = null;
export const migrateSaves = (): Promise<void> => {
    if (migrationPromise) {
        return migrationPromise;
    }
    migrationPromise = (async () => {
        const legacySaves = loadAllSavesFromLocalStorage();
        if (legacySaves.length > 0) {
            console.log(`Migrating ${legacySaves.length} saves from localStorage to IndexedDB...`);
            try {
                for (const save of legacySaves.reverse()) {
                    await dbService.addSave(save);
                }
                clearLocalStorageSaves();
                console.log('Migration successful.');
            } catch (error) {
                console.error('Migration failed:', error);
            }
        }
    })();
    return migrationPromise;
};


// --- New IndexedDB-based functions ---

const trimSaves = async (): Promise<void> => {
    const allSaves = await dbService.getAllSaves();
    const manualSaves = allSaves.filter(s => s.saveType === 'manual');
    const autoSaves = allSaves.filter(s => s.saveType === 'auto');

    const savesToDelete: number[] = [];

    if (manualSaves.length > MAX_MANUAL_SAVES) {
        const oldestManualSaves = manualSaves.slice(MAX_MANUAL_SAVES);
        savesToDelete.push(...oldestManualSaves.map(s => s.saveId));
    }

    if (autoSaves.length > MAX_AUTO_SAVES) {
        const oldestAutoSaves = autoSaves.slice(MAX_AUTO_SAVES);
        savesToDelete.push(...oldestAutoSaves.map(s => s.saveId));
    }

    if (savesToDelete.length > 0) {
        await Promise.all(savesToDelete.map(id => dbService.deleteSave(id)));
    }
};

export const loadAllSaves = async (): Promise<SaveSlot[]> => {
    console.groupCollapsed('📂 [DEBUG STATS] Load Saves List');
    console.log('%c✅ Không tốn request nào. (Chỉ đọc từ IndexedDB)', 'color: #4ade80; font-weight: bold;');
    console.groupEnd();
    return dbService.getAllSaves();
};

export function createTurnVectorItem(turnIndex: number, content: string, previousTurnContent?: string): PendingVectorItem {
    let combinedContent = content;
    if (previousTurnContent) {
        combinedContent = `[Ngữ cảnh trước đó: ${previousTurnContent.substring(0, 300)}...]\n[Nội dung chính: ${content}]`;
    }
    
    return {
        id: turnIndex,
        type: 'Turn',
        content: combinedContent
    };
}

export async function vectorizePendingTurns(gameState: GameState): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
        console.warn("vectorizePendingTurns is deprecated. Use pendingVectorBuffer in GameState instead.");
    }
}

export const saveGame = async (gameState: GameState, saveType: 'manual' | 'auto' = 'auto'): Promise<void> => {
  try {
    const lastTurn = gameState.history.length > 0 ? gameState.history[gameState.history.length - 1] : null;
    
    let previewText = "Bắt đầu cuộc phiêu lưu...";
    if (lastTurn) {
        const contentSnippet = lastTurn.content.replace(/<[^>]*>/g, '').substring(0, 80);
        previewText = `${lastTurn.type === 'action' ? 'Bạn' : 'AI'}: ${contentSnippet}...`;
    }

    const newSave: SaveSlot = {
      ...gameState,
      worldId: gameState.worldId || Date.now(),
      worldName: gameState.worldConfig.storyContext.worldName || 'Cuộc phiêu lưu không tên',
      saveId: Date.now(),
      saveDate: new Date().toISOString(),
      previewText: previewText,
      saveType: saveType,
    };
    
    if (!newSave.worldId) {
        newSave.worldId = newSave.saveId;
    }

    await dbService.addSave(newSave);
    await trimSaves();

    // CLOUD SYNC: Đẩy bản lưu lên Firebase
    // Chúng ta không dùng await ở đây để không làm chậm trải nghiệm UI
    firebaseService.syncSaveToCloud(newSave).catch(e => console.error("Cloud Save failed:", e));

    console.log(`%c💾 [GAME SAVED] Đã lưu game (${saveType}) thành công vào cục bộ và Cloud.`, 'color: #3b82f6;');

  } catch (error) {
    console.error('Error saving game state:', error);
    throw new Error('Không thể lưu game vào bộ nhớ trình duyệt.');
  }
};


export const deleteSave = async (saveId: number): Promise<void> => {
    const saveToDelete = await dbService.getAllSaves().then(s => s.find(sv => sv.saveId === saveId));
    if (saveToDelete && saveToDelete.worldId) {
        const worldIdToDelete = saveToDelete.worldId;
        await dbService.deleteSave(saveId);
        
        const turnVectors = await dbService.getAllTurnVectors(worldIdToDelete);
        for(const v of turnVectors) await dbService.deleteSave(v.turnId);

        const summaryVectors = await dbService.getAllSummaryVectors(worldIdToDelete);
        for(const v of summaryVectors) await dbService.deleteSave(v.summaryId);

        const entityVectors = await dbService.getAllEntityVectors(worldIdToDelete);
        for(const v of entityVectors) await dbService.deleteEntityVector(v.id);
    } else {
         await dbService.deleteSave(saveId);
    }
};


export const hasSavedGames = async (): Promise<boolean> => {
    if (loadAllSavesFromLocalStorage().length > 0) {
        return true;
    }
    const saves = await loadAllSaves();
    return saves.length > 0;
};
