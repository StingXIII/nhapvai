import React, { useState, useEffect } from 'react';
import { 
    KnowledgeBase, 
    CombatDispositionMap, 
    CombatEndPayload, 
    Combatant,
    DefeatedEntity
} from '../types';
import { useCombatEngine } from '../hooks/useCombatEngine';
import { useCombatVfx } from '../hooks/useCombatVfx';
import { CombatLog } from './combat/CombatLog';
import { ActionPanel } from './combat/ActionPanel';
import { PostCombatDecisionModal } from './combat/PostCombatDecisionModal';
import OpponentStatsPanel from './gameplay/OpponentStatsPanel';
import PlayerCombatPanel from './gameplay/PlayerCombatPanel';
import Modal from './ui/Modal'; 
import Button from './common/Button';

interface CombatScreenProps {
    knowledgeBase: KnowledgeBase;
    onCombatEnd: (result: CombatEndPayload) => Promise<void>;
    setKnowledgeBase: (kb: KnowledgeBase) => void;
    setCombatMode: (mode: 'online' | 'offline') => void;
}

const CombatScreen: React.FC<CombatScreenProps> = ({ 
    knowledgeBase, 
    onCombatEnd 
}) => {
    // 1. Logic Hooks
    const { floatingVfx, triggerVfx } = useCombatVfx();
    const {
        playerParty,
        opponents,
        messages,
        isLoading,
        outcome,
        actingId,
        isPlayerTurn,
        handlePlayerAction,
        combatInventory
    } = useCombatEngine(knowledgeBase, onCombatEnd, triggerVfx);

    // 2. UI Local States
    const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
    const [isDispositionModalOpen, setIsDispositionModalOpen] = useState(false);
    const [isProcessingEnd, setIsProcessingEnd] = useState(false);
    const [resultModal, setResultModal] = useState<{isOpen: boolean, message: string} | null>(null);

    // 3. Side Effects for Outcome
    useEffect(() => {
        if (outcome === 'victory') {
            setIsDispositionModalOpen(true);
        } else if (outcome === 'defeat') {
            setResultModal({ isOpen: true, message: 'Bạn đã bị đánh bại!' });
        } else if (outcome === 'escaped') {
            setResultModal({ isOpen: true, message: 'Bạn đã bỏ chạy thành công.' });
        }
    }, [outcome]);

    // 4. Action Handlers
    const handleFinishCombat = async (dispositions: CombatDispositionMap = {}) => {
        setIsProcessingEnd(true);
        const player = playerParty.find(c => c.id === 'player');
        
        const payload: CombatEndPayload = {
            outcome: outcome!,
            summary: messages.map(m => m.text).join('\n'), 
            finalPlayerState: { 
                sinhLuc: player?.currentHp, 
                linhLuc: player?.currentMp 
            },
            dispositions,
            opponentIds: knowledgeBase.pendingCombat?.opponentIds || [],
            finalInventory: combatInventory,
            finalAlliesStatus: playerParty.filter(c => c.id !== 'player').map(c => ({ 
                id: c.id, hp: c.currentHp, mp: c.currentMp 
            })),
            finalOpponentsStatus: opponents.map(c => ({ 
                id: c.id, hp: c.currentHp, mp: c.currentMp 
            })),
        };
        await onCombatEnd(payload);
    };

    return (
        <div className="h-screen w-screen bg-[#0a0c14] flex flex-col p-2 sm:p-4 text-slate-100 font-sans relative overflow-hidden">
            {/* VFX Overlay */}
            <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
                {floatingVfx.map(vfx => (
                    <div 
                        key={vfx.id} 
                        className={`absolute font-black text-3xl animate-float-up ${vfx.type === 'damage' ? 'text-red-500' : 'text-green-400'}`} 
                        style={{ left: vfx.x, top: vfx.y }}
                    >
                        {vfx.text}
                    </div>
                ))}
            </div>

            {/* Header */}
            <header className="mb-2 flex justify-between items-center shrink-0 bg-slate-800/50 p-2 rounded-xl border border-white/5">
                <h1 className="text-xl sm:text-2xl font-black text-red-500 uppercase italic tracking-tighter">Vanguard Arena</h1>
                <div className="text-[10px] font-mono bg-black/40 px-3 py-1 rounded-full text-slate-400 border border-white/10 italic">
                    Engine Version: Turn-Based v3.0
                </div>
            </header>

            {/* Main Combat Layout */}
            <div className="flex flex-col gap-3 flex-grow overflow-hidden">
                {/* Opponents Section */}
                <OpponentStatsPanel 
                    opponents={opponents} 
                    actingId={actingId} 
                    selectedTargetId={selectedTargetId} 
                    onTargetSelect={setSelectedTargetId} 
                />
                
                {/* Log Section */}
                <div className="flex-grow min-h-0">
                    <CombatLog messages={messages} isLoading={isLoading} />
                </div>
                
                {/* Control Section */}
                <div className="flex-shrink-0 grid grid-cols-1 lg:grid-cols-12 gap-3 h-auto lg:h-48">
                    {/* Player Party Panel */}
                    <div className="lg:col-span-4 h-full">
                        <PlayerCombatPanel 
                            party={playerParty} 
                            actingId={actingId} 
                            selectedTargetId={null} 
                            onTargetSelect={() => {}} 
                        />
                    </div>
                    
                    {/* Command Interface */}
                    <div className="lg:col-span-8">
                        <ActionPanel 
                            isPlayerTurn={isPlayerTurn}
                            isActing={!!actingId}
                            onAction={(type) => handlePlayerAction(type, selectedTargetId || undefined)}
                        />
                    </div>
                </div>
            </div>

            {/* Modals */}
            <PostCombatDecisionModal 
                isOpen={isDispositionModalOpen} 
                onClose={() => setIsDispositionModalOpen(false)} 
                defeatedEntities={opponents.filter(c => c.currentHp <= 0).map(c => ({
                    id: c.id,
                    name: c.name,
                    entityType: c.entityType as any,
                    realm: c.realm
                }))}
                onConfirm={(d) => {
                    setIsDispositionModalOpen(false);
                    handleFinishCombat(d);
                }} 
                isLoading={isProcessingEnd} 
            />
            
            {resultModal?.isOpen && (
                <Modal isOpen={true} onClose={() => handleFinishCombat()} title="Kết Quả Trận Đấu">
                    <div className="p-4 text-center">
                        <p className="text-xl text-slate-200 mb-6">{resultModal.message}</p>
                        <Button onClick={() => handleFinishCombat()} variant="primary" className="!w-full !py-3">
                            Xác Nhận & Rời Khỏi
                        </Button>
                    </div>
                </Modal>
            )}

            <style>{`
                @keyframes float-up { 
                    0% { opacity: 0; transform: translateY(0); } 
                    20% { opacity: 1; } 
                    100% { opacity: 0; transform: translateY(-120px) scale(1.8); } 
                }
                .animate-float-up { animation: float-up 1s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
                
                .acting-player { 
                    transform: translateY(-40px) scale(1.1); 
                    transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); 
                    z-index: 50; 
                }
                .acting-enemy { 
                    transform: translateY(40px) scale(1.1); 
                    transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); 
                    z-index: 50; 
                }
                
                /* Custom scrollbar for combat UI */
                .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default CombatScreen;
