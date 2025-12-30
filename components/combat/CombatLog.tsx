import React, { useEffect, useRef } from 'react';
import { CombatLogEntry } from '../../types/combat';
import Spinner from '../ui/Spinner';

interface CombatLogProps {
    messages: CombatLogEntry[];
    isLoading: boolean;
}

export const CombatLog: React.FC<CombatLogProps> = ({ messages, isLoading }) => {
    const logEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const getMessageColor = (type: CombatLogEntry['type']) => {
        switch (type) {
            case 'player': return 'text-yellow-400 font-bold'; 
            case 'ally': return 'text-green-400';   
            case 'enemy': return 'text-red-400';    
            case 'info': return 'text-cyan-300 italic';
            case 'system': return 'text-slate-500 text-xs';
            default: return 'text-gray-400'; 
        }
    };

    return (
        <div className="bg-slate-900/90 rounded-xl p-4 flex-grow overflow-y-auto custom-scrollbar h-full border border-slate-700 shadow-inner">
            <div className="space-y-2 text-sm sm:text-base font-marcellus">
                {messages.map((msg) => (
                    <p key={msg.id} className={`leading-relaxed border-b border-white/5 pb-1 ${getMessageColor(msg.type)}`}>
                        {msg.text}
                    </p>
                ))}
                {isLoading && (
                    <div className="flex justify-center pt-2">
                        <Spinner text="Tính toán..." />
                    </div>
                )}
            </div>
            <div ref={logEndRef}></div>
        </div>
    );
};
