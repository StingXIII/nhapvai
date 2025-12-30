
import { KnowledgeBase, GameMessage, NPC, Wife, Slave, PersonBase, Prisoner } from '../types';
import { TU_CHAT_TIERS, TU_CHAT_MULTIPLIERS, NPC_BASE_EXP_PERCENTAGE, NPC_BOTTLENECK_DURATION_TURNS, SUB_REALM_NAMES, VIETNAMESE } from '../constants';
import { calculateRealmBaseStats } from './statsCalculationUtils';

export const progressNpcCultivation = (currentKb: KnowledgeBase): { updatedKb: KnowledgeBase; systemMessages: GameMessage[] } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    
    // Check if stats system is enabled (proxy for cultivation)
    if (!newKb.worldConfig?.enableStatsSystem) {
        return { updatedKb: newKb, systemMessages: [] };
    }
    
    const allCharactersToProgress: (NPC | Wife | Slave | Prisoner)[] = [
        ...newKb.encounteredNPCs,
        ...newKb.wives,
        ...newKb.slaves,
        ...newKb.prisoners,
    ];
    
    const playerRace = newKb.worldConfig?.playerRace || 'Nhân Tộc';
    const playerRealmSystem = newKb.worldConfig?.raceCultivationSystems?.find(s => s.raceName === playerRace)?.realmSystem 
                              || 'Luyện Khí - Trúc Cơ - Kim Đan - Nguyên Anh - Hóa Thần';
    const realmProgressionList = playerRealmSystem.split(' - ').map(s => s.trim()).filter(Boolean);

    allCharactersToProgress.forEach(character => {
        if (!character.stats) {
            character.stats = {
                sinhLuc: 100,
                maxSinhLuc: 100,
                sucTanCong: 10,
                sucPhongNhu: 5,
                tocDo: 10,
                kinhNghiem: 0,
                maxKinhNghiem: 1000,
                currency: 0,
                turn: 0
            };
        }

        // Recovery Logic (for dying state)
        const charAsBase = character as any as PersonBase;
        if (charAsBase.recoveryTurns && charAsBase.recoveryTurns > 0) {
            charAsBase.recoveryTurns -= 1;
            if (charAsBase.recoveryTurns === 0) {
                charAsBase.isDying = false;
                if (character.stats.maxSinhLuc) {
                    character.stats.sinhLuc = Math.floor(character.stats.maxSinhLuc * 0.1);
                }
            }
            return; // Skip progression while recovering
        }

        if (!character.realm || character.realm === VIETNAMESE.mortalRealmName || !character.tuChat || charAsBase.isDying) {
            return; 
        }

        // Bottleneck Logic for NPCs
        if (character.isBinhCanh) {
            character.binhCanhCounter = (character.binhCanhCounter || 0) + 1;
            if (character.binhCanhCounter >= NPC_BOTTLENECK_DURATION_TURNS) {
                // Break through automatically after X turns
                character.isBinhCanh = false;
                character.binhCanhCounter = 0;
                // Force level up logic (simplified)
                const currentRealm = character.realm;
                const mainRealm = realmProgressionList.find(r => currentRealm.startsWith(r)) || realmProgressionList[0];
                const mainIndex = realmProgressionList.indexOf(mainRealm);
                if (mainIndex < realmProgressionList.length - 1) {
                    const nextMainRealm = realmProgressionList[mainIndex + 1];
                    character.realm = `${nextMainRealm} ${SUB_REALM_NAMES[0]}`;
                    character.stats = { ...character.stats, ...calculateRealmBaseStats(character.realm, realmProgressionList) };
                }
            }
            return; 
        }

        // EXP Gain Logic
        if (typeof character.stats.kinhNghiem !== 'number' || isNaN(character.stats.kinhNghiem)) {
            character.stats.kinhNghiem = 0;
        }
        
        const tuChat = character.tuChat || 'Bình Thường';
        const tuChatMultiplier = TU_CHAT_TIERS.includes(tuChat) ? TU_CHAT_MULTIPLIERS[tuChat] : 1.0;
        const maxExpForCurrentLevel = character.stats.maxKinhNghiem || 1000;
        
        // Calculate EXP gain based on aptitude (Tu Chất)
        const expGain = Math.round(NPC_BASE_EXP_PERCENTAGE * tuChatMultiplier * maxExpForCurrentLevel);
        character.stats.kinhNghiem += expGain;

        // Level Up Check
        while (character.stats.kinhNghiem >= (character.stats.maxKinhNghiem || Infinity)) {
             character.stats.kinhNghiem -= (character.stats.maxKinhNghiem || 1000);
             
             const currentRealm = character.realm;
             let mainRealm = realmProgressionList.find(r => currentRealm.startsWith(r));
             if (!mainRealm) { mainRealm = realmProgressionList[0]; }
             
             const subRealmStr = currentRealm.substring(mainRealm.length).trim();
             const subIndex = SUB_REALM_NAMES.indexOf(subRealmStr);
             
             if (subIndex < SUB_REALM_NAMES.length - 1) {
                 // Sub-level up
                 character.realm = `${mainRealm} ${SUB_REALM_NAMES[subIndex + 1]}`;
                 character.stats = { ...character.stats, ...calculateRealmBaseStats(character.realm, realmProgressionList) };
             } else {
                 // Hit bottleneck
                 character.isBinhCanh = true;
                 character.binhCanhCounter = 0;
                 break;
             }
        }
    });

    return { updatedKb: newKb, systemMessages: [] };
};
