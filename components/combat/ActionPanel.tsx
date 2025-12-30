import React from 'react';
import Button from '../common/Button';
import Icon from '../common/Icon';

interface ActionPanelProps {
    isPlayerTurn: boolean;
    isActing: boolean;
    onAction: (type: 'attack' | 'flee') => void;
}

export const ActionPanel: React.FC<ActionPanelProps> = ({ isPlayerTurn, isActing, onAction }) => {
    return (
        <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 shadow-2xl relative overflow-hidden h-full flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Mệnh Lệnh Hành Động</h4>
                {isPlayerTurn && (
                    <span className="text-[10px] bg-yellow-400 text-black px-3 py-1 rounded-full font-black animate-pulse shadow-[0_0_15px_rgba(250,204,21,0.6)]">
                        LƯỢT CỦA BẠN
                    </span>
                )}
            </div>

            <div className="flex-grow grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Button 
                    variant="primary" 
                    onClick={() => onAction('attack')} 
                    disabled={!isPlayerTurn || isActing} 
                    className={`!py-4 !text-sm border-b-4 border-red-800 active:border-b-0 transition-all ${!isPlayerTurn ? 'opacity-30 grayscale' : 'hover:scale-105'}`}
                >
                    <Icon name="play" className="w-5 h-5 mr-2"/> TẤN CÔNG
                </Button>
                
                <Button variant="info" onClick={() => {}} disabled={true} className="!py-4 !text-sm opacity-30 grayscale cursor-not-allowed">KỸ NĂNG</Button>
                <Button variant="secondary" onClick={() => {}} disabled={true} className="!py-4 !text-sm opacity-30 grayscale cursor-not-allowed">VẬT PHẨM</Button>
                
                <Button 
                    variant="warning" 
                    onClick={() => onAction('flee')} 
                    disabled={!isPlayerTurn || isActing} 
                    className={`!py-4 !text-sm border-b-4 border-amber-800 active:border-b-0 transition-all ${!isPlayerTurn ? 'opacity-30 grayscale' : 'hover:scale-105'}`}
                >
                    BỎ CHẠY
                </Button>
            </div>
            
            {!isActing && isPlayerTurn && (
                <div className="mt-3 text-[10px] text-yellow-400/80 italic text-center animate-bounce">
                    * Hãy chọn 1 kẻ địch phía trên và nhấn "TẤN CÔNG" để ra chiêu.
                </div>
            )}
        </div>
    );
};
