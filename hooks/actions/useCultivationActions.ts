
import React, { useCallback } from 'react';
import { KnowledgeBase, GameMessage, GameScreen, Skill, NPC, Wife, Slave } from '../../types';
import { generateCultivationSession, summarizeCultivationSession } from '../../services/aiService';
import { dispatchTags } from '../../utils/tagProcessors/TagDispatcher';
import { handleLevelUps } from '../../utils/statsCalculationUtils';
import { VIETNAMESE } from '../../constants';

interface UseCultivationActionsProps {
  knowledgeBase: KnowledgeBase;
  setKnowledgeBase: React.Dispatch<React.SetStateAction<KnowledgeBase>>;
  addMessageAndUpdateState: (newMessages: GameMessage[], newKnowledgeBase: KnowledgeBase, callback?: () => void) => void;
  setIsCultivating: React.Dispatch<React.SetStateAction<boolean>>;
  setApiErrorWithTimeout: (message: string | null) => void;
  resetApiError: () => void;
  showNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  setCurrentScreen: (screen: GameScreen) => void;
  logNpcAvatarPromptCallback?: (prompt: string) => void; 
  setSentCultivationPromptsLog: React.Dispatch<React.SetStateAction<string[]>>;
  setReceivedCultivationResponsesLog: React.Dispatch<React.SetStateAction<string[]>>;
  currentPageMessagesLog: string;
  previousPageSummaries: string[];
  lastNarrationFromPreviousPage?: string;
}

