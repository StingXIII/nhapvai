import React, { useCallback, useState } from 'react';
import { 
    KnowledgeBase, 
    GameMessage, 
    WorldSettings, 
    PlayerActionInputType, 
    ResponseLength, 
    GameScreen, 
    RealmBaseStatDefinition, 
    TurnHistoryEntry, 
    AuctionState, 
    Item as ItemType, 
    AuctionCommentaryEntry, 
    FindLocationParams, 
    Prisoner, 
    Wife, 
    Slave, 
    CombatEndPayload, 
    AuctionSlave, 
    NPC, 
    CombatDispositionMap, 
    CombatDisposition, 
    GameLocation, 
    Skill, 
    WorldLoreEntry, 
    YeuThu, 
    PlayerStats, 
    AuctionItem, 
    Combatant, 
    OfflineCombatSkill, 
    UIState, 
    AiChoice, 
    StartingSkill 
} from '../../types';
import { 
    countTokens, 
    getApiSettings as getGeminiApiSettings, 
    handleCompanionInteraction, 
    handlePrisonerInteraction, 
    summarizeCompanionInteraction, 
    summarizePrisonerInteraction, 
    generateNonCombatDefeatConsequence, 
    generateSlaveAuctionData, 
    runSlaveAuctionTurn, 
    runSlaveAuctioneerCall, 
    generateVictoryConsequence, 
    summarizeCombat, 
    generateDefeatConsequence, 
    generateCraftedItemViaAI, 
    findLocationWithAI, 
    generateNextTurn, 
    generateTravelEvent, 
    generateMemoryFromNarration, 
    judgeChallengeConsequences 
} from '../../services/geminiService';
import { useSetupActions } from './actions/useSetupActions';
import { useAuctionActions, useSlaveAuctionActions } from './actions/useAuctionActions';
import { useMainGameLoop } from './actions/useMainGameLoop';
import { useCultivationActions } from './actions/useCultivationActions';
import { 
    performTagProcessing, 
    addTurnHistoryEntryRaw, 
    calculatePrisonerValue, 
    calculateSlaveValue, 
    calculateRealmBaseStats, 
    calculateEffectiveStats, 
    processCoreMemoryAdd 
} from '../../utils/gameLogicUtils';
import { 
    VIETNAMESE, 
    INITIAL_KNOWLEDGE_BASE, 
    DEFAULT_WORLD_SETTINGS, 
    DEFAULT_PLAYER_STATS, 
    SUB_REALM_NAMES, 
    DEFAULT_TIERED_STATS 
} from '../../constants';
import * as GameTemplates from '../../templates';

