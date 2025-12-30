
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameTurn, GameState, TemporaryRule, ActionSuggestion, StatusEffect, InitialEntity, GameItem, Companion, Quest, EncounteredNPC, EncounteredFaction, TimePassed, CombatEndPayload, GameScreen, Wife, Slave, Prisoner, CoreEntityType } from '../types';
import * as aiService from '../services/aiService';
import * as fileService from '../services/fileService';
import * as gameService from '../services/gameService';
import { getSeason, generateWeather, extractTimePassedFromText } from '../utils/timeUtils';
import Button from './common/Button';
import Icon from './common/Icon';
import TemporaryRulesModal from './TemporaryRulesModal';
import MemoryModal from './MemoryModal';
import StoryLogModal from './StoryLogModal';
import InformationModal from './CharacterInfoModal';
import EntityInfoModal from './common/EntityInfoModal';
import { EncyclopediaModal } from './EncyclopediaModal';
import StatusHubModal from './StatusHubModal';
import CompanionsModal from './CompanionsModal';
import NotificationModal from './common/NotificationModal';
import ConfirmationModal from './common/ConfirmationModal';
import { getSettings } from '../services/settingsService';
import { resolveGenreArchetype } from '../utils/genreUtils';
import { dispatchTags, ParsedTag } from '../utils/tagProcessors';
// Fix: Added missing import for sanitizeEntityName
import { processNarration, sanitizeEntityName } from '../utils/textProcessing';
import CombatScreen from './CombatScreen';
import CultivationScreen from './CultivationScreen';
import { useCultivationActions } from '../hooks/actions/useCultivationActions';
import AwakeningModal from './gameplay/AwakeningModal';
import { useArchetypeSystem } from '../hooks/mechanics/useArchetypeSystem';

const StatusTooltipWrapper: React.FC<{ statusName: string; statuses: StatusEffect[]; children: React.ReactNode; onClick: () => void }> = ({ statusName, statuses, children, onClick }) => {
    const status = statuses.find(s => s.name.toLowerCase().trim() === statusName.toLowerCase().trim());
    const specialStatuses = ['trúng độc', 'bị thương nặng', 'tẩu hỏa nhập ma', 'suy yếu'];

    const clickableElement = (
        <button 
            type="button" 
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }} 
            className="text-cyan-400 font-semibold cursor-pointer hover:underline focus:outline-none focus:ring-2 focus:ring-cyan-500 rounded-sm bg-transparent p-0 border-0 text-left"
        >
            {children}
        </button>
    );

    if (!status || !specialStatuses.some(special => status.name.toLowerCase().includes(special))) {
        return clickableElement;
    }

    return (
        <span className="relative group">
            {clickableElement}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 hidden group-hover:block bg-slate-900 text-white text-xs rounded py-2 px-3 z-10 border border-slate-700 shadow-lg pointer-events-none">
                <p className="font-bold mb-1">{status.name} ({status.type === 'buff' ? 'Tích cực' : 'Tiêu cực'})</p>
                {status.description}
            </div>
        </span>
    );
};


