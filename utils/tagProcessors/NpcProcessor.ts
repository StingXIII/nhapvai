
// utils/tagProcessors/NpcProcessor.ts
import { GameState, EncounteredNPC, VectorUpdate, PlayerStats } from '../../types';
import { mergeAndDeduplicateByName } from '../arrayUtils';
import { sanitizeEntityName, parseRealmString } from '../textProcessing';
import { generateMechanicalNpcStats } from '../statsCalculationUtils';
import { SUB_REALM_NAMES } from '../../constants';
// FIX: Import DEFAULT_PLAYER_STATS to be used as a base for NPC stats.
import { DEFAULT_PLAYER_STATS } from '../../constants/character';

/**
 * Xử lý logic thêm hoặc cập nhật thông tin một NPC.
 * Đảm bảo tính toàn vẹn dữ liệu: Luôn khởi tạo stats nếu thiếu.
 */
export function processNpcNewOrUpdate(currentState: GameState, params: any): { newState: GameState, vectorUpdates: VectorUpdate[] } {
    if (!params.name) {
        console.warn('Bỏ qua thẻ [NPC_NEW/UPDATE] không hợp lệ:', params);
        return { newState: currentState, vectorUpdates: [] };
    }

    const sanitizedName = sanitizeEntityName(params.name);

    // Khởi tạo dữ liệu cơ bản
    const newNpcData: any = {
        id: sanitizedName.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now(),
        name: sanitizedName,
        description: params.description || 'Một nhân vật trong thế giới này.', 
        personality: params.personality || 'Chưa rõ',
        thoughtsOnPlayer: params.thoughtsOnPlayer || 'Chưa có tương tác đặc biệt',
        tags: params.tags ? (typeof params.tags === 'string' ? params.tags.split(',').map((t: string) => t.trim()) : params.tags) : [],
        customCategory: params.category || 'Nhân Vật', 
        locationId: params.locationId || currentState.currentLocationId, 
        physicalState: params.physicalState || 'Bình thường',
        affinity: params.affinity || 0,
    };

    // --- NPC STATS GENERATION (UPGRADED) ---
    if (currentState.worldConfig.enableStatsSystem) {
        const playerStats = currentState.playerStats;
        const majorRealms = currentState.realmProgressionList || [];
        const minorRealms = currentState.worldConfig.cultivationSystem ? parseRealmString(currentState.worldConfig.cultivationSystem.minorRealms) : SUB_REALM_NAMES;
        
        const npcRealm = params.realm || params.initialRealm || playerStats.realm || (majorRealms.length > 0 ? majorRealms[0] : 'Phàm Nhân');
        
        // **REFACTORED LOGIC**: Always generate stats mechanically. Ignore any `stats` object from AI.
        // The AI's job is to provide `realm` and `tags` for context.
        
        let archetypeKey: string = 'BALANCED'; // Default archetype
        
        // Robustly parse tags from params
        let npcTags: string[] = [];
        if (typeof params.tags === 'string') {
            npcTags = params.tags.split(',').map((t: string) => t.trim().toLowerCase());
        } else if (Array.isArray(params.tags)) {
            npcTags = params.tags.map((t: any) => String(t).toLowerCase());
        }

        // Determine archetype from tags
        if (npcTags.includes('boss') || npcTags.includes('trùm')) {
            archetypeKey = 'BOSS';
        } else if (npcTags.includes('lính') || npcTags.includes('yếu') || npcTags.includes('lính gác')) {
            archetypeKey = 'FODDER';
        } else if (npcTags.includes('tank') || npcTags.includes('trâu bò') || npcTags.includes('phòng ngự')) {
            archetypeKey = 'TANK';
        } else if (npcTags.includes('sát thủ') || npcTags.includes('nhanh nhẹn')) {
            archetypeKey = 'ASSASSIN';
        } else if (npcTags.includes('pháp sư') || npcTags.includes('mage')) {
            archetypeKey = 'MAGE';
        }
        
        newNpcData.stats = generateMechanicalNpcStats(
            playerStats,
            npcRealm,
            majorRealms,
            minorRealms,
            archetypeKey
        );
        
        newNpcData.realm = npcRealm;
    }

    const updatedNpcs = mergeAndDeduplicateByName(currentState.encounteredNPCs || [], [newNpcData]);
    
    const vectorContent = `NPC: ${newNpcData.name}\nMô tả: ${newNpcData.description}\nPhân loại: ${newNpcData.customCategory}\nTính cách: ${newNpcData.personality}\nCảnh giới: ${newNpcData.realm || 'Không rõ'}`;
    const vectorUpdate: VectorUpdate = {
        id: newNpcData.name,
        type: 'NPC',
        content: vectorContent,
    };
    
    return {
        newState: {
            ...currentState,
            encounteredNPCs: updatedNpcs,
        },
        vectorUpdates: [vectorUpdate],
    };
}