export const useCultivationActions = ({
  knowledgeBase,
  setKnowledgeBase,
  addMessageAndUpdateState,
  setIsCultivating,
  setApiErrorWithTimeout,
  resetApiError,
  showNotification,
  setCurrentScreen,
  logNpcAvatarPromptCallback,
  setSentCultivationPromptsLog,
  setReceivedCultivationResponsesLog,
  currentPageMessagesLog,
  previousPageSummaries,
  lastNarrationFromPreviousPage,
}: UseCultivationActionsProps) => {

  const handleStartCultivation = useCallback(async (
    type: 'skill' | 'method',
    durationInTurns: number,
    targetId?: string,
    partnerId?: string
  ): Promise<string[]> => {
    setIsCultivating(true);
    resetApiError();
    const log: string[] = [];

    // --- NEW SCALING LOGIC ---
    const playerRace = knowledgeBase.worldConfig?.playerRace || 'Nhân Tộc';
    const playerRealmSystem = knowledgeBase.worldConfig?.raceCultivationSystems?.find(s => s.raceName === playerRace)?.realmSystem 
                              || 'Luyện Khí - Trúc Cơ - Kim Đan - Nguyên Anh - Hóa Thần';
    const realmProgressionList = playerRealmSystem.split(' - ').map(s => s.trim()).filter(Boolean);
    const currentMainRealm = realmProgressionList.find(r => (knowledgeBase.playerStats.realm || '').startsWith(r));
    const realmIndex = currentMainRealm ? realmProgressionList.indexOf(currentMainRealm) : 0;
    
    // Base values
    const COST_BASE = 500;
    const EXP_BASE = 500;

    // Chi phí tăng 20% mỗi đại cảnh giới
    const costMultiplier = Math.pow(1.2, realmIndex);
    // EXP cơ bản giảm 20% mỗi đại cảnh giới (mô phỏng độ khó tăng)
    const expMultiplier = Math.pow(0.8, realmIndex);

    const scaledCostPerDay = Math.floor(COST_BASE * costMultiplier);
    const scaledExpPerDay = Math.floor(EXP_BASE * expMultiplier);
    
    const totalCost = durationInTurns * scaledCostPerDay;
    // --- END NEW SCALING LOGIC ---

    if (knowledgeBase.playerStats.currency < totalCost) {
        showNotification(VIETNAMESE.notEnoughMoney, 'error');
        setIsCultivating(false);
        throw new Error(VIETNAMESE.notEnoughMoney);
    }

    try {
      const skill = type === 'skill' ? knowledgeBase.playerSkills.find(s => s.id === targetId) : undefined;
      const method = type === 'method' ? knowledgeBase.playerSkills.find(s => s.id === targetId) : undefined;
      const partner: NPC | Wife | Slave | undefined = partnerId 
          ? [...knowledgeBase.wives, ...knowledgeBase.slaves].find(p => p.id === partnerId) 
          : undefined;

      const { response, rawText } = await generateCultivationSession(
          knowledgeBase, 
          type, 
          durationInTurns,
          currentPageMessagesLog,
          previousPageSummaries,
          lastNarrationFromPreviousPage,
          skill, 
          method,
          partner,
          (prompt) => setSentCultivationPromptsLog(prev => [prompt, ...prev].slice(0, 10))
      );
      setReceivedCultivationResponsesLog(prev => [rawText, ...prev].slice(0, 10));
      
      // Start with a fresh copy and apply mechanical changes first
      let workingKb = JSON.parse(JSON.stringify(knowledgeBase));

      // Apply cost and guaranteed EXP gain
      const totalExpGain = durationInTurns * scaledExpPerDay;
      workingKb.playerStats.currency = (workingKb.playerStats.currency || 0) - totalCost;
      workingKb.playerStats.kinhNghiem = (workingKb.playerStats.kinhNghiem || 0) + totalExpGain;
      
      const mechanicalUpdateMessages: GameMessage[] = [{
        id: `cultivation-cost-gain-${Date.now()}`,
        type: 'system',
        content: `Bạn đã tiêu tốn ${totalCost.toLocaleString()} ${knowledgeBase.worldConfig?.currencyName || 'tiền tệ'} và nhận được ${totalExpGain.toLocaleString()} kinh nghiệm tu luyện.`,
        timestamp: Date.now(),
        turnNumber: knowledgeBase.playerStats.turn
      }];

      const { finalState: kbAfterTags, vectorUpdates } = dispatchTags(workingKb, response.tags);
      
      // Handle level up automatically
      const { updatedKb: kbAfterLevelUp, systemMessages: levelUpMessages } = handleLevelUps(kbAfterTags);

      const systemMessagesFromTags: GameMessage[] = []; 

      const allMessages = [...mechanicalUpdateMessages, ...levelUpMessages];
      addMessageAndUpdateState(allMessages, kbAfterLevelUp);

      if(response.narration) log.push(response.narration);
      
      // Also log systematic changes for clarity in the UI log
      log.push(`[Hệ thống] Tiêu hao: ${totalCost} tiền. Nhận: ${totalExpGain} EXP.`);
      if(levelUpMessages.length > 0) {
          levelUpMessages.forEach(msg => log.push(`[Hệ thống] ${msg.content}`));
      }

      return log;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Lỗi không xác định khi tu luyện.";
      setApiErrorWithTimeout(errorMsg);
      throw error;
    } finally {
      setIsCultivating(false);
    }
  }, [
      knowledgeBase, 
      setIsCultivating, 
      resetApiError, 
      setApiErrorWithTimeout, 
      addMessageAndUpdateState, 
      logNpcAvatarPromptCallback, 
      setSentCultivationPromptsLog, 
      setReceivedCultivationResponsesLog, 
      setKnowledgeBase, 
      currentPageMessagesLog, 
      previousPageSummaries, 
      lastNarrationFromPreviousPage,
      showNotification
    ]);
  
  const handleExitCultivation = useCallback(async (
    cultivationLog: string[],
    totalDuration: { days: number; months: number; years: number; }
  ) => {
      setIsCultivating(true);
      try {
        let summaryMessage: GameMessage | null = null;
        if (cultivationLog && cultivationLog.length > 0) {
            try {
                // We only summarize the narration, not the system messages we pushed to the log
                const narrationsOnly = cultivationLog.filter(log => !log.startsWith('['));
                if (narrationsOnly.length > 0) {
                    const summary = await summarizeCultivationSession(narrationsOnly);
                    summaryMessage = {
                        id: 'cultivation-summary-' + Date.now(),
                        type: 'event_summary',
                        content: summary,
                        timestamp: Date.now(),
                        turnNumber: knowledgeBase.playerStats.turn
                    };
                }
            } catch (error) {
                console.error("Failed to summarize cultivation session:", error);
                showNotification("Lỗi khi tóm tắt quá trình tu luyện.", 'error');
            }
        }

        const finalMessages: GameMessage[] = [];
        if (summaryMessage) {
            finalMessages.push(summaryMessage);
        }

        addMessageAndUpdateState(finalMessages, knowledgeBase, () => {
            setCurrentScreen(GameScreen.Gameplay);
        });
      } finally {
          setIsCultivating(false);
      }
  }, [knowledgeBase, addMessageAndUpdateState, showNotification, setCurrentScreen, setIsCultivating]);

  return { handleStartCultivation, handleExitCultivation };
};
