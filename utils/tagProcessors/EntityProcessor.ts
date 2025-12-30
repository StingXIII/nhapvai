
// utils/tagProcessors/EntityProcessor.ts
import { GameState, EncounteredFaction, InitialEntity, VectorUpdate } from '../../types';
import { mergeAndDeduplicateByName } from '../arrayUtils';
import { sanitizeEntityName } from '../textProcessing';

/**
 * Xử lý logic thêm hoặc cập nhật một phe phái/thế lực.
 * @param currentState - Trạng thái game hiện tại.
 * @param params - Các tham số từ thẻ [FACTION_UPDATE].
 * @returns Một đối tượng chứa trạng thái game mới và các yêu cầu cập nhật vector.
 */
export function processFactionUpdate(currentState: GameState, params: any): { newState: GameState, vectorUpdates: VectorUpdate[] } {
    if (!params.name) {
        console.warn('Bỏ qua thẻ [FACTION_UPDATE] không hợp lệ:', params);
        return { newState: currentState, vectorUpdates: [] };
    }

    const sanitizedName = sanitizeEntityName(params.name);

    const newFaction: EncounteredFaction = {
        name: sanitizedName,
        description: params.description || '',
        tags: params.tags ? (typeof params.tags === 'string' ? params.tags.split(',').map((t: string) => t.trim()) : params.tags) : [],
        customCategory: params.category, // Capture category
    };

    const updatedFactions = mergeAndDeduplicateByName(currentState.encounteredFactions || [], [newFaction]);

    const vectorContent = `Thế lực: ${newFaction.name}\nMô tả: ${newFaction.description}\nPhân loại: ${newFaction.customCategory || 'Chưa rõ'}`;
    const vectorUpdate: VectorUpdate = {
        id: newFaction.name,
        type: 'Faction',
        content: vectorContent,
    };

    return {
        newState: {
            ...currentState,
            encounteredFactions: updatedFactions,
        },
        vectorUpdates: [vectorUpdate],
    };
}

/**
 * Xử lý logic khám phá một địa điểm hoặc một mẩu lore mới.
 * @param currentState - Trạng thái game hiện tại.
 * @param params - Các tham số từ thẻ [LOCATION_DISCOVERED] hoặc [LORE_DISCOVERED].
 * @param type - Loại thực thể được khám phá ('Địa điểm' hoặc 'Hệ thống sức mạnh / Lore').
 * @returns Một đối tượng chứa trạng thái game mới và các yêu cầu cập nhật vector.
 */
export function processEntityDiscovered(currentState: GameState, params: any, type: 'Địa điểm' | 'Hệ thống sức mạnh / Lore'): { newState: GameState, vectorUpdates: VectorUpdate[] } {
    if (!params.name) {
        console.warn(`Bỏ qua thẻ [${type === 'Địa điểm' ? 'LOCATION_DISCOVERED' : 'LORE_DISCOVERED'}] không hợp lệ:`, params);
        return { newState: currentState, vectorUpdates: [] };
    }

    const sanitizedName = sanitizeEntityName(params.name);

    const newEntity: InitialEntity = {
        name: sanitizedName,
        type: type,
        description: params.description || '',
        personality: params.personality || '', // Mặc dù không phổ biến, vẫn hỗ trợ
        tags: params.tags ? (typeof params.tags === 'string' ? params.tags.split(',').map((t: string) => t.trim()) : params.tags) : [],
        customCategory: params.category, // Capture category
        // Tự động gán vị trí hiện tại của người chơi cho thực thể này khi nó được khám phá.
        // Điều này hữu ích để biết lore này được tìm thấy ở đâu.
        locationId: currentState.currentLocationId,
    };

    const updatedEntities = mergeAndDeduplicateByName(currentState.discoveredEntities || [], [newEntity]);

    const vectorContent = `${type}: ${newEntity.name}\nMô tả: ${newEntity.description}\nPhân loại: ${newEntity.customCategory || 'Chưa rõ'}`;
    const vectorUpdate: VectorUpdate = {
        id: newEntity.name,
        type: type,
        content: vectorContent,
    };
    
    // Tạo một bản sao của trạng thái để sửa đổi
    const newState = {
        ...currentState,
        discoveredEntities: updatedEntities,
    };

    // Nếu thực thể được khám phá là một địa điểm mới, cập nhật vị trí hiện tại của người chơi
    if (type === 'Địa điểm') {
        newState.currentLocationId = sanitizedName;
    }

    return {
        newState,
        vectorUpdates: [vectorUpdate],
    };
}

/**
 * Xử lý logic định nghĩa một thực thể mới (từ cơ chế Hybrid Entity Lookup).
 * @param currentState
 * @param params 
 */
export function processEntityDefinition(currentState: GameState, params: any): { newState: GameState, vectorUpdates: VectorUpdate[] } {
    if (!params.name) {
        return { newState: currentState, vectorUpdates: [] };
    }

    const sanitizedName = sanitizeEntityName(params.name);
    // Determine the type, fallback to 'Hệ thống sức mạnh / Lore' if invalid or missing
    let type: any = params.type;
    const validTypes = ['NPC', 'Vật phẩm', 'Địa điểm', 'Phe phái/Thế lực', 'Hệ thống sức mạnh / Lore'];
    if (!validTypes.includes(type)) {
        type = 'Hệ thống sức mạnh / Lore';
    }

    const newEntity: InitialEntity = {
        name: sanitizedName,
        type: type,
        description: params.description || 'Không có mô tả chi tiết.',
        customCategory: params.category || params.customCategory,
        tags: params.tags ? (typeof params.tags === 'string' ? params.tags.split(',').map((t: string) => t.trim()) : params.tags) : [],
    };

    const updatedEntities = mergeAndDeduplicateByName(currentState.discoveredEntities || [], [newEntity]);

    const vectorContent = `${newEntity.type}: ${newEntity.name}\nMô tả: ${newEntity.description}\nPhân loại: ${newEntity.customCategory || 'Chưa rõ'}`;
    const vectorUpdate: VectorUpdate = {
        id: newEntity.name,
        type: 'EntityDefinition',
        content: vectorContent,
    };

    // Cũng xóa tên thực thể khỏi pendingEntityLookups vì nó đã được định nghĩa
    const pendingLookups = (currentState.pendingEntityLookups || []).filter(item => item.name !== sanitizedName && item.name !== params.name);

    return {
        newState: {
            ...currentState,
            discoveredEntities: updatedEntities,
            pendingEntityLookups: pendingLookups
        },
        vectorUpdates: [vectorUpdate],
    };
}
