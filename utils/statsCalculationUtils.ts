// utils/statsCalculationUtils.ts

import { PlayerStats, RealmBaseStatDefinition, Item, EquipmentSlotId, StatusEffect, GameMessage, KnowledgeBase, Slave, Prisoner } from '../types';
import { 
    DEFAULT_PLAYER_STATS, 
    SUB_REALM_NAMES, 
    DEFAULT_MORTAL_STATS,
    PROFICIENCY_DMG_HEAL_MULTIPLIERS,
    PROFICIENCY_COST_COOLDOWN_MULTIPLIERS,
    TU_CHAT_VALUE_MULTIPLIERS,
    NPC_ARCHETYPES,
} from '../constants/character';
import { 
    MORTAL_REALM_BASE_VALUE,
    FIRST_CULTIVATION_REALM_BASE_VALUE,
    REALM_MULTIPLIER_BASE,
    REALM_MULTIPLIER_DECAY,
    REALM_MULTIPLIER_MIN,
    STAT_POINT_VALUES,
    RARITY_MULTIPLIERS,
    CATEGORY_MULTIPLIERS,
    SPECIAL_EFFECT_KEYWORDS,
    UNKNOWN_EFFECT_MULTIPLIER,
    AUCTION_NPC_CURRENCY_BY_REALM_TIER,
    SPIRIT_STONE_PRICES,
} from '../constants/economy';
import { parseRealmString } from './textProcessing';

// Mocking VIETNAMESE constant for logic
const VIETNAMESE = {
    mortalRealmName: "Người Thường",
    noCultivationSystem: "Không có hệ thống tu luyện",
    bottleneckNotification: "Bình cảnh!"
};

