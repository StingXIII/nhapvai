import React from 'react';
import { Combatant } from '../../types';
import { VIETNAMESE } from '../../constants';

const OpponentCard: React.FC<{
    opponent: Combatant;
    isSelected: boolean;
    isActing: boolean;
    onSelect: (id: string) => void;
}> = ({ opponent, isSelected, isActing, onSelect }) => {
    const hpPercent = (opponent.currentHp / (opponent.maxHp || 1)) * 100;

    return (
        <div
            id={`combatant-${opponent.id}`}
            className={`w-36 sm:w-44 flex-shrink-0 p-3 bg-slate-800/90 rounded-2xl border transition-all duration-300 cursor-pointer relative
                        ${isSelected ? 'ring-2 ring-red-500 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'border-slate-700 hover:border-slate-500'}
                        ${isActing ? 'acting-enemy ring-4 ring-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.6)]' : ''}`}
            onClick={() => onSelect(opponent.id)}
        >
            <div className="flex justify-between items-center mb-2">
                <span className="font-black text-slate-100 text-sm truncate uppercase tracking-tighter">{opponent.name}</span>
            </div>
            
            <div className="space-y-2 pointer-events-none">
                {/* HP Bar with Text Overlay */}
                <div className="w-full bg-black/40 rounded-full h-4 border border-white/5 overflow-hidden shadow-inner relative">
                    <div className="bg-gradient-to-r from-red-600 to-red-400 h-full transition-all duration-300" style={{ width: `${hpPercent}%` }}></div>
                     <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                        {Math.round(opponent.currentHp)}/{Math.round(opponent.maxHp)}
                    </div>
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold font-mono mt-1">
                    <span>Tấn Công: {Math.round(opponent.attack)}</span>
                    <span>Tốc Độ: {Math.round(opponent.speed)}</span>
                </div>
            </div>

            {opponent.currentHp <= 0 && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] rounded-2xl flex items-center justify-center border-2 border-slate-700">
                    <span className="text-red-600 font-black text-xs uppercase tracking-widest rotate-12">Bị Đánh Bại</span>
                </div>
            )}
        </div>
    );
};

interface OpponentStatsPanelProps {
    opponents: Combatant[];
    actingId: string | null;
    selectedTargetId: string | null;
    onTargetSelect: (opponentId: string) => void;
}

const OpponentStatsPanel: React.FC<OpponentStatsPanelProps> = ({ opponents, actingId, selectedTargetId, onTargetSelect }) => {
    if (!opponents || opponents.length === 0) {
        return <div className="p-3 bg-slate-800 rounded-lg"><p className="text-slate-400 italic text-xs">{VIETNAMESE.noOpponents}</p></div>;
    }
    return (
        <div className="p-3 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm shadow-xl">
            <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-1">
                {opponents.map(opp => (
                   <OpponentCard 
                        key={opp.id} 
                        opponent={opp} 
                        isActing={actingId === opp.id}
                        isSelected={selectedTargetId === opp.id} 
                        onSelect={onTargetSelect} 
                    />
                ))}
            </div>
        </div>
    );
};

export default OpponentStatsPanel;
