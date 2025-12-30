import { KnowledgeBase, GameMessage, PlayerStats } from '../types';
import { SUB_REALM_NAMES, VIETNAMESE } from '../constants';

// Helper function to calculate base stats based on realm
export const calculateRealmBaseStats = (realm: string, progressionList: string[], currentBaseStats?: Partial<PlayerStats>): Partial<PlayerStats> => {
    // This is a placeholder logic. Real logic should depend on world settings or predefined tables.
    
    if (!realm || realm === VIETNAMESE.mortalRealmName) {
        return {
            maxSinhLuc: 100, // Giá trị mặc định cho phàm nhân
            maxLinhLuc: 0,
            sucTanCong: 10,
            sucPhongNhu: 5,
            thanPhap: 10,
            maxKinhNghiem: 100,
            // Các chỉ số khác sẽ giữ nguyên nếu không được tính
            ...currentBaseStats,
        };
    }

    const mainRealm = progressionList.find(r => realm.startsWith(r));
    const mainIndex = mainRealm ? progressionList.indexOf(mainRealm) : 0;
    
    const subRealmStr = mainRealm ? realm.substring(mainRealm.length).trim() : '';
    const subIndex = SUB_REALM_NAMES.indexOf(subRealmStr) !== -1 ? SUB_REALM_NAMES.indexOf(subRealmStr) : 0;

    // Updated Formula: 3.5^mainIndex * (1 + subIndex * 0.3)
    const multiplier = Math.pow(3.5, mainIndex) * (1 + subIndex * 0.3);

    return {
        maxSinhLuc: Math.floor(100 * multiplier),
        maxLinhLuc: Math.floor(50 * multiplier),
        sucTanCong: Math.floor(10 * multiplier),
        sucPhongNhu: Math.floor(5 * multiplier),
        thanPhap: Math.floor(10 * multiplier),
        maxKinhNghiem: Math.floor(1000 * multiplier), // EXP needed for next level
    };
};

export const calculateEffectiveStats = (stats: PlayerStats, equipment: any[], inventory: any[]): PlayerStats => {
    // Placeholder for equipment stats calculation
    return stats; 
};

export const handleLevelUps = (currentKb: KnowledgeBase): { updatedKb: KnowledgeBase; systemMessages: GameMessage[] } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const systemMessages: GameMessage[] = [];
    const turnNumber = newKb.playerStats.turn;

    // Check if cultivation is enabled (using enableStatsSystem as proxy if isCultivationEnabled missing)
    if (!newKb.worldConfig.enableStatsSystem) {
        return { updatedKb: newKb, systemMessages };
    }

    const playerRace = newKb.worldConfig?.playerRace || 'Nhân Tộc';
    const playerRealmSystem = newKb.worldConfig?.raceCultivationSystems?.find(s => s.raceName === playerRace)?.realmSystem 
                              || 'Luyện Khí - Trúc Cơ - Kim Đan - Nguyên Anh - Hóa Thần'; // Default fallback
    const realmProgressionList = playerRealmSystem.split(' - ').map(s => s.trim()).filter(Boolean);
    
    // Ensure lists exist in KB if missing
    newKb.realmProgressionList = realmProgressionList;

    let hasLeveledUpInLoop = true;
    while (hasLeveledUpInLoop) {
        hasLeveledUpInLoop = false;

        // Fallback for maxKinhNghiem if missing
        if (!newKb.playerStats.maxKinhNghiem) newKb.playerStats.maxKinhNghiem = 1000;
        if (!newKb.playerStats.kinhNghiem) newKb.playerStats.kinhNghiem = 0;

        if (newKb.playerStats.kinhNghiem < newKb.playerStats.maxKinhNghiem) {
            break;
        }

        const realmBefore = newKb.playerStats.realm || VIETNAMESE.mortalRealmName;
        
        // Find current realm index
        let currentMainRealmName = realmProgressionList.find(r => realmBefore.startsWith(r));
        if (!currentMainRealmName) currentMainRealmName = realmProgressionList[0];
        
        let currentMainRealmIndex = realmProgressionList.indexOf(currentMainRealmName);
        let currentSubRealmIndex = -1;
        
        const subRealmStr = realmBefore.substring(currentMainRealmName.length).trim();
        if (subRealmStr) {
            currentSubRealmIndex = SUB_REALM_NAMES.indexOf(subRealmStr);
        }

        const isAtPeakSubRealm = currentSubRealmIndex === SUB_REALM_NAMES.length - 1;

        if (isAtPeakSubRealm) {
            // Hit Bottleneck (Bình Cảnh) - Requires Breakthrough
            // Only stop if NOT already in bottleneck
            if (!newKb.playerStats.hieuUngBinhCanh) {
                newKb.playerStats.hieuUngBinhCanh = true;
                newKb.playerStats.kinhNghiem = newKb.playerStats.maxKinhNghiem; // Cap EXP
                systemMessages.push({
                    id: 'binh-canh-applied-client-' + Date.now(), type: 'system',
                    content: `Bạn đã đạt đến ${currentMainRealmName} ${SUB_REALM_NAMES[SUB_REALM_NAMES.length - 1]}! ${VIETNAMESE.bottleneckNotification}`,
                    timestamp: Date.now(), turnNumber: turnNumber
                });
            }
            break; // Stop leveling
        } else {
            // Normal Level Up (Sub-realm) within same Main Realm
            newKb.playerStats.kinhNghiem -= newKb.playerStats.maxKinhNghiem;
            
            // Advance Sub Realm
            const nextSubRealmIndex = currentSubRealmIndex + 1;
            const nextRealmString = `${currentMainRealmName} ${SUB_REALM_NAMES[nextSubRealmIndex]}`;
            newKb.playerStats.realm = nextRealmString;
            
            // Recalculate stats for new realm
            const newBaseStats = calculateRealmBaseStats(newKb.playerStats.realm, realmProgressionList, newKb.currentRealmBaseStats);
            newKb.playerStats = { ...newKb.playerStats, ...newBaseStats };

            // Apply equipment bonuses (Simplified)
            newKb.playerStats = calculateEffectiveStats(newKb.playerStats, newKb.inventory, newKb.inventory);

            // Restore HP/MP on level up
            newKb.playerStats.sinhLuc = newKb.playerStats.maxSinhLuc;
            newKb.playerStats.linhLuc = newKb.playerStats.maxLinhLuc;

            systemMessages.push({
                id: `sublevel-up-${Date.now()}`, type: 'system',
                content: `Chúc mừng ${newKb.character.name || 'bạn'} đã đột phá tiểu cảnh giới, từ ${realmBefore} lên ${newKb.playerStats.realm}!`,
                timestamp: Date.now(), turnNumber: turnNumber
            });
            hasLeveledUpInLoop = true; // Check if enough exp for another level
        }
    }

    return { updatedKb: newKb, systemMessages };
};
