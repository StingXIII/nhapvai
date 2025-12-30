
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

// --- SUB-COMPONENTS ---

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

// Updated FormattedNarration to handle pending lookups visual cue AND Context Extraction
const FormattedNarration: React.FC<{ 
    content: string; 
    statuses: StatusEffect[]; 
    pendingLookups?: { name: string; context: string }[];
    onEntityClick: (name: string, context: string) => void; 
}> = React.memo(({ content, statuses, pendingLookups = [], onEntityClick }) => {
    const parts = content.split(/(<(?:exp|thought|status|important|entity)(?:\s+[^>]*)?>.*?<\/\s*(?:exp|thought|status|important|entity)\s*>|".*?")/gs).filter(Boolean);

    // Helper to calculate current position
    let currentPos = 0;

    const renderEntityButton = (text: string, colorClass: string, ringClass: string, context: string) => {
        const isPending = pendingLookups.some(p => p.name === sanitizeEntityName(text));
        return (
            <button 
                type="button" 
                onClick={(e) => {e.stopPropagation(); onEntityClick(text, context)}} 
                className={`${colorClass} font-semibold cursor-pointer hover:underline focus:outline-none focus:ring-2 ${ringClass} rounded-sm bg-transparent p-0 border-0 text-left`}
            >
                {text}
                {isPending && <span className="ml-1 text-[10px] align-top opacity-70" title="Đang chờ cập nhật...">🕒</span>}
            </button>
        );
    };

    return (
        <p className="text-slate-200 whitespace-pre-wrap leading-relaxed">
            {parts.map((part, index) => {
                const startIndex = currentPos;
                currentPos += part.length;

                // Context extraction logic: Grab 100 chars before and after
                const contextStart = Math.max(0, startIndex - 100);
                const contextEnd = Math.min(content.length, startIndex + part.length + 100);
                // Strip tags from context for cleaner reading
                const context = content.substring(contextStart, contextEnd).replace(/<[^>]+>/g, '');

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
                                <StatusTooltipWrapper key={index} statusName={innerText} statuses={statuses} onClick={() => onEntityClick(innerText, context)}>
                                    {innerText}
                                </StatusTooltipWrapper>
                            );
                        case 'important':
                            return <React.Fragment key={index}>{renderEntityButton(innerText, 'text-yellow-400', 'focus:ring-yellow-500', context)}</React.Fragment>;
                        case 'entity':
                             return <React.Fragment key={index}>{renderEntityButton(innerText, 'text-cyan-400', 'focus:ring-cyan-500', context)}</React.Fragment>;
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

// --- NEW MODAL: Lookup Choice ---
const LookupChoiceModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    entityName: string;
    context: string;
    onLookupNow: () => void;
    onLookupLater: () => void;
}> = ({ isOpen, onClose, entityName, context, onLookupNow, onLookupLater }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[80] p-4" onClick={onClose}>
            <div 
                className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl p-6 w-full max-w-sm relative animate-fade-in-up"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="text-center mb-6">
                    <div className="w-12 h-12 bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-3 border border-blue-500/30">
                        <Icon name="info" className="w-6 h-6 text-blue-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-100 mb-1">Tra Cứu: "{entityName}"</h3>
                    <p className="text-sm text-slate-400 mb-2">Thông tin về thực thể này chưa có trong Bách Khoa Toàn Thư. Bạn muốn làm gì?</p>
                    <div className="bg-slate-900/50 p-2 rounded border border-slate-700/50 text-xs text-slate-400 italic text-left max-h-20 overflow-y-auto">
                        <strong>Ngữ cảnh:</strong> "...{context}..."
                    </div>
                </div>

                <div className="space-y-3">
                    <button 
                        onClick={onLookupNow}
                        className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold rounded-lg shadow-lg flex items-center justify-between group transition-all"
                    >
                        <span>Tra cứu ngay</span>
                        <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded text-blue-100 group-hover:bg-black/30">Tốn API</span>
                    </button>
                    
                    <button 
                        onClick={onLookupLater}
                        className="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-lg flex items-center justify-between group transition-all"
                    >
                        <span>Hỏi trong lượt sau</span>
                        <span className="text-[10px] bg-green-900/40 px-2 py-0.5 rounded text-green-300 border border-green-700/30">Tiết kiệm</span>
                    </button>

                    <button 
                        onClick={onClose}
                        className="w-full py-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
                    >
                        Thôi, không cần nữa
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

interface GameplayScreenProps {
  initialGameState: GameState;
  onBack: () => void;
}

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
  const [entityModalContent, setEntityModalContent] = useState<{ title: string; description: string; type: string; details?: InitialEntity['details']; questData?: any; isLoading?: boolean; affinity?: number; } | null>(null);
  
  // NEW STATE for Hybrid Lookup
  const [lookupChoiceState, setLookupChoiceState] = useState<{ isOpen: boolean; entityName: string; context: string } | null>(null);

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
        return gameState.history;
    }

    const startIndex = currentPage * turnsPerPage;
    const endIndex = startIndex + turnsPerPage;
    
    const pageNarrationTurns = narrationTurns.slice(startIndex, endIndex);
    const turnsForPage: GameTurn[] = [];
    
    const historyIndexMap = new Map<GameTurn, number>();
    gameState.history.forEach((turn, index) => {
        historyIndexMap.set(turn, index);
    });

    pageNarrationTurns.forEach(narrationTurn => {
        const narrationIndex = historyIndexMap.get(narrationTurn);

        if (narrationIndex !== undefined && narrationIndex > 0) {
            const previousTurn = gameState.history[narrationIndex - 1];
            if (previousTurn && previousTurn.type === 'action') {
                if (turnsForPage.length === 0 || turnsForPage[turnsForPage.length - 1] !== previousTurn) {
                    turnsForPage.push(previousTurn);
                }
            }
        }
        turnsForPage.push(narrationTurn);
    });
    
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

  // --- ENTITY LOOKUP LOGIC ---

  const handleEntityClick = useCallback(async (name: string, context: string) => {
        const sanitizedName = sanitizeEntityName(name);
        const lowerName = sanitizedName.toLowerCase().trim();
        if (!lowerName) return;

        // Check pending list first
        if (gameState.pendingEntityLookups?.some(p => p.name === sanitizedName)) {
            setNotificationModal({ 
                isOpen: true, 
                title: 'Đang chờ cập nhật', 
                messages: [`Thông tin về "${sanitizedName}" đã được xếp hàng và sẽ được cập nhật sau lượt chơi tiếp theo.`] 
            });
            return;
        }

        // 1. TÌM KIẾM CỤC BỘ
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
            const affinityValue = (found as any).affinity;
            setEntityModalContent({
                title: found.name,
                description: (found as any).description || (found as any).personality || "Không có mô tả chi tiết.",
                type: (found as any).type || (found as any).status ? 'Nhiệm Vụ' : 'Thông tin',
                details: (found as any).details || (found as any).stats ? { stats: JSON.stringify((found as any).stats) } : undefined,
                questData: (found as any).status ? found : undefined,
                affinity: typeof affinityValue === 'number' ? affinityValue : undefined
            });
            return;
        }

        // 2. NẾU KHÔNG THẤY -> MỞ POPUP LỰA CHỌN
        setLookupChoiceState({ isOpen: true, entityName: sanitizedName, context });

  }, [gameState]);

  const processInstantLookup = async () => {
      if (!lookupChoiceState) return;
      const { entityName } = lookupChoiceState;
      setLookupChoiceState(null); // Close choice modal

      setEntityModalContent({ title: entityName, description: "", type: "Đang tra cứu...", isLoading: true });
        
      try {
          const aiGeneratedEntity = await aiService.generateEntityInfoOnTheFly(gameState, entityName);
          
          setEntityModalContent({
              title: aiGeneratedEntity.name,
              description: aiGeneratedEntity.description,
              type: aiGeneratedEntity.customCategory || aiGeneratedEntity.type || "Thông tin",
              details: aiGeneratedEntity.details,
              isLoading: false
          });

          // Lưu vào trí nhớ
          setGameState(prev => ({
              ...prev,
              discoveredEntities: [...(prev.discoveredEntities || []), aiGeneratedEntity]
          }));

      } catch (error) {
          console.error("Lỗi khi tra cứu thực thể bằng AI:", error);
          setEntityModalContent({
              title: entityName,
              description: "Không thể truy xuất thông tin thần thông lúc này. Có lẽ đây là một bí ẩn của thiên đạo.",
              type: "Lỗi",
              isLoading: false
          });
      }
  };

  const processLaterLookup = () => {
      if (!lookupChoiceState) return;
      const { entityName, context } = lookupChoiceState;
      setLookupChoiceState(null); // Close choice modal

      setGameState(prev => ({
          ...prev,
          pendingEntityLookups: [...(prev.pendingEntityLookups || []), { name: entityName, context }]
      }));

      handleShowNotification(`Đã thêm "${entityName}" vào hàng đợi. Thông tin sẽ được cập nhật sau lượt chơi tới.`, 'info');
  };

  // --- END ENTITY LOOKUP LOGIC ---

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
          const { finalState } = dispatchTags(gameState, stateChangingTags);
          
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
            const { finalState } = dispatchTags(updatedState, stateChangingTags);
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
        onFreePerson={() => {}}
      />
      <EncyclopediaModal isOpen={isEncyclopediaModalOpen} onClose={() => setIsEncyclopediaModalOpen(false)} gameState={gameState} setGameState={setGameState} onDeleteEntity={() => {}} />
      
      <ConfirmationModal isOpen={showExitConfirm} onClose={() => setShowExitConfirm(false)} onConfirm={onBack} title="Xác nhận thoát" message="Bạn có chắc chắn muốn thoát về màn hình chính? Dữ liệu chưa lưu sẽ bị mất." confirmLabel="Thoát" />
      <ConfirmationModal isOpen={showRestartConfirm} onClose={() => setShowRestartConfirm(false)} onConfirm={handleRestart} title="Xác nhận chơi lại" message="Bạn có chắc chắn muốn bắt đầu lại từ đầu? Mọi tiến trình hiện tại sẽ mất." confirmLabel="Chơi lại" />
      <ConfirmationModal isOpen={showUndoConfirm} onClose={() => setShowUndoConfirm(false)} onConfirm={handleUndo} title="Xác nhận lùi lượt" message="Bạn có chắc chắn muốn lùi lại 1 lượt chơi? Hành động này không thể hoàn tác." confirmLabel="Lùi lại" variant="warning" />

      {/* RENDER NEW MODAL HERE */}
      <LookupChoiceModal 
        isOpen={!!lookupChoiceState} 
        onClose={() => setLookupChoiceState(null)} 
        entityName={lookupChoiceState?.entityName || ''}
        context={lookupChoiceState?.context || ''}
        onLookupNow={processInstantLookup}
        onLookupLater={processLaterLookup}
      />

      {entityModalContent && (
        <EntityInfoModal 
            isOpen={true} 
            onClose={() => setEntityModalContent(null)} 
            title={entityModalContent.title} 
            description={entityModalContent.description} 
            type={entityModalContent.type}
            details={entityModalContent.details}
            questData={entityModalContent.questData}
            isLoading={entityModalContent.isLoading}
            affinity={entityModalContent.affinity}
        />
      )}

      <div className="lg:flex h-screen bg-slate-900 text-slate-200 font-sans lg:gap-4">
        <div className="flex-1 flex flex-col h-full p-2 sm:p-4 gap-2 sm:gap-4 lg:p-4 lg:pr-0">
            <header className="flex-shrink-0 bg-slate-800/50 p-2 rounded-lg flex justify-between">
                 <div className="flex items-center gap-2">
                    <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-200 bg-slate-700/80 hover:bg-slate-700 rounded-lg transition">
                        <Icon name="back" className="w-4 h-4"/> Home
                    </button>
                 </div>
                 <div className="lg:hidden">
                    <button onClick={() => setIsSidePanelOpen(true)}><Icon name="ellipsisVertical" className="w-6 h-6"/></button>
                 </div>
            </header>

            <main className="flex-1 flex flex-col bg-slate-800/50 rounded-lg p-2 sm:p-4 overflow-hidden relative">
              {isInitialLoading && ( <div className="absolute inset-0 bg-slate-800/80 flex items-center justify-center z-10">Loading...</div> )}
              {isArchetypeLoading && ( <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center z-[90]">
                  <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-purple-300 font-bold animate-pulse text-lg">Thiên Đạo Đang Thẩm Định Căn Cơ...</p>
              </div> )}
              
              <div className="relative flex-1 min-h-0 overflow-hidden">
                  <div 
                    ref={logContainerRef}
                    onScroll={handleScroll} 
                    className={`h-full overflow-y-auto pr-2 space-y-6 cursor-pointer relative group select-none md:select-text`}
                    onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.closest('button')) {
                            return;
                        }
                        handleOpenStoryLog();
                    }}
                    title="Bấm vào đây để xem toàn bộ nhật ký"
                  >
                    <div className="absolute top-0 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-slate-900/80 px-2 py-1 rounded text-xs text-slate-400 z-10">
                        <Icon name="expand" className="w-4 h-4 inline mr-1" /> Xem nhật ký
                    </div>

                    {currentTurns.map((turn, index) => (
                      <div key={index}>
                        {turn.type === 'narration' ? <FormattedNarration content={turn.content} statuses={gameState.playerStatus} pendingLookups={gameState.pendingEntityLookups} onEntityClick={handleEntityClick} /> : <div className="bg-blue-900/20 p-4 rounded text-slate-200 italic">{turn.content}</div>}
                      </div>
                    ))}
                    {isTurnLoading && (
                        <div className="flex items-center justify-center p-4 text-slate-400 italic">
                            <span>AI đang suy nghĩ...</span>
                            <div className="relative w-8 h-8 ml-2 flex items-center justify-center">
                                <div className="absolute inset-0 border-2 border-transparent border-t-white rounded-full animate-spin"></div>
                                <div className="absolute inset-0 border-2 border-slate-600 rounded-full opacity-50"></div>
                                <span className="text-xs font-mono text-white">{thinkingTimer}s</span>
                            </div>
                        </div>
                    )}
                    <div ref={logEndRef} />
                  </div>

                  <button
                    onClick={scrollToBottom}
                    className={`absolute bottom-4 right-4 p-2 bg-slate-700/80 hover:bg-slate-600 text-white rounded-full shadow-lg transition-all duration-300 z-20 transform ${showScrollButton ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
                    title="Cuộn xuống dưới cùng"
                  >
                    <Icon name="arrowDown" className="w-6 h-6" />
                  </button>
              </div>
              
              <div className="flex-shrink-0 mt-auto pt-3 border-t border-slate-700/50">
                
                {gameState.pendingCombat && !gameState.playerStats.isInCombat ? (
                    <div className="bg-blue-950/80 border-2 border-blue-500/50 rounded-xl p-6 mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                        <div className="flex flex-col items-center text-center">
                            <div className="mb-4 p-3 bg-blue-500/20 rounded-full">
                                <Icon name="warning" className="w-8 h-8 text-blue-400 animate-pulse" />
                            </div>
                            
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-4 italic">
                                Sát khí nồng đậm - Trận chiến bắt đầu!
                            </h3>

                            {/* UX SAFEGUARD: Deep validation before combat start */}
                            {(() => {
                                const opponentIds = gameState.pendingCombat?.opponentIds || [];
                                const allAvailableEntities = [
                                    ...gameState.encounteredNPCs, 
                                    ...gameState.discoveredYeuThu,
                                    ...gameState.worldConfig.initialEntities
                                ];
                                
                                const validOpponents = opponentIds.map(idOrName => 
                                    allAvailableEntities.find(e => (e as any).id === idOrName || e.name === idOrName)
                                ).filter(Boolean);
                                
                                const isTribulation = opponentIds.some(id => String(id).includes('tribulation'));
                                const isDataMissing = opponentIds.length > 0 && validOpponents.length === 0 && !isTribulation;

                                return (
                                    <Button 
                                        onClick={() => !isDataMissing && setGameState(prev => ({ ...prev, playerStats: { ...prev.playerStats, isInCombat: true } }))}
                                        variant={isDataMissing ? "secondary" : "primary"}
                                        disabled={isDataMissing}
                                        className={`!w-1/3 min-w-[200px] mb-6 py-4 transition-all font-black text-lg border-2 ${
                                            isDataMissing 
                                            ? 'opacity-50 cursor-not-allowed grayscale' 
                                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/30 transform hover:scale-105 active:scale-95 border-white/20'
                                        }`}
                                    >
                                        {isDataMissing ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                                                ĐANG TRIỆU HỒI...
                                            </>
                                        ) : (
                                            <>
                                                <Icon name="play" className="w-6 h-6 mr-2" />
                                                BẮT ĐẦU CHIẾN ĐẤU
                                            </>
                                        )}
                                    </Button>
                                );
                            })()}

                            <div className="w-full">
                                <p className="text-xs text-blue-300/70 uppercase font-bold tracking-[0.2em] mb-2">Đang đối đầu với:</p>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {gameState.pendingCombat.opponentIds.map(idOrName => {
                                        const npc = [...gameState.encounteredNPCs, ...gameState.discoveredYeuThu, ...gameState.worldConfig.initialEntities].find(n => (n as any).id === idOrName || n.name === idOrName);
                                        return (
                                            <span key={idOrName} className={`text-sm font-bold px-4 py-1.5 rounded-lg shadow-md border ${
                                                npc ? 'text-white bg-blue-900/60 border-blue-400/30' : 'text-slate-500 bg-slate-800/40 border-slate-700 italic animate-pulse'
                                            }`}>
                                                {npc?.name || idOrName}
                                            </span>
                                        );
                                    })}
                                </div>
                                {gameState.pendingCombat.opponentIds.length > 0 && (
                                    <p className="mt-4 text-[10px] text-blue-400/50 italic">
                                        Hệ thống đang đồng bộ chỉ số thực thể. Vui lòng đợi trong giây lát...
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                                 {isTurnLoading && <span className="text-[10px] sm:text-xs text-fuchsia-400 animate-pulse">AI đang suy nghĩ...</span>}
                            </div>
                            <button 
                                onClick={() => setShowSuggestions(!showSuggestions)} 
                                className="flex items-center gap-1 text-[10px] sm:text-xs text-slate-400 hover:text-slate-200 bg-slate-800/80 px-2 py-1 rounded-full transition border border-slate-700"
                            >
                                <Icon name={showSuggestions ? 'arrowDown' : 'arrowUp'} className="w-3 h-3" />
                                {showSuggestions ? 'Ẩn Gợi ý' : 'Hiện Gợi ý'}
                            </button>
                        </div>

                        {showSuggestions && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mb-3 min-h-[100px] max-h-[30vh] overflow-y-auto custom-scrollbar">
                                {(gameState.suggestions && gameState.suggestions.length > 0) ? (
                                    gameState.suggestions.map((s, i) => <SuggestionCard key={i} index={i} suggestion={s} onSelect={handleActionSubmit}/>)
                                ) : (
                                    <div className="col-span-1 lg:col-span-2 flex items-center justify-center h-full text-slate-500 text-sm italic py-4 bg-slate-800/30 rounded border border-slate-700/50">
                                        Không có gợi ý khả dụng lúc này.
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="flex items-stretch gap-2"> 
                            <textarea 
                                value={playerInput} 
                                onChange={(e) => setPlayerInput(e.target.value)} 
                                disabled={isLoadingCombined}
                                className="flex-1 bg-slate-900/70 border border-slate-700 rounded-lg p-3 text-sm focus:ring-1 focus:ring-blue-500 disabled:opacity-50" 
                                rows={1} 
                                placeholder="Nhập hành động..." 
                            /> 
                            <Button 
                                onClick={() => handleActionSubmit(playerInput)} 
                                disabled={isLoadingCombined} 
                                variant="primary" 
                                className="!w-auto !px-4"
                            >
                                Gửi
                            </Button> 
                        </div>
                    </>
                )}
              </div>
            </main>
        </div>

        <aside className="w-[320px] xl:w-[350px] flex-shrink-0 h-full hidden lg:flex flex-col p-4 pl-0">
            <DashboardSidebar />
        </aside>
      </div>
      
      <div className={`fixed inset-0 z-40 lg:hidden ${isSidePanelOpen ? 'bg-black/60' : 'pointer-events-none bg-transparent'}`} onClick={() => setIsSidePanelOpen(false)}></div>
      <div className={`fixed top-0 right-0 h-full w-4/5 max-w-xs bg-slate-800 z-50 transition-transform ${isSidePanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <DashboardSidebar />
      </div>
    </>
  );
};

export default GameplayScreen;
