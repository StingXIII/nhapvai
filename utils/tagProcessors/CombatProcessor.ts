
// utils/tagProcessors/CombatProcessor.ts
import { GameState, VectorUpdate } from '../../types';

/**
 * Xử lý logic khi AI kích hoạt một trận chiến.
 * Hàm này thiết lập trạng thái `pendingCombat`, cho phép UI hiển thị màn hình xác nhận
 * trước khi chính thức bước vào giao diện chiến đấu.
 * @param currentState - Trạng thái game hiện tại.
 * @param params - Các tham số từ thẻ [BEGIN_COMBAT], bao gồm opponentIds và location.
 * @returns Một đối tượng chứa trạng thái game mới và các yêu cầu cập nhật vector.
 */
export function processBeginCombat(currentState: GameState, params: any): { newState: GameState, vectorUpdates: VectorUpdate[] } {
    // GUARD CLAUSE: Bỏ qua nếu đang ở chế độ chiến đấu tường thuật
    if (currentState.worldConfig.combatMode === 'narrative') {
        console.warn('[Combat Processor] Đã bỏ qua thẻ [BEGIN_COMBAT] vì chế độ Chiến đấu Tường thuật đang được bật.');
        return { newState: currentState, vectorUpdates: [] };
    }

    if (!params.opponentIds) {
        console.warn('Bỏ qua thẻ [BEGIN_COMBAT] không hợp lệ (thiếu opponentIds):', params);
        return { newState: currentState, vectorUpdates: [] };
    }

    const opponentIds: string[] = typeof params.opponentIds === 'string'
        ? params.opponentIds.split(',').map((id: string) => id.trim()).filter(Boolean)
        : [];
    
    if (opponentIds.length === 0) {
         console.warn('Bỏ qua thẻ [BEGIN_COMBAT] không có đối thủ hợp lệ:', params);
        return { newState: currentState, vectorUpdates: [] };
    }
    
    const location = params.location || currentState.currentLocationId || 'Không rõ';

    const newState = { ...currentState };
    
    // Thiết lập trạng thái chờ chiến đấu để UI có thể hiển thị bảng thông báo.
    newState.pendingCombat = {
        opponentIds: opponentIds,
        location: location,
    };
    
    // Cập nhật trạng thái của người chơi để báo hiệu đang trong tình trạng chiến đấu
    // và reset các chỉ số liên quan đến combat.
    // LƯU Ý: `isInCombat` sẽ được UI đặt thành `true` sau khi người chơi xác nhận.
    newState.playerStats = {
        ...newState.playerStats,
        blackFlashCombo: 0, // Reset Black Flash combo khi bắt đầu trận mới
    };

    return {
        newState,
        vectorUpdates: [], // Không cần cập nhật vector cho hành động này
    };
}