const handleOfflineSkillLearning = (
    kb: KnowledgeBase,
    targetPerson: Prisoner | Wife | Slave,
    itemName: string
): { updatedKb: KnowledgeBase; systemMessage: GameMessage | null } | null => {
    const itemInInventory = kb.inventory.find(i => i.name === itemName);
    if (!itemInInventory || itemInInventory.category !== GameTemplates.ItemCategory.LINH_KI) return null;
    const skillSlip = itemInInventory as GameTemplates.LinhKiTemplate;
    if (!skillSlip.skillToLearnJSON) return null;
    let startingSkill: StartingSkill;
    try {
        startingSkill = JSON.parse(skillSlip.skillToLearnJSON);
    } catch (e) {
        return null;
    }
    const newSkill: Skill = {
        id: `skill-${(startingSkill.name || 'unknown').toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
        name: startingSkill.name!,
        description: startingSkill.description,
        skillType: startingSkill.skillType || GameTemplates.SkillType.KHAC,
        detailedEffect: startingSkill.specialEffects || startingSkill.description,
        manaCost: startingSkill.manaCost || 0,
        baseDamage: startingSkill.baseDamage || 0,
        damageMultiplier: startingSkill.damageMultiplier || 0,
        healingAmount: startingSkill.baseHealing || 0,
        healingMultiplier: startingSkill.healingMultiplier || 0,
        cooldown: startingSkill.cooldown || 0,
        currentCooldown: 0,
        proficiency: 0,
        maxProficiency: 100,
        proficiencyTier: "Sơ Nhập",
        congPhapDetails: startingSkill.congPhapDetails,
        linhKiDetails: startingSkill.linhKiDetails,
        professionDetails: startingSkill.professionDetails,
        camThuatDetails: startingSkill.camThuatDetails,
        thanThongDetails: startingSkill.thanThongDetails,
    };
    const newKb = JSON.parse(JSON.stringify(kb));
    let targetEntityList: (Prisoner[] | Wife[] | Slave[]);
    if (targetPerson.entityType === 'prisoner') targetEntityList = newKb.prisoners;
    else if (targetPerson.entityType === 'wife') targetEntityList = newKb.wives;
    else targetEntityList = newKb.slaves;
    const targetIndex = targetEntityList.findIndex((p: any) => p.id === targetPerson.id);
    if (targetIndex === -1) return null;
    const targetToUpdate = targetEntityList[targetIndex];
    if (!targetToUpdate.skills) targetToUpdate.skills = [];
    if (targetToUpdate.skills.some(s => s.name === newSkill.name)) {
        return {
            updatedKb: kb,
            systemMessage: {
                id: `skill-learn-fail-duplicate-${Date.now()}`,
                type: 'system',
                content: `${targetToUpdate.name} đã biết kỹ năng "${newSkill.name}" rồi.`,
                timestamp: Date.now(),
                turnNumber: kb.playerStats.turn
            }
        };
    }
    targetToUpdate.skills.push(newSkill);
    const itemIndexInInventory = newKb.inventory.findIndex((i: ItemType) => i.id === skillSlip.id);
    if (itemIndexInInventory > -1) {
        newKb.inventory[itemIndexInInventory].quantity -= 1;
        if (newKb.inventory[itemIndexInInventory].quantity <= 0) newKb.inventory.splice(itemIndexInInventory, 1);
    }
    return {
        updatedKb: newKb,
        systemMessage: {
            id: `skill-learn-offline-${Date.now()}`,
            type: 'system',
            content: `${targetToUpdate.name} đã dùng "${skillSlip.name}" và học được kỹ năng mới: ${newSkill.name}!`,
            timestamp: Date.now(),
            turnNumber: kb.playerStats.turn
        }
    };
};

interface UseGameActionsProps {
  knowledgeBase: KnowledgeBase;
  setKnowledgeBase: React.Dispatch<React.SetStateAction<KnowledgeBase>>;
  gameMessages: GameMessage[];
  setGameMessages: React.Dispatch<React.SetStateAction<GameMessage[]>>;
  addMessageAndUpdateState: (newMessages: GameMessage[], newKnowledgeBase: KnowledgeBase, callback?: () => void) => void;
  setRawAiResponsesLog: React.Dispatch<React.SetStateAction<string[]>>;
  setSentPromptsLog: React.Dispatch<React.SetStateAction<string[]>>;
  setSentEconomyPromptsLog: React.Dispatch<React.SetStateAction<string[]>>;
  setReceivedEconomyResponsesLog: React.Dispatch<React.SetStateAction<string[]>>;
  setSentGeneralSubLocationPromptsLog: React.Dispatch<React.SetStateAction<string[]>>;
  setReceivedGeneralSubLocationResponsesLog: React.SetStateAction<string[]>;
  setLatestPromptTokenCount: React.Dispatch<React.SetStateAction<number | null | string>>;
  setSummarizationResponsesLog: React.Dispatch<React.SetStateAction<string[]>>;
  showNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  setCurrentScreen: (screen: GameScreen) => void;
  currentPageDisplay: number;
  setCurrentPageDisplay: React.Dispatch<React.SetStateAction<number>>;
  isAutoPlaying: boolean;
  setIsAutoPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  executeSaveGame: (kbToSave: KnowledgeBase, messagesToSave: GameMessage[], saveName: string, existingId: string | null, isAuto: boolean) => Promise<string | null>;
  storageType: string; 
  firebaseUser: null;
  logNpcAvatarPromptCallback: (prompt: string) => void;
  setApiErrorWithTimeout: (message: string | null) => void;
  resetApiError: () => void;
  isLoadingApi: boolean;
  setIsLoadingApi: React.Dispatch<React.SetStateAction<boolean>>;
  setIsCultivating: React.Dispatch<React.SetStateAction<boolean>>;
  setSentCultivationPromptsLog: React.Dispatch<React.SetStateAction<string[]>>;
  setReceivedCultivationResponsesLog: React.SetStateAction<string[]>;
  setCompanionInteractionLog: React.Dispatch<React.SetStateAction<string[]>>;
  setPrisonerInteractionLog: React.Dispatch<React.SetStateAction<string[]>>;
  setSentPrisonerPromptsLog: React.Dispatch<React.SetStateAction<string[]>>;
  setReceivedPrisonerResponsesLog: React.Dispatch<React.SetStateAction<string[]>>;
  setSentCompanionPromptsLog: React.Dispatch<React.SetStateAction<string[]>>;
  setReceivedCompanionResponsesLog: React.SetStateAction<string[]>;
  setRetrievedRagContextLog: React.Dispatch<React.SetStateAction<string[]>>;
  onQuit: () => void;
  currentPageMessagesLog: string;
  previousPageSummaries: string[];
  lastNarrationFromPreviousPage?: string;
  setSentCombatSummaryPromptsLog: React.Dispatch<React.SetStateAction<string[]>>;
  setReceivedCombatSummaryResponsesLog: React.SetStateAction<string[]>;
  setSentVictoryConsequencePromptsLog: React.Dispatch<React.SetStateAction<string[]>>;
  setReceivedVictoryConsequenceResponsesLog: React.SetStateAction<string[]>;
  uiState: UIState;
  setUiState: React.Dispatch<React.SetStateAction<UIState>>;
}

export const useGameActions = (props: UseGameActionsProps) => {
  const { 
      setSentPromptsLog, setLatestPromptTokenCount, setIsLoadingApi, isLoadingApi, gameMessages, 
      knowledgeBase, setKnowledgeBase, addMessageAndUpdateState, showNotification, 
      setCurrentScreen, currentPageMessagesLog, previousPageSummaries, lastNarrationFromPreviousPage, 
      onQuit, logNpcAvatarPromptCallback, setRawAiResponsesLog, setApiErrorWithTimeout, 
      resetApiError, setSentEconomyPromptsLog, setReceivedEconomyResponsesLog, 
      setSentCombatSummaryPromptsLog, setReceivedCombatSummaryResponsesLog, 
      setSentVictoryConsequencePromptsLog, setReceivedVictoryConsequenceResponsesLog,
      setGameMessages, setPrisonerInteractionLog, setSentPrisonerPromptsLog, setReceivedPrisonerResponsesLog,
      setCompanionInteractionLog, setSentCompanionPromptsLog, setReceivedCompanionResponsesLog,
      uiState, setUiState
    } = props;

  const logSentPromptCallback = useCallback((prompt: string) => {
    setSentPromptsLog(prev => [prompt, ...prev].slice(0, 10));
    const { model: currentModel } = getGeminiApiSettings();
    if (currentModel === 'gemini-2.5-flash-preview-04-17' || !currentModel.startsWith('gemini-1.5-flash')) { 
      setLatestPromptTokenCount('Đang tính...');
      countTokens(prompt)
        .then(count => setLatestPromptTokenCount(count))
        .catch(err => {
          setLatestPromptTokenCount('Lỗi');
        });
    } else {
       setLatestPromptTokenCount('N/A (model)');
    }
  }, [setSentPromptsLog, setLatestPromptTokenCount]);

  const { handleSetupComplete } = useSetupActions({ ...props, setIsLoadingApi, logSentPromptCallback });

  const handleSuccession = useCallback(async (kbToModify: KnowledgeBase) => {
    kbToModify.huntedState = null;
    const potentialSuccessors = [...kbToModify.discoveredNPCs];
    let successor: NPC;
    
    if (potentialSuccessors.length === 0) {
        successor = {
            id: `successor-${Date.now()}`,
            name: 'Kẻ Kế Thừa Vô Danh',
            gender: 'Nam',
            race: 'Nhân Tộc',
            description: 'Một tu sĩ vô tình tìm thấy di vật của tiền bối.',
            affinity: 0,
            realm: 'Luyện Khí Nhất Trọng',
            tuChat: 'Trung Đẳng',
            stats: { ...DEFAULT_PLAYER_STATS, realm: 'Luyện Khí Nhất Trọng' },
            skills: [],
            personalityTraits: ['Bình thường'],
            title: 'Tu sĩ lang thang'
        };
    } else {
        const successorIndex = Math.floor(Math.random() * potentialSuccessors.length);
        successor = potentialSuccessors[successorIndex];
        kbToModify.discoveredNPCs.splice(successorIndex, 1);
    }
    
    const oldMcName = kbToModify.worldConfig?.playerName || "Người đi trước";
    
    // NARRATIVE ECHO: Inject subtle memory fragments for AI
    const spiritEcho = `Nhân vật này đôi khi cảm thấy một luồng điện xẹt qua não bộ, những hình ảnh mờ ảo về ${oldMcName} hiện về trong mơ nhưng không thể giải thích được. Luôn có cảm giác quen thuộc kỳ lạ khi đi qua các địa danh cũ.`;

    const deathLore: WorldLoreEntry = {
        id: `lore-death-${Date.now()}`,
        title: `Sự Ra Đi Của ${oldMcName}`,
        content: `${oldMcName} đã ngã xuống. Thế giới vẫn tiếp diễn và ${successor.name} đã xuất hiện. ${spiritEcho}`
    };
    kbToModify.worldLore.push(deathLore);

    if(kbToModify.worldConfig) {
        kbToModify.worldConfig.playerName = successor.name;
        kbToModify.worldConfig.playerGender = (successor.gender as any) || 'Nam';
        kbToModify.worldConfig.playerRace = successor.race || 'Nhân Tộc';
        kbToModify.worldConfig.playerPersonality = (successor.personalityTraits || []).join(', ');
        kbToModify.worldConfig.playerBackstory = `Vốn là ${successor.title || 'một tu sĩ'} tên là ${successor.name}. Kế thừa di vật của ${oldMcName}. [LƯU Ý GM: ${spiritEcho}]`;
        kbToModify.worldConfig.playerAvatarUrl = successor.avatarUrl;
    }
    kbToModify.playerAvatarData = successor.avatarUrl;

    // RULE: RESTART 50-TURN PROCESS FOR ARCHETYPE (STR, AGI, INT)
    kbToModify.playerStats = {
        ...DEFAULT_PLAYER_STATS,
        realm: successor.realm || 'Phàm Nhân',
        sinhLuc: successor.stats?.sinhLuc || 100,
        maxSinhLuc: successor.stats?.maxSinhLuc || 100,
        linhLuc: successor.stats?.linhLuc || 50,
        maxLinhLuc: successor.stats?.maxLinhLuc || 50,
        sucTanCong: successor.stats?.sucTanCong || 10,
        kinhNghiem: 0, 
        defeatCount: 0, 
        currency: successor.stats?.currency || 50,
        spiritualRoot: successor.spiritualRoot || "Phàm Căn",
        specialPhysique: successor.specialPhysique || "Phàm Thể",
        tuChat: successor.tuChat || "Trung Đẳng",
        turn: 0, // Reset Turn to 0 for the successor to start the 50-turn analysis again
        activeStatusEffects: [],
        playerSpecialStatus: null,
        professions: []
    };
    
    kbToModify.playerSkills = successor.skills || [];
    kbToModify.inventory = [];
    kbToModify.rawActionLog = []; // Clear log for the successor
    kbToModify.archetype = { title: "Chưa thức tỉnh", description: "Căn cơ đang được Thiên Đạo quan sát.", awakened: false };
    kbToModify.equippedItems = { 
        mainWeapon: null, offHandWeapon: null, head: null, body: null, hands: null, legs: null, artifact: null, pet: null, accessory1: null, accessory2: null 
    };

    // SOCIAL RESET: NPCs treat successor as a stranger
    kbToModify.discoveredNPCs.forEach(npc => {
        npc.affinity = 0;
        npc.relationshipToPlayer = 'Người lạ';
    });
    kbToModify.coreMemories = kbToModify.coreMemories.filter(m => m.entityId !== 'player');

    return {
        id: `succession-${Date.now()}`,
        type: 'system',
        content: `*** LUÂN HỒI CHUYỂN KIẾP ***\n${oldMcName} đã ngã xuống. ${successor.name} là kẻ kế thừa vận mệnh. Một sợi dây liên kết vô hình nối liền hai linh hồn, nhưng thế gian sẽ chỉ nhìn bạn như một người lạ mặt. Bắt đầu lại tiến trình thức tỉnh căn cơ (50 lượt).`,
        timestamp: Date.now(),
        turnNumber: 0
    };
  }, []);

  const handleNonCombatDefeat = useCallback(async (kbStateAtDefeat: KnowledgeBase, fatalNarration?: string) => {
    // Increment defeatCount for any HP < 1 situation (Rule: HP < 1 is a defeat)
    kbStateAtDefeat.playerStats.defeatCount = (kbStateAtDefeat.playerStats.defeatCount || 0) + 1;

    if (kbStateAtDefeat.playerStats.playerSpecialStatus) {
        showNotification("Bạn đã gục ngã nhưng số phận của bạn nằm trong tay chủ nhân.", "warning");
        const newKb = JSON.parse(JSON.stringify(kbStateAtDefeat));
        if (newKb.playerStats.sinhLuc <= 0) newKb.playerStats.sinhLuc = 1;
        const systemMessage: GameMessage = {
            id: `non-combat-defeat-prevented-${Date.now()}`,
            type: 'system',
            content: `Bạn đã gục ngã. Số phận của bạn do ${newKb.playerStats.playerSpecialStatus.ownerName} quyết định.`,
            timestamp: Date.now(),
            turnNumber: kbStateAtDefeat.playerStats.turn
        };
        addMessageAndUpdateState([systemMessage], newKb);
        setIsLoadingApi(false);
        return;
    }

    // TRIGGER SUCCESSION IF DEFEATS > 2
    if (kbStateAtDefeat.playerStats.defeatCount > 2) {
        const successionMsg = await handleSuccession(kbStateAtDefeat);
        addMessageAndUpdateState([successionMsg], kbStateAtDefeat);
        setIsLoadingApi(false);
        return;
    }

    setIsLoadingApi(true);
    resetApiError();
    showNotification("Bạn đã gục ngã! AI đang quyết định số phận của bạn...", 'warning');
    try {
        const { response, rawText } = await generateNonCombatDefeatConsequence(
            kbStateAtDefeat, currentPageMessagesLog, previousPageSummaries,
            fatalNarration || 'Bạn đã gục ngã do một sự kiện không rõ.',
            lastNarrationFromPreviousPage,
            (prompt) => setSentPromptsLog(prev => [prompt, ...prev].slice(0, 10))
        );
        setRawAiResponsesLog(prev => [rawText, ...prev].slice(0, 50));
        const { newKb: kbAfterTags, systemMessagesFromTags } = await performTagProcessing(
            kbStateAtDefeat, response.tags, kbStateAtDefeat.playerStats.turn + 1, setKnowledgeBase, logNpcAvatarPromptCallback
        );
        kbAfterTags.pendingCombat = null;
        const narrationMessage: GameMessage = {
            id: 'non-combat-defeat-narration-' + Date.now(),
            type: 'narration',
            content: response.narration,
            timestamp: Date.now(),
            choices: response.choices,
            turnNumber: kbAfterTags.playerStats.turn,
        };
        addMessageAndUpdateState([narrationMessage, ...systemMessagesFromTags], kbAfterTags);
    } catch (err) {
        setApiErrorWithTimeout("Lỗi khi xử lý hậu quả.");
    } finally {
        setIsLoadingApi(false);
    }
  }, [addMessageAndUpdateState, showNotification, setIsLoadingApi, setApiErrorWithTimeout, setRawAiResponsesLog, setSentPromptsLog, resetApiError, handleSuccession, setKnowledgeBase, logNpcAvatarPromptCallback, currentPageMessagesLog, lastNarrationFromPreviousPage, previousPageSummaries]);
  
  const mainGameLoopActions = useMainGameLoop({ ...props, setIsLoadingApi, logSentPromptCallback, handleNonCombatDefeat });
  const auctionActions = useAuctionActions({ ...props, isLoadingApi, setIsLoadingApi });
  const slaveAuctionActions = useSlaveAuctionActions({ ...props, isLoadingApi, setIsLoadingApi });
  const cultivationActions = useCultivationActions({ ...props });
  
  const handleTravelToLocation = useCallback(async (locationId: string) => {
    if (isLoadingApi) return;
    const currentLocation = knowledgeBase.discoveredLocations.find(l => l.id === knowledgeBase.currentLocationId);
    const targetLocation = knowledgeBase.discoveredLocations.find(l => l.id === locationId);
    if (!currentLocation || !targetLocation) return;
    const isChildOfCurrent = targetLocation.parentLocationId === currentLocation.id;
    const isParentOfCurrent = currentLocation.parentLocationId === targetLocation.id;
    const isConnected = currentLocation.connections?.some(c => c.targetLocationId === targetLocation.id) 
                        || targetLocation.connections?.some(c => c.targetLocationId === currentLocation.id); 
    if (!isChildOfCurrent && !isParentOfCurrent && !isConnected) {
        showNotification("Bạn không thể đi tắt!", "error");
        return;
    }
    setIsLoadingApi(true);
    resetApiError();
    const knowledgeBaseAtActionStart = JSON.parse(JSON.stringify(knowledgeBase));
    const gameMessagesAtActionStart = [...gameMessages];
    try {
        const { response, rawText } = await generateTravelEvent(knowledgeBase, currentLocation, targetLocation, (prompt) => setSentPromptsLog(prev => [prompt, ...prev].slice(0, 10)));
        setRawAiResponsesLog(prev => [rawText, ...prev].slice(0, 50));
        const turnNumberForMessages = knowledgeBase.playerStats.turn + 1;
        const { newKb: kbAfterTags, systemMessagesFromTags, turnIncrementedByTag } = await performTagProcessing(knowledgeBaseAtActionStart, response.tags, turnNumberForMessages, setKnowledgeBase, logNpcAvatarPromptCallback);
        let finalKb = kbAfterTags;
        if (!turnIncrementedByTag) finalKb.playerStats.turn = turnNumberForMessages;
        finalKb.turnHistory = addTurnHistoryEntryRaw(knowledgeBaseAtActionStart.turnHistory || [], knowledgeBaseAtActionStart, gameMessagesAtActionStart);
        const narrationMessage: GameMessage = { id: `travel-narration-${Date.now()}`, type: 'narration', content: response.narration, timestamp: Date.now(), choices: response.choices, turnNumber: finalKb.playerStats.turn };
        addMessageAndUpdateState([narrationMessage, ...systemMessagesFromTags], finalKb);
    } catch(err) {
        setApiErrorWithTimeout("Lỗi khi di chuyển.");
    } finally {
        setIsLoadingApi(false);
    }
  }, [knowledgeBase, gameMessages, setIsLoadingApi, resetApiError, showNotification, setSentPromptsLog, setRawAiResponsesLog, addMessageAndUpdateState, setKnowledgeBase, logNpcAvatarPromptCallback, setApiErrorWithTimeout]);

  const handleCreateMemoryFromLastTurn = useCallback(async () => {
    setIsLoadingApi(true);
    resetApiError();
    try {
        const lastNarrationMessage = [...gameMessages].reverse().find(m => m.type === 'narration');
        if (!lastNarrationMessage) throw new Error("Không tìm thấy lời kể.");
        const memoryData = await generateMemoryFromNarration(lastNarrationMessage.content, knowledgeBase.coreMemories.filter(m => m.entityId === 'player'));
        if (!memoryData) throw new Error("AI không thể tạo ký ức.");
        const { updatedKb, systemMessages } = processCoreMemoryAdd(knowledgeBase, { entityId: 'player', text: memoryData.text, strength: String(memoryData.strength) }, knowledgeBase.playerStats.turn);
        addMessageAndUpdateState(systemMessages, updatedKb);
        showNotification("Đã tạo ký ức thành công!", 'success');
    } catch (err) {
        setApiErrorWithTimeout("Lỗi khi tạo ký ức.");
    } finally {
        setIsLoadingApi(false);
    }
  }, [knowledgeBase, gameMessages, setIsLoadingApi, resetApiError, addMessageAndUpdateState, showNotification, setApiErrorWithTimeout]);
  
  const handlePrisonerAction = useCallback(async (prisoner: Prisoner, action: string) => {
    const useItemPattern = /^Sử dụng vật phẩm "(.*?)"/i;
    const match = action.match(useItemPattern);
    if (match && match[1]) {
        const result = handleOfflineSkillLearning(knowledgeBase, prisoner, match[1]);
        if (result) {
            addMessageAndUpdateState(result.systemMessage ? [result.systemMessage] : [], result.updatedKb);
            return;
        }
    }
    if (isLoadingApi) return;
    setIsLoadingApi(true);
    resetApiError();
    try {
        const { response, rawText } = await handlePrisonerInteraction(knowledgeBase, prisoner, action, currentPageMessagesLog, previousPageSummaries, lastNarrationFromPreviousPage, undefined, (prompt) => props.setSentPrisonerPromptsLog(prev => [prompt, ...prev].slice(0, 20)));
        props.setReceivedPrisonerResponsesLog(prev => [rawText, ...prev].slice(0, 20));
        const { newKb } = await performTagProcessing(knowledgeBase, response.tags, knowledgeBase.playerStats.turn, setKnowledgeBase, props.logNpcAvatarPromptCallback);
        setKnowledgeBase(newKb);
        props.setPrisonerInteractionLog(prev => [...prev, response.narration]);
    } catch (err) {
        props.setApiErrorWithTimeout("Lỗi tương tác tù nhân.");
    } finally {
        setIsLoadingApi(false);
    }
  }, [knowledgeBase, setIsLoadingApi, props, currentPageMessagesLog, previousPageSummaries, lastNarrationFromPreviousPage, setKnowledgeBase, addMessageAndUpdateState]);

  const handleCompanionAction = useCallback(async (companion: Wife | Slave, action: string) => {
    const useItemPattern = /^Sử dụng vật phẩm "(.*?)"/i;
    const match = action.match(useItemPattern);
    if (match && match[1]) {
        const result = handleOfflineSkillLearning(knowledgeBase, companion, match[1]);
        if (result) {
            addMessageAndUpdateState(result.systemMessage ? [result.systemMessage] : [], result.updatedKb);
            return;
        }
    }
    if (isLoadingApi) return;
    setIsLoadingApi(true);
    resetApiError();
    try {
        const { response, rawText } = await handleCompanionInteraction(knowledgeBase, companion, action, currentPageMessagesLog, previousPageSummaries, lastNarrationFromPreviousPage, (prompt) => props.setSentCompanionPromptsLog(prev => [prompt, ...prev].slice(0, 20)));
        props.setReceivedCompanionResponsesLog(prev => [rawText, ...prev].slice(0, 20));
        const { newKb } = await performTagProcessing(knowledgeBase, response.tags, knowledgeBase.playerStats.turn, setKnowledgeBase, props.logNpcAvatarPromptCallback);
        setKnowledgeBase(newKb);
        props.setCompanionInteractionLog(prev => [...prev, response.narration]);
    } catch (err) {
        props.setApiErrorWithTimeout("Lỗi tương tác đồng hành.");
    } finally {
        setIsLoadingApi(false);
    }
  }, [knowledgeBase, setIsLoadingApi, props, currentPageMessagesLog, previousPageSummaries, lastNarrationFromPreviousPage]);

  const handleExitPrisonerScreen = useCallback(async (log: string[]) => {
      if (log.length > 0) {
          try {
            const summary = await summarizePrisonerInteraction(log);
            addMessageAndUpdateState([{ id: 'prisoner-summary-' + Date.now(), type: 'narration', content: summary, timestamp: Date.now(), turnNumber: knowledgeBase.playerStats.turn }], knowledgeBase);
          } catch(err) {
              showNotification("Lỗi tóm tắt tù nhân.", 'error');
          }
      }
      props.setPrisonerInteractionLog([]);
      setCurrentScreen(GameScreen.Gameplay);
  }, [knowledgeBase, addMessageAndUpdateState, showNotification, setCurrentScreen, props]);

  const handleExitCompanionScreen = useCallback(async (log: string[]) => {
    if (log.length > 0) {
        try {
          const summary = await summarizeCompanionInteraction(log);
          addMessageAndUpdateState([{ id: 'companion-summary-' + Date.now(), type: 'narration', content: summary, timestamp: Date.now(), turnNumber: knowledgeBase.playerStats.turn }], knowledgeBase);
        } catch(err) {
            showNotification("Lỗi tóm tắt đồng hành.", 'error');
        }
    }
    props.setCompanionInteractionLog([]);
    setCurrentScreen(GameScreen.Gameplay);
}, [knowledgeBase, addMessageAndUpdateState, showNotification, setCurrentScreen, props]);

const handleCombatEnd = useCallback(async (result: CombatEndPayload) => {
    setIsLoadingApi(true);
    resetApiError();
    let systemMessages: GameMessage[] = [];
    let workingKb = JSON.parse(JSON.stringify(knowledgeBase)) as KnowledgeBase;
    
    if (result.outcome === 'defeat' && workingKb.huntedState?.isActive) {
        const successionMsg = await handleSuccession(workingKb); 
        addMessageAndUpdateState([successionMsg], workingKb);
        setCurrentScreen(GameScreen.Gameplay);
        setIsLoadingApi(false);
        return;
    }

    workingKb.playerStats = { ...workingKb.playerStats, ...result.finalPlayerState };
    if (result.finalInventory) workingKb.inventory = result.finalInventory;
    workingKb.pendingCombat = null;
    workingKb.playerStats.isInCombat = false;
    
    if (result.outcome === 'defeat') {
        const lostCurrency = Math.floor(workingKb.playerStats.currency / 2);
        workingKb.playerStats.currency -= lostCurrency;
        workingKb.playerStats.defeatCount = (workingKb.playerStats.defeatCount || 0) + 1;
        systemMessages.push({ id: `defeat-penalty-${Date.now()}`, type: 'system', content: `Thất bại! Bạn bị cướp ${lostCurrency} tiền.`, timestamp: Date.now(), turnNumber: workingKb.playerStats.turn });
        
        // RULE: DEFEAT LIMIT 2
        if (workingKb.playerStats.defeatCount > 2) {
             const successionMsg = await handleSuccession(workingKb);
             systemMessages.push(successionMsg);
        }
    }
    try {
        const summary = await summarizeCombat(result.summary.split('\n'), result.outcome, (prompt) => setSentCombatSummaryPromptsLog(prev => [prompt, ...prev].slice(0, 10)));
        let consequenceNarration = "";
        if (result.outcome === 'victory') {
             const { response } = await generateVictoryConsequence(workingKb, result, currentPageMessagesLog, previousPageSummaries, lastNarrationFromPreviousPage, (prompt) => setSentVictoryConsequencePromptsLog(prev => [prompt, ...prev].slice(0, 10)));
             consequenceNarration = response.narration;
        } else if (result.outcome === 'defeat') {
             const { response } = await generateDefeatConsequence(workingKb, result, currentPageMessagesLog, previousPageSummaries, lastNarrationFromPreviousPage, (prompt) => setSentVictoryConsequencePromptsLog(prev => [prompt, ...prev].slice(0, 10)));
             consequenceNarration = response.narration;
        }
        const summaryMessage: GameMessage = { id: 'combat-summary-' + Date.now(), type: 'narration', content: consequenceNarration || summary, timestamp: Date.now(), turnNumber: workingKb.playerStats.turn };
        addMessageAndUpdateState([summaryMessage, ...systemMessages], workingKb);
        setCurrentScreen(GameScreen.Gameplay);
    } catch (error) {
        addMessageAndUpdateState(systemMessages, workingKb);
        setCurrentScreen(GameScreen.Gameplay);
    } finally {
        setIsLoadingApi(false);
    }
}, [knowledgeBase, currentPageMessagesLog, previousPageSummaries, lastNarrationFromPreviousPage, addMessageAndUpdateState, setIsLoadingApi, resetApiError, handleSuccession, setCurrentScreen, setSentCombatSummaryPromptsLog, setSentVictoryConsequencePromptsLog]);

  const handleStartBreakthroughCombat = useCallback(async () => {}, []);

  const handleStartChallenge = useCallback(async (target: NPC | Wife | Slave | Prisoner) => {
    if (isLoadingApi) return;
    setIsLoadingApi(true);
    resetApiError();
    try {
        const response = await judgeChallengeConsequences(knowledgeBase, target, (prompt) => setSentPromptsLog(prev => [prompt, ...prev].slice(0, 10)));
        const { newKb, systemMessagesFromTags } = await performTagProcessing(knowledgeBase, response.tags, knowledgeBase.playerStats.turn, setKnowledgeBase, logNpcAvatarPromptCallback);
        addMessageAndUpdateState(systemMessagesFromTags, newKb, () => {
            if (newKb.pendingCombat) setCurrentScreen(GameScreen.Combat);
        });
    } catch (err) {
        setApiErrorWithTimeout("Lỗi xử lý khiêu chiến.");
    } finally {
        setIsLoadingApi(false);
    }
  }, [knowledgeBase, isLoadingApi, setIsLoadingApi, resetApiError, setSentPromptsLog, addMessageAndUpdateState, setCurrentScreen, setApiErrorWithTimeout, setKnowledgeBase, logNpcAvatarPromptCallback]);
  
  const handlePlayerAction = useCallback(async (action: string, isChoice: boolean, inputType: PlayerActionInputType, responseLength: ResponseLength) => {
    // PRE-ACTION HP CHECK: Trigger defeat if HP is already < 1 (from previous turn events)
    if (knowledgeBase.playerStats.sinhLuc < 1) {
        await handleNonCombatDefeat(knowledgeBase, "Bạn đã quá kiệt sức và không thể gượng dậy được nữa.");
        return;
    }

    await mainGameLoopActions.handlePlayerAction(action, isChoice, inputType, responseLength);

    // POST-ACTION HP CHECK is handled on the next turn cycle by the Pre-action check above.
  }, [knowledgeBase, mainGameLoopActions, handleNonCombatDefeat]);

  return {
    isSummarizingNextPageTransition: mainGameLoopActions.isSummarizingNextPageTransition,
    handleSetupComplete,
    handlePlayerAction,
    handleFindLocation: mainGameLoopActions.handleFindLocation,
    handleNonCombatDefeat,
    handleCombatEnd,
    handlePrisonerAction,
    handleCompanionAction,
    handleExitPrisonerScreen,
    handleExitCompanionScreen,
    handleTravelToLocation,
    ...auctionActions,
    ...slaveAuctionActions,
    ...cultivationActions,
    handleBuySlave: useCallback(() => {}, []),
    handleSellSlave: useCallback(() => {}, []),
    resetApiError: props.resetApiError,
    handleBuyPrisoner: useCallback(() => {}, []),
    handleSellPrisoner: useCallback(() => {}, []),
    handleCreateMemoryFromLastTurn,
    handleStartBreakthroughCombat,
    handleFreePerson: useCallback(() => {}, []),
    onStartDebugCombat: useCallback(() => {}, []),
    handleStartChallenge,
  };
};