const FormattedNarration: React.FC<{ content: string; statuses: StatusEffect[]; onEntityClick: (name: string) => void; }> = React.memo(({ content, statuses, onEntityClick }) => {
    const parts = content.split(/(<(?:exp|thought|status|important|entity)(?:\s+[^>]*)?>.*?<\/\s*(?:exp|thought|status|important|entity)\s*>|".*?")/gs).filter(Boolean);

    return (
        <p className="text-slate-200 whitespace-pre-wrap leading-relaxed">
            {parts.map((part, index) => {
                if (part.startsWith('"') && part.endsWith('"')) {
                    return <span key={index} className="text-purple-400 italic">{part}</span>;
                }
                
                const tagMatch = part.match(/^<(\w+)(?:\s+[^>]*)?>(.*?)<\/\s*\1\s*>$/s);
                if (tagMatch) {
                    const tagName = tagMatch[1];
                    const innerText = tagMatch[2];

                    switch (tagName) {
                        case 'exp':
                            return <span key={index} className="text-purple-400 italic">"{innerText}"</span>;
                        case 'thought':
                            return <span key={index} className="text-cyan-300 italic">"{innerText}"</span>;
                        case 'status':
                             return (
                                <StatusTooltipWrapper key={index} statusName={innerText} statuses={statuses} onClick={() => onEntityClick(innerText)}>
                                    {innerText}
                                </StatusTooltipWrapper>
                            );
                        case 'important':
                            return <button key={index} type="button" onClick={(e) => {e.stopPropagation(); onEntityClick(innerText)}} className="text-yellow-400 font-semibold cursor-pointer hover:underline focus:outline-none focus:ring-2 focus:ring-yellow-500 rounded-sm bg-transparent p-0 border-0 text-left">{innerText}</button>;
                        case 'entity':
                             return <button key={index} type="button" onClick={(e) => {e.stopPropagation(); onEntityClick(innerText)}} className="text-cyan-400 font-semibold cursor-pointer hover:underline focus:outline-none focus:ring-2 focus:ring-cyan-500 rounded-sm bg-transparent p-0 border-0 text-left">{innerText}</button>;
                        default:
                            return part;
                    }
                }
                
                const cleanedPart = part.replace(/<\/?(?:exp|thought|status|important|entity)(?:\s+[^>]*)?>/gi, '');
                return cleanedPart;
            })}
        </p>
    );
});

interface GameplayScreenProps {
  initialGameState: GameState;
  onBack: () => void;
}

const SuggestionCard: React.FC<{ suggestion: ActionSuggestion; onSelect: (description: string) => void; index: number; }> = ({ suggestion, onSelect, index }) => {
    const stripTags = (text: string) => text ? text.replace(/<\/?(entity|important|exp|thought|status)>/g, '') : '';

    return (
        <button
            onClick={() => onSelect(suggestion.description)}
            className="bg-blue-800/50 border border-blue-700/60 rounded-lg p-3 text-left w-full h-full hover:bg-blue-700/60 transition-colors duration-200 flex flex-col justify-center min-h-[60px]"
        >
            <p className="text-sm text-slate-100 font-medium">
                <span className="font-bold mr-1.5 text-blue-300">{index + 1}.</span>
                {stripTags(suggestion.description)}
            </p>
             <p className="text-blue-200/60 text-xs mt-1">
                (Tỷ lệ: {suggestion.successRate}%, Rủi ro: {stripTags(suggestion.risk)})
            </p>
        </button>
    );
};