/**
 * Xử lý logic chỉ cập nhật suy nghĩ của một NPC về người chơi.
 */
export function processNpcThoughtsUpdate(currentState: GameState, params: any): { newState: GameState, vectorUpdates: VectorUpdate[] } {
    if (!params.name) return { newState: currentState, vectorUpdates: [] };

    const sanitizedName = sanitizeEntityName(params.name);
    const npcNameLower = sanitizedName.toLowerCase();
    
    let updatedNpcs = [...(currentState.encounteredNPCs || [])];
    const existingNpcIndex = updatedNpcs.findIndex(npc => npc.name.toLowerCase() === npcNameLower);

    if (existingNpcIndex > -1) {
        const originalNpc = updatedNpcs[existingNpcIndex];
        const updatedNpc = {
            ...originalNpc,
            thoughtsOnPlayer: params.thoughtsOnPlayer || originalNpc.thoughtsOnPlayer,
            physicalState: params.physicalState || originalNpc.physicalState,
            customCategory: params.category || originalNpc.customCategory,
        };
        updatedNpcs[existingNpcIndex] = updatedNpc;
        
        const vectorContent = `NPC: ${updatedNpc.name}\nSuy nghĩ: ${updatedNpc.thoughtsOnPlayer}\nTrạng thái: ${updatedNpc.physicalState}`;
        return {
            newState: { ...currentState, encounteredNPCs: updatedNpcs },
            vectorUpdates: [{ id: updatedNpc.name, type: 'NPC', content: vectorContent }],
        };
    } else {
        // Nếu NPC chưa tồn tại, ép buộc tạo mới để có chỉ số (Tránh lỗi NPC không stats)
        return processNpcNewOrUpdate(currentState, params);
    }
}

/**
 * Xử lý logic thiết lập một "cờ ghi nhớ" (memory flag) cho một NPC.
 */
export function processMemoryFlag(currentState: GameState, params: any): { newState: GameState, vectorUpdates: VectorUpdate[] } {
    if (!params.npc || !params.flag || typeof params.value === 'undefined') return { newState: currentState, vectorUpdates: [] };
    
    const sanitizedName = sanitizeEntityName(params.npc);
    const npcNameLower = sanitizedName.toLowerCase();
    let npcFound = false;
    
    const updatedNpcs = (currentState.encounteredNPCs || []).map(npc => {
        if (npc.name.toLowerCase() === npcNameLower) {
            npcFound = true;
            const newMemoryFlags = { ...(npc.memoryFlags || {}), [params.flag]: params.value };
            return { ...npc, memoryFlags: newMemoryFlags };
        }
        return npc;
    });

    if (!npcFound) {
        // Tự động tạo NPC nếu AI gán cờ cho một nhân vật mới
        const { newState } = processNpcNewOrUpdate(currentState, { name: sanitizedName });
        return processMemoryFlag(newState, params);
    }

    return { newState: { ...currentState, encounteredNPCs: updatedNpcs }, vectorUpdates: [] };
}

/**
 * Xử lý cập nhật cảm xúc NPC (EQ).
 */
export function processNpcEmotion(currentState: GameState, params: any): { newState: GameState, vectorUpdates: VectorUpdate[] } {
    if (!params.name || !params.state) return { newState: currentState, vectorUpdates: [] };

    const sanitizedName = sanitizeEntityName(params.name);
    const npcNameLower = sanitizedName.toLowerCase();
    
    const updatedNpcs = (currentState.encounteredNPCs || []).map(npc => {
        if (npc.name.toLowerCase() === npcNameLower) {
            return {
                ...npc,
                emotionalState: {
                    current: params.state,
                    value: Number(params.value) || 50
                }
            };
        }
        return npc;
    });

    return { newState: { ...currentState, encounteredNPCs: updatedNpcs }, vectorUpdates: [] };
}
