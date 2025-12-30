import React from 'react';
import { Combatant } from '../../types';

const PartyMemberCard: React.FC<{
    member: Combatant;
    isSelected: boolean;
    isActing: boolean;
    onSelect: (id: string) => void;
}> = ({ member, isSelected, isActing, onSelect }) => {
    const isPlayer = member.entityType === 'player';
    const hpPercent = (member.currentHp / (member.maxHp || 1)) * 100;
    const mpPercent = (member.currentMp / (member.maxMp || 1)) * 100;
    
    let borderColor = isPlayer ? 'border-green-500/50' : 'border-sky-500/50';
    let hpColor = isPlayer ? 'from-green-600 to-emerald-400' : 'from-sky-600 to-blue-400';

    return (
        <div 
            id={`combatant-${member.id}`}
            className={`w-36 sm:w-44 flex-shrink-0 p-3 bg-slate-800/90 rounded-2xl border transition-all duration-300 relative cursor-pointer
                        ${borderColor}
                        ${isSelected ? 'ring-2 ring-yellow-400 border-yellow-400' : ''}
                        ${isActing ? 'acting-player ring-4 ring-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.6)]' : ''}`}
            onClick={() => !isPlayer && onSelect(member.id)}
        >
            <div className="flex justify-between items-center mb-2">
                <span className="font-black text-slate-100 text-sm truncate uppercase tracking-tighter">{member.name}</span>
            </div>
            
            <div className="space-y-1.5 pointer-events-none">
                {/* HP Bar with Text Overlay */}
                <div className="w-full bg-black/40 rounded-full h-4 border border-white/5 overflow-hidden shadow-inner relative">
                    <div className={`bg-gradient-to-r ${hpColor} h-full transition-all duration-300`} style={{ width: `${hpPercent}%` }}></div>
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                        {Math.round(member.currentHp)}/{Math.round(member.maxHp)}
                    </div>
                </div>

                {/* MP Bar with Text Overlay */}
                <div className="w-full bg-black/40 rounded-full h-4 border border-white/5 overflow-hidden shadow-inner relative">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-400 h-full transition-all duration-300" style={{ width: `${mpPercent}%` }}></div>
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                        {Math.round(member.currentMp)}/{Math.round(member.maxMp)}
                    </div>
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold font-mono mt-1.5">
                    <span>Tấn công: {Math.round(member.attack)}</span>
                    <span>Tốc độ: {Math.round(member.speed)}</span>
                </div>
            </div>
            
            {member.currentHp <= 0 && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] rounded-2xl flex items-center justify-center">
                    <span className="text-red-500 font-black text-[10px] uppercase tracking-tighter">Bất Tỉnh</span>
                </div>
            )}
        </div>
    );
};

const PlayerCombatPanel: React.FC<{
  party: Combatant[];
  actingId: string | null;
  selectedTargetId: string | null;
  onTargetSelect: (id: string) => void;
}> = ({ party, actingId, selectedTargetId, onTargetSelect }) => {
    return (
        <div className="p-3 bg-white/5 rounded-2xl border border-white/5 h-full backdrop-blur-sm shadow-xl">
            <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-1">
               {party.map(member => (
                   <PartyMemberCard 
                        key={member.id} 
                        member={member} 
                        isActing={actingId === member.id}
                        isSelected={selectedTargetId === member.id}
                        onSelect={onTargetSelect}
                    />
               ))}
            </div>
        </div>
    );
};

export default PlayerCombatPanel;