const GameplayScreen: React.FC<GameplayScreenProps> = ({ initialGameState, onBack }) => {
  const [gameState, setGameState] = useState<GameState>({ ...initialGameState, companions: initialGameState.companions || [], quests: initialGameState.quests || [] });
  const [playerInput, setPlayerInput] = useState('');
  const [isLoading, setIsLoading] = useState(initialGameState.history.length === 0);
  const [isSaving, setIsSaving] = useState(false);
  const [notificationModal, setNotificationModal] = useState({ isOpen: false, title: '', messages: [''] });
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [showUndoConfirm, setShowUndoConfirm] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false); 
  
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [isTempRulesModalOpen, setIsTempRulesModalOpen] = useState(false);
  const [isStoryLogModalOpen, setIsStoryLogModalOpen] = useState(false);
  const [isInformationModalOpen, setIsInformationModalOpen] = useState(false);
  const [isEncyclopediaModalOpen, setIsEncyclopediaModalOpen] = useState(false);
  const [isStatusHubOpen, setIsStatusHubOpen] = useState(false);
  const [isCompanionsModalOpen, setIsCompanionsModalOpen] = useState(false);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [entityModalContent, setEntityModalContent] = useState<{ title: string; description: string; type: string; details?: InitialEntity['details']; questData?: any; isLoading?: boolean } | null>(null);
  
  const [isCultivationScreenOpen, setIsCultivationScreenOpen] = useState(false);

  const turnsPerPage = 5;
  const [currentPage, setCurrentPage] = useState(() => {
    if (initialGameState.history.length === 0) return 0;
    const narrationTurns = initialGameState.history.filter(h => h.type === 'narration');
    const totalPages = Math.max(1, Math.ceil(narrationTurns.length / turnsPerPage));
    return totalPages > 0 ? totalPages - 1 : 0;
  });

  const logContainerRef = useRef<HTMLDivElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  const narrationTurns = gameState.history.filter(h => h.type === 'narration');
  const totalPages = Math.max(1, Math.ceil(narrationTurns.length / turnsPerPage));

  // --- INTEGRATION: Archetype System ---
  const handleAddMessageAndUpdateState = useCallback((newMessages: any[], newKnowledgeBase: GameState, callback?: () => void) => {
      setGameState(newKnowledgeBase);
      if(callback) callback();
  }, []);

  const { 
      isAwakeningModalOpen, 
      awakeningResult, 
      handleConfirmAwakening, 
      isAnalysisLoading: isArchetypeLoading 
  } = useArchetypeSystem(gameState, setGameState, handleAddMessageAndUpdateState);

  const isLoadingCombined = isLoading || isArchetypeLoading;
  const isInitialLoading = isLoading && gameState.history.length === 0;
  const isTurnLoading = isLoading && gameState.history.length > 0;

  const [thinkingTimer, setThinkingTimer] = useState(0);
  const timerIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isTurnLoading) {
      setThinkingTimer(0);
      timerIntervalRef.current = window.setInterval(() => {
        setThinkingTimer(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setThinkingTimer(0);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isTurnLoading]);


  useEffect(() => {
      if (!gameState.playerStats) {
          setGameState(prev => ({
              ...prev,
              playerStats: {
                  sinhLuc: 100, maxSinhLuc: 100, sucTanCong: 10, sucPhongNhu: 5, thanPhap: 10,
                  activeStatusEffects: prev.playerStatus || [],
                  kinhNghiem: 0, maxKinhNghiem: 1000, currency: 0, turn: 0, tocDo: 10
              },
              combatMode: 'offline',
              combatCompanionIds: [],
              discoveredNPCs: prev.encounteredNPCs || [],
              wives: [], slaves: [], prisoners: [], discoveredYeuThu: [], playerSkills: [], realmProgressionList: []
          }));
      }
  }, []);

  const handleSetCurrentScreen = useCallback((screen: GameScreen) => {
      if (screen === GameScreen.Cultivation) setIsCultivationScreenOpen(true);
      else setIsCultivationScreenOpen(false);
  }, []);

  const handleSetApiError = useCallback((msg: string | null) => {
      if(msg) setNotificationModal({isOpen: true, title: 'Lỗi', messages: [msg]});
  }, []);

  const handleShowNotification = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning') => {
      setNotificationModal({isOpen: true, title: type.toUpperCase(), messages: [message]});
  }, []);

  const getLastNarration = () => {
      const narrations = gameState.history.filter(t => t.type === 'narration');
      return narrations.length > 0 ? narrations[narrations.length - 1].content : undefined;
  };

  const { handleStartCultivation, handleExitCultivation } = useCultivationActions({
      knowledgeBase: gameState,
      setKnowledgeBase: setGameState,
      addMessageAndUpdateState: handleAddMessageAndUpdateState,
      setIsCultivating: setIsLoading,
      setApiErrorWithTimeout: handleSetApiError,
      resetApiError: () => {},
      showNotification: handleShowNotification,
      setCurrentScreen: handleSetCurrentScreen,
      setSentCultivationPromptsLog: () => {},
      setReceivedCultivationResponsesLog: () => {},
      currentPageMessagesLog: '',
      previousPageSummaries: gameState.summaries,
      lastNarrationFromPreviousPage: getLastNarration()
  });

  const handleStartBreakthrough = async () => {
      setIsCultivationScreenOpen(false);
      setGameState(prev => ({
          ...prev,
          pendingCombat: {
              opponentIds: [],
              location: 'Lôi Trì'
          },
          combatMode: 'offline',
          playerStats: {
            ...prev.playerStats,
            isInCombat: true, 
          }
      }));
  };

  const getTurnsForCurrentPage = () => {
    if (narrationTurns.length === 0) {
        // If there are no narrations, just show the raw history (for the very beginning of the game)
        return gameState.history;
    }

    const startIndex = currentPage * turnsPerPage;
    const endIndex = startIndex + turnsPerPage;
    
    // 1. Get the narration turns for the current page
    const pageNarrationTurns = narrationTurns.slice(startIndex, endIndex);

    const turnsForPage: GameTurn[] = [];
    
    // Create a map for faster index lookup
    const historyIndexMap = new Map<GameTurn, number>();
    gameState.history.forEach((turn, index) => {
        historyIndexMap.set(turn, index);
    });

    // 2. For each narration, find its preceding action
    pageNarrationTurns.forEach(narrationTurn => {
        const narrationIndex = historyIndexMap.get(narrationTurn);

        if (narrationIndex !== undefined && narrationIndex > 0) {
            const previousTurn = gameState.history[narrationIndex - 1];
            // 3. Only add the previous turn if it's a player action
            if (previousTurn && previousTurn.type === 'action') {
                // Check to prevent adding duplicates if logic gets complex
                if (turnsForPage.length === 0 || turnsForPage[turnsForPage.length - 1] !== previousTurn) {
                    turnsForPage.push(previousTurn);
                }
            }
        }
        // 4. Always add the narration turn itself
        turnsForPage.push(narrationTurn);
    });
    
    // Handle the special case where the very last turn in history is a pending action
    const isLastPage = currentPage === totalPages - 1;
    const lastHistoryTurn = gameState.history[gameState.history.length - 1];
    if (isLastPage && lastHistoryTurn?.type === 'action') {
        if (turnsForPage[turnsForPage.length - 1] !== lastHistoryTurn) {
             turnsForPage.push(lastHistoryTurn);
        }
    }

    return turnsForPage;
  };
  const currentTurns = getTurnsForCurrentPage();

  const handleScroll = () => {
    if (logContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
        setShowScrollButton(scrollHeight - scrollTop - clientHeight > 100);
    }
  };

  const scrollToBottom = () => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleOpenStoryLog = useCallback(() => {
    setIsStoryLogModalOpen(true);
  }, []);

  const handleEntityClick = useCallback(async (name: string) => {
        // Fix: sanitizeEntityName is now imported correctly above
        const sanitizedName = sanitizeEntityName(name);
        const lowerName = sanitizedName.toLowerCase().trim();
        if (!lowerName) return;

        // 1. TÌM KIẾM CỤC BỘ (LOCAL SEARCH)
        const allLocalEntities = [
            ...(gameState.encounteredNPCs || []),
            ...(gameState.companions || []),
            ...(gameState.wives || []),
            ...(gameState.slaves || []),
            ...(gameState.prisoners || []),
            ...(gameState.inventory || []),
            ...(gameState.discoveredEntities || []),
            ...(gameState.worldConfig.initialEntities || []),
            ...(gameState.quests || [])
        ];

        const found = allLocalEntities.find(e => e.name.toLowerCase() === lowerName);

        if (found) {
            setEntityModalContent({
                title: found.name,
                description: (found as any).description || (found as any).personality || "Không có mô tả chi tiết.",
                type: (found as any).type || (found as any).status ? 'Nhiệm Vụ' : 'Thông tin',
                details: (found as any).details || (found as any).stats ? { stats: JSON.stringify((found as any).stats) } : undefined,
                questData: (found as any).status ? found : undefined
            });
            return;
        }

        // 2. NẾU KHÔNG THẤY -> GỌI AI SÁNG TẠO TỨC THỜI (ON-THE-FLY)
        setEntityModalContent({ title: sanitizedName, description: "", type: "Đang tra cứu...", isLoading: true });
        
        try {
            const aiGeneratedEntity = await aiService.generateEntityInfoOnTheFly(gameState, sanitizedName);
            
            setEntityModalContent({
                title: aiGeneratedEntity.name,
                description: aiGeneratedEntity.description,
                type: aiGeneratedEntity.customCategory || aiGeneratedEntity.type || "Thông tin",
                details: aiGeneratedEntity.details,
                isLoading: false
            });

            // 3. LƯU VÀO TRÍ NHỚ (PERSISTENCE)
            setGameState(prev => ({
                ...prev,
                discoveredEntities: [...(prev.discoveredEntities || []), aiGeneratedEntity]
            }));

        } catch (error) {
            console.error("Lỗi khi tra cứu thực thể bằng AI:", error);
            setEntityModalContent({
                title: sanitizedName,
                description: "Không thể truy xuất thông tin thần thông lúc này. Có lẽ đây là một bí ẩn của thiên đạo.",
                type: "Lỗi",
                isLoading: false
            });
        }
  }, [gameState]);

  const handleActionSubmit = useCallback(async (actionContent: string) => {
      if (!actionContent.trim() || isLoadingCombined) return;
      
      const extractedTime: TimePassed = extractTimePassedFromText(actionContent, gameState.worldTime);
      const newAction: GameTurn = { type: 'action', content: actionContent.trim().replace(/<[^>]*>/g, '') };
      
      setGameState(prev => ({ 
          ...prev, 
          history: [...prev.history, newAction],
          rawActionLog: [...(prev.rawActionLog || []), actionContent.trim()]
      }));
      
      setPlayerInput('');
      setIsLoading(true);
      try {
          const tempGameState = { 
              ...gameState, 
              history: [...gameState.history, newAction] 
          };
          
          const { narration, tags } = await aiService.getNextTurn(tempGameState, extractedTime);
          const narrationTurn: GameTurn = { type: 'narration', content: processNarration(narration) };
          
          setGameState(prev => {
              let updatedState = { ...prev, history: [...prev.history, narrationTurn] };
              const stateChangingTags = tags.filter(t => t.tagName !== 'SUGGESTION');
              // FIX: Removed await and systemMessages, as dispatchTags is synchronous and doesn't return systemMessages.
              const { finalState } = dispatchTags(updatedState, stateChangingTags);
              const suggestions = tags.filter(t => t.tagName === 'SUGGESTION').map(t => t.params as ActionSuggestion);
              finalState.suggestions = suggestions;
              gameService.saveGame(finalState, 'auto');
              return finalState;
          });
          setCurrentPage(Math.max(0, Math.ceil((narrationTurns.length + 1) / turnsPerPage) - 1));
      } catch (e) {
          console.error(e);
      } finally {
          setIsLoading(false);
      }
  }, [gameState, isLoadingCombined, narrationTurns.length]);

  const startGame = useCallback(async () => {
      if (gameState.history.length > 0) { setIsLoading(false); return; }
      setIsLoading(true);
      try {
          const { narration, tags } = await aiService.startGame(gameState.worldConfig);
          const narrationTurn: GameTurn = { type: 'narration', content: processNarration(narration) };
          const suggestions = tags.filter(t => t.tagName === 'SUGGESTION').map(t => t.params as ActionSuggestion);
          const stateChangingTags = tags.filter(t => t.tagName !== 'SUGGESTION');
          // FIX: Removed await as dispatchTags is synchronous.
          const { finalState } = dispatchTags(gameState, stateChangingTags as any);
          
          finalState.history = [narrationTurn];
          finalState.suggestions = suggestions;
          
          const archetype = resolveGenreArchetype(finalState.worldConfig.storyContext.genre);
          finalState.season = getSeason(finalState.worldTime.month, archetype);
          finalState.weather = generateWeather(finalState.season, archetype);

          setGameState(finalState);
          await gameService.saveGame(finalState, 'auto');
      } catch(e) { console.error(e); } finally { setIsLoading(false); }
  }, [gameState]);

  useEffect(() => { if (gameState.history.length === 0) startGame(); }, [gameState.history.length, startGame]);

  const handleCombatEnd = useCallback(async (result: CombatEndPayload) => {
    console.log("Hậu xử lý trận chiến:", result);
    setIsLoading(true); 

    const newState = JSON.parse(JSON.stringify(gameState));

    newState.playerStats = { ...newState.playerStats, ...result.finalPlayerState };
    newState.inventory = result.finalInventory;
    if (result.finalAlliesStatus) {
        result.finalAlliesStatus.forEach(status => {
            const ally = [...newState.wives, ...newState.slaves, ...newState.companions].find(c => c.id === status.id);
            if (ally && ally.stats) {
                ally.stats.sinhLuc = status.hp;
                ally.stats.linhLuc = status.mp;
            }
        });
    }

    const dispositionSummaryParts: string[] = [];
    const defeatedNpcNames: string[] = [];
    Object.entries(result.dispositions).forEach(([npcId, disposition]) => {
        let sourceList: any[] | undefined;
        let sourceIndex = -1;
        
        sourceIndex = newState.encounteredNPCs.findIndex((n: EncounteredNPC) => n.id === npcId);
        if(sourceIndex !== -1) sourceList = newState.encounteredNPCs;
        else {
            sourceIndex = newState.discoveredYeuThu.findIndex((y: any) => y.id === npcId);
            if(sourceIndex !== -1) sourceList = newState.discoveredYeuThu;
        }

        if (!sourceList || sourceIndex === -1) return;

        const [processedNpc] = sourceList.splice(sourceIndex, 1);
        defeatedNpcNames.push(processedNpc.name);

        if (disposition === 'capture') {
            const prisoner: Prisoner = {
                ...(processedNpc as EncounteredNPC),
                entityType: 'prisoner',
                resistance: 100,
                willpower: 100,
            };
            if (!newState.prisoners) newState.prisoners = [];
            newState.prisoners.push(prisoner);
            dispositionSummaryParts.push(`bắt giữ ${processedNpc.name}`);
        } else if (disposition === 'kill') {
            dispositionSummaryParts.push(`kết liễu ${processedNpc.name}`);
        } else { 
            newState.encounteredNPCs.push(processedNpc);
            dispositionSummaryParts.push(`tha cho ${processedNpc.name}`);
        }
    });

    newState.pendingCombat = undefined;
    newState.playerStats.isInCombat = false;
    setGameState(newState);

    let postCombatAction = `Trận chiến đã kết thúc. `;
    if (result.outcome === 'victory') {
        postCombatAction += `Tôi đã chiến thắng.`;
        if (dispositionSummaryParts.length > 0) {
            postCombatAction += ` Sau đó, tôi quyết định ${dispositionSummaryParts.join(', ')}.`;
        } else if (defeatedNpcNames.length > 0) {
             postCombatAction += ` Kẻ địch ${defeatedNpcNames.join(', ')} đã bị đánh bại.`;
        }
        postCombatAction += ` Hãy mô tả lại khung cảnh sau trận chiến và những gì xảy ra tiếp theo.`
    } else if (result.outcome === 'defeat') {
        postCombatAction = `Tôi đã bị đánh bại trong trận chiến. Hãy mô tả hậu quả của thất bại này.`;
    } else if (result.outcome === 'escaped') {
        postCombatAction = `Tôi đã bỏ chạy thành công khỏi trận chiến. Hãy mô tả cảnh tôi thoát thân và những gì xảy ra sau đó.`;
    }

    try {
        const tempAction: GameTurn = { type: 'action', content: postCombatAction };
        const tempGameState = { 
            ...newState,
            history: [...newState.history, tempAction] 
        };
        const { narration, tags } = await aiService.getNextTurn(tempGameState, {});
        const narrationTurn: GameTurn = { type: 'narration', content: processNarration(narration) };
        
        setGameState(prev => {
            let updatedState = { ...prev, history: [...prev.history, tempAction, narrationTurn] };
            const stateChangingTags = tags.filter(t => t.tagName !== 'SUGGESTION');
            // FIX: Removed await as dispatchTags is synchronous.
            const { finalState } = dispatchTags(updatedState, stateChangingTags as any);
            const suggestions = tags.filter(t => t.tagName === 'SUGGESTION').map(t => t.params as ActionSuggestion);
            finalState.suggestions = suggestions;
            gameService.saveGame(finalState, 'auto');
            return finalState;
        });
        setCurrentPage(Math.max(0, Math.ceil((narrationTurns.length + 2) / turnsPerPage) - 1)); 
    } catch (e) {
        console.error("Lỗi khi tạo lời kể hậu chiến:", e);
        const fallbackTurn: GameTurn = { type: 'narration', content: "Màn sương tan đi sau trận chiến..." };
        setGameState(prev => ({...prev, history: [...prev.history, fallbackTurn]}));
    } finally {
        setIsLoading(false); 
    }
  }, [gameState, narrationTurns.length]);


  const handleManualSave = async () => {
      setIsSaving(true);
      try {
          await gameService.saveGame(gameState, 'manual');
          setNotificationModal({ isOpen: true, title: 'Thành công', messages: ['Đã lưu game thủ công thành công!'] });
      } catch (e) {
          setNotificationModal({ isOpen: true, title: 'Lỗi', messages: ['Không thể lưu game.'] });
      } finally {
          setIsSaving(false);
      }
  };

  const handleUndo = () => {
      if (gameState.history.length >= 2) {
          setGameState(prev => ({
              ...prev,
              history: prev.history.slice(0, -2)
          }));
          setNotificationModal({ isOpen: true, title: 'Đã lùi lượt', messages: ['Đã xóa lượt chơi gần nhất.'] });
      }
      setShowUndoConfirm(false);
  };

  const handleRestart = () => {
      setGameState({ ...initialGameState, worldId: Date.now() });
      setShowRestartConfirm(false);
  };

  if (isCultivationScreenOpen) {
      return <CultivationScreen 
          knowledgeBase={gameState}
          onStartCultivation={handleStartCultivation}
          onExit={handleExitCultivation}
          isLoading={isLoading}
          setCurrentScreen={handleSetCurrentScreen}
          onStartBreakthrough={handleStartBreakthrough}
      />;
  }

  if (gameState.playerStats.isInCombat) {
      return <CombatScreen 
          knowledgeBase={gameState} 
          onCombatEnd={handleCombatEnd}
          setKnowledgeBase={setGameState}
          setCombatMode={(mode) => setGameState(prev => ({...prev, combatMode: mode}))}
      />;
  }

  const DashboardSidebar = () => (
      <div className="h-full bg-slate-800/80 backdrop-blur-md flex flex-col p-4 space-y-4 overflow-y-auto">
        <div className="flex-shrink-0 space-y-4">
            <div className="text-center border-b border-slate-700 pb-4">
                <h2 className="text-xl font-bold text-slate-100 truncate">{gameState.character.name}</h2>
            </div>
        </div>
        <div className="flex-grow space-y-2">
             {gameState.worldConfig?.enableStatsSystem && (
                 <button onClick={() => { setIsCultivationScreenOpen(true); setIsSidePanelOpen(false); }} className="w-full flex items-center justify-between px-3 py-3 text-sm text-left rounded-md hover:bg-slate-700 transition bg-indigo-900/30 border border-indigo-700/50">
                    <span className="flex items-center"><Icon name="magic" className="w-5 h-5 mr-3 text-indigo-400"/>Tu Luyện</span>
                </button>
             )}
             <button onClick={() => { setIsInformationModalOpen(true); setIsSidePanelOpen(false); }} className="w-full flex items-center justify-between px-3 py-3 text-sm text-left rounded-md hover:bg-slate-700 transition">
                <span className="flex items-center"><Icon name="info" className="w-5 h-5 mr-3 text-pink-400"/>Túi Đồ & Thông Tin</span>
            </button>
            <button onClick={() => { setIsStatusHubOpen(true); setIsSidePanelOpen(false); }} className="w-full flex items-center justify-between px-3 py-3 text-sm text-left rounded-md hover:bg-slate-700 transition">
                <span className="flex items-center"><Icon name="hub" className="w-5 h-5 mr-3 text-cyan-400"/>Trạng Thái & Nhiệm Vụ</span>
            </button>
            <button onClick={() => { setIsCompanionsModalOpen(true); setIsSidePanelOpen(false); }} className="w-full flex items-center justify-between px-3 py-3 text-sm text-left rounded-md hover:bg-slate-700 transition border border-green-700/30 bg-green-900/10">
                <span className="flex items-center"><Icon name="companions" className="w-5 h-5 mr-3 text-green-400"/>Đồng Hành & Hậu Cung</span>
            </button>
            <button onClick={() => { setIsEncyclopediaModalOpen(true); setIsSidePanelOpen(false); }} className="w-full flex items-center justify-between px-3 py-3 text-sm text-left rounded-md hover:bg-slate-700 transition">
                <span className="flex items-center"><Icon name="encyclopedia" className="w-5 h-5 mr-3 text-purple-400"/>Bách Khoa Toàn Thư</span>
            </button>
            <button onClick={() => { setIsMemoryModalOpen(true); setIsSidePanelOpen(false); }} className="w-full flex items-center justify-between px-3 py-3 text-sm text-left rounded-md hover:bg-slate-700 transition">
                <span className="flex items-center"><Icon name="memory" className="w-5 h-5 mr-3 text-blue-400"/>Ký Ức</span>
            </button>
            <button onClick={() => { setIsTempRulesModalOpen(true); setIsSidePanelOpen(false); }} className="w-full flex items-center justify-between px-3 py-3 text-sm text-left rounded-md hover:bg-slate-700 transition">
                <span className="flex items-center"><Icon name="rules" className="w-5 h-5 mr-3 text-yellow-400"/>Luật Tạm Thời / Ghi Chú</span>
            </button>
            
            <hr className="border-slate-700 my-2" />
            
            <button onClick={handleManualSave} disabled={isSaving} className="w-full flex items-center justify-between px-3 py-3 text-sm text-left rounded-md hover:bg-slate-700 transition text-slate-300">
                <span className="flex items-center"><Icon name="save" className="w-5 h-5 mr-3"/>{isSaving ? 'Đang lưu...' : 'Lưu Game'}</span>
            </button>
            <button onClick={() => setShowUndoConfirm(true)} className="w-full flex items-center justify-between px-3 py-3 text-sm text-left rounded-md hover:bg-slate-700 transition text-slate-300">
                <span className="flex items-center"><Icon name="undo" className="w-5 h-5 mr-3"/>Lùi Lượt</span>
            </button>
            <button onClick={() => setShowRestartConfirm(true)} className="w-full flex items-center justify-between px-3 py-3 text-sm text-left rounded-md hover:bg-slate-700 transition text-slate-300">
                <span className="flex items-center"><Icon name="restart" className="w-5 h-5 mr-3"/>Bắt Đầu Lại</span>
            </button>
            <button onClick={() => setShowExitConfirm(true)} className="w-full flex items-center justify-between px-3 py-3 text-sm text-left rounded-md hover:bg-red-900/30 transition text-red-400">
                <span className="flex items-center"><Icon name="xCircle" className="w-5 h-5 mr-3"/>Thoát</span>
            </button>
        </div>
      </div>
  );

  return (
    <>
      <AwakeningModal 
        isOpen={isAwakeningModalOpen}
        onConfirm={handleConfirmAwakening}
        result={awakeningResult}
      />
      <InformationModal isOpen={isInformationModalOpen} onClose={() => setIsInformationModalOpen(false)} gameState={gameState} onDeleteEntity={() => {}} />
      <NotificationModal isOpen={notificationModal.isOpen} onClose={() => setNotificationModal(prev=>({...prev, isOpen: false}))} title={notificationModal.title} messages={notificationModal.messages} />
      <StoryLogModal isOpen={isStoryLogModalOpen} onClose={() => setIsStoryLogModalOpen(false)} history={gameState.history} title={`Nhật ký hành trình - Trang ${currentPage + 1}`} />
      <TemporaryRulesModal isOpen={isTempRulesModalOpen} onClose={() => setIsTempRulesModalOpen(false)} onSave={(rules) => setGameState(prev => ({ ...prev, worldConfig: { ...prev.worldConfig, temporaryRules: rules } }))} initialRules={gameState.worldConfig.temporaryRules || []} />
      <MemoryModal isOpen={isMemoryModalOpen} onClose={() => setIsMemoryModalOpen(false)} memories={gameState.memories} summaries={gameState.summaries} />
      <StatusHubModal 
        isOpen={isStatusHubOpen} 
        onClose={() => setIsStatusHubOpen(false)}
        statuses={gameState.playerStatus}
        quests={gameState.quests}
        onSelectStatus={(name) => {}}
        onDeleteStatus={(name) => setGameState(prev => ({...prev, playerStatus: prev.playerStatus.filter(s => s.name !== name)}))}
        onSelectQuest={(q) => {}}
        onDeleteQuest={(name) => setGameState(prev => ({...prev, quests: prev.quests.filter(q => q.name !== name)}))}
      />
      <CompanionsModal 
        isOpen={isCompanionsModalOpen} 
        onClose={() => setIsCompanionsModalOpen(false)}
        gameState={gameState}
        onCompanionAction={() => {}}