// Mocking normalization function if you don't have it
const normalizeStringForComparison = (str: string): string => {
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

// Calculates base stats (maxHP, maxMP, baseATK, maxEXP) based on realm.
export const calculateRealmBaseStats = (
    realmString: string,
    mainRealmList: string[],
    minorRealmList: string[] = SUB_REALM_NAMES
): Pick<PlayerStats, 'baseMaxSinhLuc' | 'baseMaxLinhLuc' | 'baseSucTanCong' | 'baseMaxKinhNghiem' | 'baseTocDo'> => {
    
    if (typeof realmString !== 'string' || !realmString) {
        realmString = DEFAULT_PLAYER_STATS.realm!;
    }
    
    const normalizedRealmString = realmString.toLowerCase().trim();
    const mortalNames = [VIETNAMESE.mortalRealmName.toLowerCase(), DEFAULT_MORTAL_STATS.realm!.toLowerCase(), VIETNAMESE.noCultivationSystem.toLowerCase()];

    if (mortalNames.includes(normalizedRealmString)) {
        return {
            baseMaxSinhLuc: DEFAULT_MORTAL_STATS.baseMaxSinhLuc!,
            baseMaxLinhLuc: DEFAULT_MORTAL_STATS.baseMaxLinhLuc!,
            baseSucTanCong: DEFAULT_MORTAL_STATS.baseSucTanCong!,
            baseMaxKinhNghiem: DEFAULT_MORTAL_STATS.baseMaxKinhNghiem!,
            baseTocDo: DEFAULT_MORTAL_STATS.tocDo!,
        };
    }
    
    // --- PARSING REALM STRING ---
    let mainRealmName = "";
    let subRealmName = "";
    const sortedMainRealmList = [...mainRealmList].sort((a,b) => b.length - a.length);

    for (const potentialMainRealm of sortedMainRealmList) {
        if (realmString.startsWith(potentialMainRealm)) {
            mainRealmName = potentialMainRealm;
            const remainingPart = realmString.substring(potentialMainRealm.length).trim();
            if (remainingPart === '') {
                subRealmName = minorRealmList.length > 0 ? minorRealmList[0] : ""; // Default to first sub-realm if only main realm is given
            } else {
                 const sortedSubRealms = [...minorRealmList].sort((a, b) => b.length - a.length);
                 subRealmName = sortedSubRealms.find(sr => remainingPart === sr) || remainingPart;
            }
            break;
        }
    }

    if (!mainRealmName) {
        return { ...DEFAULT_MORTAL_STATS };
    }

    const mainRealmIndex = mainRealmList.indexOf(mainRealmName);
    const subRealmIndex = Math.max(0, minorRealmList.indexOf(subRealmName));

    // --- EXPONENTIAL CALCULATION ---
    let majorRealmBaseValue = FIRST_CULTIVATION_REALM_BASE_VALUE;
    if (mainRealmIndex > 0) {
        for (let i = 1; i <= mainRealmIndex; i++) {
            const multiplier = Math.max(REALM_MULTIPLIER_MIN, REALM_MULTIPLIER_BASE - (REALM_MULTIPLIER_DECAY * (i - 1)));
            majorRealmBaseValue *= multiplier;
        }
    }
    
    // --- LINEAR INCREMENT FOR SUB-REALM ---
    const subRealmIncrement = majorRealmBaseValue / (minorRealmList.length > 0 ? minorRealmList.length : 1);
    const finalRealmValue = majorRealmBaseValue + (subRealmIndex * subRealmIncrement);
    
    // --- DERIVE STATS FROM FINAL VALUE ---
    // Ratios based on Luyện Khí: HP 100, MP 50, ATK 10, EXP 1000, SPD 10 -> 1 : 0.5 : 0.1 : 10 : 0.1
    const calculatedStats = {
        baseMaxSinhLuc: Math.round(finalRealmValue),
        baseMaxLinhLuc: Math.round(finalRealmValue * 0.5),
        baseSucTanCong: Math.round(finalRealmValue * 0.1),
        baseMaxKinhNghiem: Math.round(finalRealmValue * 10),
        baseTocDo: Math.round(finalRealmValue * 0.1),
    };

    return {
        baseMaxKinhNghiem: Math.max(10, calculatedStats.baseMaxKinhNghiem),
        baseMaxSinhLuc: Math.max(10, calculatedStats.baseMaxSinhLuc),
        baseMaxLinhLuc: Math.max(0, calculatedStats.baseMaxLinhLuc),
        baseSucTanCong: Math.max(1, calculatedStats.baseSucTanCong),
        baseTocDo: Math.max(1, calculatedStats.baseTocDo),
    };
};

export const calculateEffectiveStats = (
    currentStats: PlayerStats, 
    equippedItemIds: Record<EquipmentSlotId, Item['id'] | null>,
    inventory: Item[]
): PlayerStats => {
    const effectiveStats: PlayerStats = {
        ...currentStats, 
        maxSinhLuc: currentStats.baseMaxSinhLuc || currentStats.maxSinhLuc,
        maxLinhLuc: currentStats.baseMaxLinhLuc || currentStats.maxLinhLuc,
        sucTanCong: currentStats.baseSucTanCong || currentStats.sucTanCong,
        maxKinhNghiem: currentStats.baseMaxKinhNghiem || currentStats.maxKinhNghiem,
        tocDo: currentStats.baseTocDo || currentStats.tocDo,
        thoNguyen: currentStats.thoNguyen,
        maxThoNguyen: currentStats.maxThoNguyen,
    };

    if (equippedItemIds) {
        for (const slotId in equippedItemIds) {
            const itemId = equippedItemIds[slotId as EquipmentSlotId];
            if (itemId) {
                const equippedItem = inventory.find(item => item.id === itemId);
                if (equippedItem && equippedItem.category === "Equipment") { // Hardcoded "Equipment" string to avoid GameTemplates dependency
                    const equipment = equippedItem.equipmentDetails; // Access equipmentDetails directly
                    if (equipment && equipment.statBonuses) { 
                        for (const statKey in equipment.statBonuses) {
                            const key = statKey as keyof typeof equipment.statBonuses; 
                            const bonusValue = equipment.statBonuses[key];
                            if (typeof bonusValue === 'number') {
                                if (key === 'maxSinhLuc') effectiveStats.maxSinhLuc += bonusValue;
                                else if (key === 'maxLinhLuc') effectiveStats.maxLinhLuc! += bonusValue;
                                else if (key === 'sucTanCong') effectiveStats.sucTanCong += bonusValue;
                                else if (key === 'tocDo') effectiveStats.tocDo += bonusValue;
                                else if (key === 'maxKinhNghiem') effectiveStats.maxKinhNghiem += bonusValue;
                                else if (key === 'thoNguyen') effectiveStats.thoNguyen = (effectiveStats.thoNguyen || 0) + bonusValue;
                                else if (key === 'maxThoNguyen') effectiveStats.maxThoNguyen = (effectiveStats.maxThoNguyen || 0) + bonusValue;
                            }
                        }
                    }
                }
            }
        }
    }

    if (currentStats.activeStatusEffects && currentStats.activeStatusEffects.length > 0) {
        currentStats.activeStatusEffects.forEach(effect => {
            if (effect.statModifiers) {
                for (const statKey in effect.statModifiers) {
                    const key = statKey as keyof PlayerStats;
                    const modValue = effect.statModifiers[key as keyof typeof effect.statModifiers];

                    if (typeof modValue === 'string') {
                        if (modValue.endsWith('%')) {
                            const percentage = parseFloat(modValue.slice(0, -1)) / 100;
                            if (!isNaN(percentage) && typeof effectiveStats[key] === 'number') {
                                (effectiveStats[key] as number) *= (1 + percentage);
                            }
                        } else {
                            const flatChange = parseInt(modValue, 10);
                            if (!isNaN(flatChange) && typeof effectiveStats[key] === 'number') {
                            (effectiveStats[key] as number) += flatChange;
                            }
                        }
                    } else if (typeof modValue === 'number') {
                        if (typeof effectiveStats[key] === 'number') {
                            (effectiveStats[key] as number) += modValue;
                        }
                    }
                }
            }
        });
    }
    
    effectiveStats.maxSinhLuc = Math.round(effectiveStats.maxSinhLuc);
    effectiveStats.maxLinhLuc = Math.round(effectiveStats.maxLinhLuc || 0);
    effectiveStats.sucTanCong = Math.round(effectiveStats.sucTanCong);
    effectiveStats.tocDo = Math.round(effectiveStats.tocDo);
    effectiveStats.maxKinhNghiem = Math.round(effectiveStats.maxKinhNghiem);
    effectiveStats.thoNguyen = Math.round(effectiveStats.thoNguyen || 0);
    effectiveStats.maxThoNguyen = Math.round(effectiveStats.maxThoNguyen || 0);


    effectiveStats.sinhLuc = Math.max(0, Math.min(effectiveStats.sinhLuc, effectiveStats.maxSinhLuc));
    effectiveStats.linhLuc = Math.max(0, Math.min(effectiveStats.linhLuc || 0, effectiveStats.maxLinhLuc || 0));
    effectiveStats.kinhNghiem = Math.max(0, effectiveStats.kinhNghiem); 
    effectiveStats.thoNguyen = Math.max(0, Math.min(effectiveStats.thoNguyen || 0, effectiveStats.maxThoNguyen || 0));
    
    effectiveStats.maxSinhLuc = Math.max(10, effectiveStats.maxSinhLuc);
    effectiveStats.maxLinhLuc = Math.max(0, effectiveStats.maxLinhLuc || 0); 
    effectiveStats.sucTanCong = Math.max(1, effectiveStats.sucTanCong);
    effectiveStats.tocDo = Math.max(1, effectiveStats.tocDo);
    effectiveStats.maxKinhNghiem = Math.max(10, effectiveStats.maxKinhNghiem);

    return effectiveStats;
};

// New function to handle all level-up logic
export const handleLevelUps = (currentKb: any): { updatedKb: any; systemMessages: GameMessage[] } => {
    const newKb = JSON.parse(JSON.stringify(currentKb));
    const systemMessages: GameMessage[] = [];
    const turnNumber = newKb.playerStats.turn;

    if (!newKb.worldConfig?.enableStatsSystem) { 
        return { updatedKb: newKb, systemMessages };
    }

    // Lấy cấu hình hệ thống tu luyện
    let majorRealms: string[] = [];
    let minorRealms: string[] = [];

    // Ưu tiên sử dụng hệ thống tùy chỉnh mới
    if (newKb.worldConfig?.cultivationSystem) {
        majorRealms = parseRealmString(newKb.worldConfig.cultivationSystem.majorRealms);
        minorRealms = parseRealmString(newKb.worldConfig.cultivationSystem.minorRealms);
    } 
    // Fallback sang hệ thống cũ (raceCultivationSystems hoặc default)
    else {
        const playerRace = newKb.worldConfig.playerRace || 'Nhân Tộc';
        const playerRealmSystem = newKb.worldConfig.raceCultivationSystems?.find((s: any) => s.raceName === playerRace)?.realmSystem 
                                  || 'Luyện Khí - Trúc Cơ - Kim Đan - Nguyên Anh - Hóa Thần'; 
        majorRealms = playerRealmSystem.split(' - ').map((s: string) => s.trim()).filter(Boolean);
        minorRealms = SUB_REALM_NAMES; // Sử dụng hằng số mặc định nếu không có config mới
    }

    // Đảm bảo danh sách không rỗng để tránh lỗi
    if (majorRealms.length === 0) majorRealms = ['Phàm Nhân'];
    if (minorRealms.length === 0) minorRealms = ['Sơ Kỳ'];


    let hasLeveledUpInLoop = true;
    while (hasLeveledUpInLoop) {
        hasLeveledUpInLoop = false;

        if (newKb.playerStats.kinhNghiem < newKb.playerStats.maxKinhNghiem) {
            break;
        }

        const realmBefore = newKb.playerStats.realm;
        
        let currentMainRealmName = "";
        let currentSubRealmName = "";

        const sortedMainRealms = [...majorRealms].sort((a: string, b: string) => b.length - a.length);
        for (const r of sortedMainRealms) {
            if (realmBefore.startsWith(r)) {
                currentMainRealmName = r;
                currentSubRealmName = realmBefore.substring(r.length).trim();
                break;
            }
        }

        if (!currentMainRealmName) {
             currentMainRealmName = majorRealms[0];
        }

        // Tìm index của tiểu cảnh giới trong danh sách động
        let currentSubRealmIndex = minorRealms.indexOf(currentSubRealmName);
        if (currentSubRealmIndex === -1) currentSubRealmIndex = 0;

        const isAtPeakSubRealm = currentSubRealmIndex === minorRealms.length - 1;

        if (isAtPeakSubRealm) {
            if (!newKb.playerStats.hieuUngBinhCanh) {
                newKb.playerStats.hieuUngBinhCanh = true;
                newKb.playerStats.kinhNghiem = newKb.playerStats.maxKinhNghiem;
                systemMessages.push({
                    id: 'binh-canh-applied-client-' + Date.now(), type: 'system',
                    content: `Bạn đã đạt đến đỉnh phong của ${currentMainRealmName}! ${VIETNAMESE.bottleneckNotification}`,
                    timestamp: Date.now(), turnNumber: turnNumber
                });
            }
            break;
        } else {
            newKb.playerStats.kinhNghiem -= newKb.playerStats.maxKinhNghiem;
            const nextRealmString = `${currentMainRealmName} ${minorRealms[currentSubRealmIndex + 1]}`;
            newKb.playerStats.realm = nextRealmString;
            
            // Truyền danh sách động vào hàm tính toán
            const newBaseStats = calculateRealmBaseStats(newKb.playerStats.realm, majorRealms, minorRealms);
            newKb.playerStats = { ...newKb.playerStats, ...newBaseStats };

            newKb.playerStats = calculateEffectiveStats(newKb.playerStats, newKb.equippedItems, newKb.inventory);

            newKb.playerStats.sinhLuc = newKb.playerStats.maxSinhLuc;
            newKb.playerStats.linhLuc = newKb.playerStats.maxLinhLuc;

            systemMessages.push({
                id: `sublevel-up-${Date.now()}`, type: 'system',
                content: `Chúc mừng ${newKb.worldConfig?.character?.name || 'bạn'} đã đột phá tiểu cảnh giới, từ ${realmBefore} lên ${newKb.playerStats.realm}!`,
                timestamp: Date.now(), turnNumber: turnNumber
            });
            hasLeveledUpInLoop = true;
        }
    }

    newKb.playerStats = calculateEffectiveStats(newKb.playerStats, newKb.equippedItems, newKb.inventory);
    return { updatedKb: newKb, systemMessages };
};

const calculateRealmValueByIndex = (realmIndex: number): number => {
    if (realmIndex < 0) {
        return MORTAL_REALM_BASE_VALUE;
    }
    if (realmIndex === 0) {
        return FIRST_CULTIVATION_REALM_BASE_VALUE;
    }

    let value = FIRST_CULTIVATION_REALM_BASE_VALUE;
    // Loop from the second realm (index 1) up to the target realm index
    for (let i = 1; i <= realmIndex; i++) {
        const multiplier = Math.max(REALM_MULTIPLIER_MIN, REALM_MULTIPLIER_BASE - (REALM_MULTIPLIER_DECAY * (i - 1)));
        value *= multiplier;
    }
    
    return Math.floor(value);
};

export const calculateItemValue = (item: Item, realmProgressionList: string[]): number => {
    const normalizedItemName = item.name.trim();
    if (SPIRIT_STONE_PRICES[normalizedItemName]) {
        return SPIRIT_STONE_PRICES[normalizedItemName];
    }

    let baseValue = 0;

    if (item.itemRealm) {
        const realmIndex = realmProgressionList.findIndex(r => item.itemRealm!.startsWith(r.split('(')[0].trim()));
        baseValue = calculateRealmValueByIndex(realmIndex);
    } else {
        baseValue = 10;
    }

    let statValue = 0;
    if (item.category === "Equipment") { // Hardcoded string
        const equipment = item.equipmentDetails;
        if (equipment && equipment.statBonuses) {
            for (const [stat, bonus] of Object.entries(equipment.statBonuses)) {
                if (STAT_POINT_VALUES[stat] && typeof bonus === 'number') {
                    statValue += STAT_POINT_VALUES[stat] * bonus;
                }
            }
        }
    }
    
    let valueBeforeMultipliers = baseValue + statValue;

    const rarityMultiplier = RARITY_MULTIPLIERS[item.rarity || 'Phổ Thông'] || 1.0;
    let finalValue = valueBeforeMultipliers * rarityMultiplier;

    const categoryMultiplier = CATEGORY_MULTIPLIERS[item.category || 'Material'] || 1.0;
    finalValue *= categoryMultiplier;
    
    if (item.category === "Equipment") {
        let totalEffectMultiplier = 0;
        const equipment = item.equipmentDetails;
        if (equipment && equipment.uniqueEffects && equipment.uniqueEffects.length > 0) {
            for (const effectString of equipment.uniqueEffects) {
                if (effectString.toLowerCase().trim() === 'không có gì đặc biệt') {
                    continue; 
                }
                
                let effectApplied = false;
                const normalizedEffectString = normalizeStringForComparison(effectString);

                for (const [keyword, effectData] of Object.entries(SPECIAL_EFFECT_KEYWORDS)) {
                    if (normalizedEffectString.includes(normalizeStringForComparison(keyword))) {
                        const numberMatch = effectString.match(/(\d+(\.\d+)?)/);
                        const numericValue = numberMatch ? parseFloat(numberMatch[0]) : 1;
                        
                        totalEffectMultiplier += effectData.baseMultiplier * numericValue;
                        effectApplied = true;
                        break; 
                    }
                }
                if (!effectApplied) {
                    totalEffectMultiplier += UNKNOWN_EFFECT_MULTIPLIER;
                }
            }
        }
        finalValue *= (1 + totalEffectMultiplier);
    }

    return Math.max(1, Math.round(finalValue)); 
};

export const calculateSlaveValue = (slave: Slave, realmProgressionList: string[]): number => {
    if (!slave.realm) return 500; 

    // 1. Find base value from realm tier
    const mainRealmName = realmProgressionList.find(r => slave.realm!.startsWith(r));
    const mainRealmIndex = mainRealmName ? realmProgressionList.indexOf(mainRealmName) : -1;
    let baseValue = mainRealmIndex > -1 ? (AUCTION_NPC_CURRENCY_BY_REALM_TIER[mainRealmIndex] || 500) : 500;

    // 2. Apply sub-realm modifier
    const subRealmName = slave.realm.replace(mainRealmName || '', '').trim();
    const subRealmIndex = SUB_REALM_NAMES.indexOf(subRealmName as any);
    if (subRealmIndex > -1) {
        const subRealmMultiplier = 1.0 + (0.5 + (0.05 * subRealmIndex));
        baseValue *= subRealmMultiplier;
    }

    // 3. Apply aptitude (Tu Chất) multiplier
    if (slave.tuChat) {
        const tuChatMultiplier = TU_CHAT_VALUE_MULTIPLIERS[slave.tuChat] || 1.0;
        baseValue *= tuChatMultiplier;
    }

    // 4. Apply bonus for special physique/root
    if (slave.specialPhysique && slave.specialPhysique !== 'Phàm Thể') {
        baseValue *= 1.25; 
    }
    if (slave.spiritualRoot && slave.spiritualRoot !== 'Phàm Căn') {
        baseValue *= 1.25; 
    }

    return Math.max(100, Math.round(baseValue)); 
};

export const calculatePrisonerValue = (prisoner: Prisoner, realmProgressionList: string[]): number => {
    if (!prisoner.realm) return 300; 

    // 1. Find base value from realm tier
    const mainRealmName = realmProgressionList.find(r => prisoner.realm!.startsWith(r));
    const mainRealmIndex = mainRealmName ? realmProgressionList.indexOf(mainRealmName) : -1;
    let baseValue = mainRealmIndex > -1 ? (AUCTION_NPC_CURRENCY_BY_REALM_TIER[mainRealmIndex] || 300) : 300;

    // 2. Apply sub-realm modifier
    const subRealmName = prisoner.realm.replace(mainRealmName || '', '').trim();
    const subRealmIndex = SUB_REALM_NAMES.indexOf(subRealmName as any);
    if (subRealmIndex > -1) {
        const subRealmMultiplier = 1.0 + (0.5 + (0.05 * subRealmIndex));
        baseValue *= subRealmMultiplier;
    }

    // 3. Apply aptitude (Tu Chất) multiplier
    if (prisoner.tuChat) {
        const tuChatMultiplier = TU_CHAT_VALUE_MULTIPLIERS[prisoner.tuChat] || 1.0;
        baseValue *= tuChatMultiplier;
    }

    // 4. Apply bonus for special physique/root
    if (prisoner.specialPhysique && prisoner.specialPhysique !== 'Phàm Thể') {
        baseValue *= 1.25;
    }
    if (prisoner.spiritualRoot && prisoner.spiritualRoot !== 'Phàm Căn') {
        baseValue *= 1.25;
    }

    // 5. Apply modifiers for prisoner state (willpower and resistance)
    const resistanceModifier = 1.0 - ((prisoner.resistance || 0) / 200); 
    const willpowerModifier = 0.8 + ((prisoner.willpower || 0) / 500);   
    baseValue *= resistanceModifier;
    baseValue *= willpowerModifier;

    return Math.max(50, Math.round(baseValue)); 
};

// New function to process adding core memories
export const processCoreMemoryAdd = (kb: KnowledgeBase, params: any, turnNumber: number): { updatedKb: KnowledgeBase, systemMessages: GameMessage[] } => {
    const newKb = JSON.parse(JSON.stringify(kb));
    
    // Assuming coreMemories exists on KB (it might be named differently in your app, e.g. memories)
    // Based on the provided types.ts, it seems 'memories' is a string array. 
    // If you have a structured coreMemories, adjust accordingly.
    // The previous context suggests `memories` is string[].
    
    if (params.text) {
        newKb.memories.push(params.text);
    }

    const systemMessages: GameMessage[] = [{
        id: `memory-added-${Date.now()}`,
        type: 'system',
        content: `Đã thêm ký ức cốt lõi mới.`,
        timestamp: Date.now(),
        turnNumber: turnNumber
    }];

    return { updatedKb: newKb, systemMessages };
}

export const generateMechanicalNpcStats = (
    playerStats: PlayerStats,
    targetRealm: string,
    majorRealms: string[],
    minorRealms: string[],
    archetypeKey?: string
): PlayerStats => {
    // 1. Get player's realm indices
    const playerRealm = playerStats.realm || majorRealms[0];
    let playerMainRealmIndex = majorRealms.findIndex(r => playerRealm.startsWith(r));
    if (playerMainRealmIndex === -1) playerMainRealmIndex = 0;
    
    const playerSubRealmStr = playerRealm.substring(majorRealms[playerMainRealmIndex].length).trim();
    let playerSubRealmIndex = minorRealms.indexOf(playerSubRealmStr);
    if (playerSubRealmIndex === -1) playerSubRealmIndex = 0;
    
    const playerTotalRealmLevel = playerMainRealmIndex * minorRealms.length + playerSubRealmIndex;

    // 2. Get target NPC's realm indices
    const npcRealm = targetRealm || playerRealm;
    let npcMainRealmIndex = majorRealms.findIndex(r => npcRealm.startsWith(r));
    if (npcMainRealmIndex === -1) npcMainRealmIndex = 0;

    const npcSubRealmStr = npcRealm.substring(majorRealms[npcMainRealmIndex].length).trim();
    let npcSubRealmIndex = minorRealms.indexOf(npcSubRealmStr);
    if (npcSubRealmIndex === -1) npcSubRealmIndex = 0;
    
    const npcTotalRealmLevel = npcMainRealmIndex * minorRealms.length + npcSubRealmIndex;

    // 3. Calculate Realm Scaling Multiplier
    const realmLevelDifference = npcTotalRealmLevel - playerTotalRealmLevel;
    // Each sub-realm difference is a 12.5% stat change.
    const realmMultiplier = 1 + (realmLevelDifference * 0.125);
    
    // 4. Select and Apply Archetype
    const selectedArchetypeKey = archetypeKey && NPC_ARCHETYPES[archetypeKey.toUpperCase()] ? archetypeKey.toUpperCase() : 'BALANCED';
    const archetype = NPC_ARCHETYPES[selectedArchetypeKey];

    // 5. Calculate final stats with variance
    const variance = () => 1 + (Math.random() * 0.1 - 0.05); // +/- 5%

    const npcMaxSinhLuc = Math.round(playerStats.maxSinhLuc * realmMultiplier * archetype.hp * variance());
    const npcMaxLinhLuc = Math.round((playerStats.maxLinhLuc || 0) * realmMultiplier * archetype.mp * variance());
    const npcSucTanCong = Math.round(playerStats.sucTanCong * realmMultiplier * archetype.atk * variance());
    const npcSucPhongNhu = Math.round(playerStats.sucPhongNhu * realmMultiplier * archetype.def * variance());
    const npcTocDo = Math.round(playerStats.tocDo * realmMultiplier * archetype.spd * variance());

    const npcStats: PlayerStats = {
        ...DEFAULT_PLAYER_STATS, // Start with a default base
        realm: npcRealm,
        maxSinhLuc: Math.max(10, npcMaxSinhLuc),
        sinhLuc: Math.max(10, npcMaxSinhLuc),
        maxLinhLuc: Math.max(0, npcMaxLinhLuc),
        linhLuc: Math.max(0, npcMaxLinhLuc),
        sucTanCong: Math.max(5, npcSucTanCong),
        sucPhongNhu: Math.max(1, npcSucPhongNhu),
        tocDo: Math.max(5, npcTocDo),
        kinhNghiem: 0, // NPCs don't need exp tracking for now
        maxKinhNghiem: 100,
        currency: 0,
        turn: 0,
    };
    
    return npcStats;
};
