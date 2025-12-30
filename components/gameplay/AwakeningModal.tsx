
import React, { useEffect, useState } from 'react';
import { AwakeningResult } from '../../types';
import Button from '../common/Button';
import Icon from '../common/Icon';

interface AwakeningModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  result: AwakeningResult | null;
}

const StatBar: React.FC<{ label: string; value: number; color: string; icon: string }> = ({ label, value, color, icon }) => {
    // Max value is 20 based on the prompt
    const percentage = Math.min(100, (value / 20) * 100);
    
    return (
        <div className="mb-4">
            <div className="flex justify-between items-end mb-1">
                <div className="flex items-center gap-2">
                    <span className={`text-${color}-400`}><Icon name={icon as any} className="w-5 h-5"/></span>
                    <span className="font-bold text-slate-200 text-sm uppercase tracking-wider">{label}</span>
                </div>
                <span className={`font-mono font-bold text-${color}-400 text-lg`}>{value}</span>
            </div>
            <div className="w-full bg-slate-800/50 h-3 rounded-full overflow-hidden border border-slate-700">
                <div 
                    className={`h-full bg-${color}-500 shadow-[0_0_10px_currentColor] transition-all duration-1000 ease-out`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
};

const AwakeningModal: React.FC<AwakeningModalProps> = ({ isOpen, onConfirm, result }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isOpen) {
        setIsVisible(true);
        // Delay content animation for dramatic effect
        setTimeout(() => setShowContent(true), 500);
    } else {
        setIsVisible(false);
        setShowContent(false);
    }
  }, [isOpen]);

  if (!isVisible || !result) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px] animate-pulse"></div>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent shadow-[0_0_20px_purple]"></div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent shadow-[0_0_20px_cyan]"></div>
      </div>

      <div 
        className={`relative w-full max-w-2xl bg-slate-900/80 border border-purple-500/50 rounded-2xl p-8 shadow-[0_0_50px_rgba(168,85,247,0.3)] transform transition-all duration-700 ${showContent ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-10'}`}
      >
        {/* Header */}
        <div className="text-center mb-8">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-[0.3em] mb-2 animate-pulse">Hệ Thống Thức Tỉnh</h3>
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 font-playfair drop-shadow-lg">
                {result.title}
            </h1>
            <div className="w-32 h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent mx-auto mt-4"></div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left: Stats */}
            <div className="space-y-2 bg-slate-800/40 p-5 rounded-xl border border-slate-700/50">
                <StatBar 
                    label="Sức Mạnh (STR)" 
                    value={result.stats.str} 
                    color="red" 
                    icon="play" // Using play as generic sword/attack icon replacement
                />
                <StatBar 
                    label="Thân Pháp (AGI)" 
                    value={result.stats.agi} 
                    color="green" 
                    icon="wind" // Fallback icon name, will render default or need update in Icon.tsx
                />
                <StatBar 
                    label="Trí Tuệ (INT)" 
                    value={result.stats.int} 
                    color="blue" 
                    icon="magic" 
                />
                <div className="mt-4 pt-4 border-t border-slate-700/50 text-xs text-slate-400 italic text-center">
                    *Chỉ số được tính toán dựa trên hành vi của bạn từ đầu game.
                </div>
            </div>

            {/* Right: Analysis */}
            <div className="flex flex-col justify-center space-y-4">
                <div className="bg-purple-900/20 p-4 rounded-lg border-l-4 border-purple-500">
                    <h4 className="text-purple-300 font-bold mb-1 text-sm uppercase">Căn Cơ & Tính Cách</h4>
                    <p className="text-slate-200 text-sm leading-relaxed italic">
                        "{result.description}"
                    </p>
                </div>
                
                <div className="bg-cyan-900/20 p-4 rounded-lg border-l-4 border-cyan-500">
                    <h4 className="text-cyan-300 font-bold mb-1 text-sm uppercase">Lời Bình Của Thiên Đạo</h4>
                    <p className="text-slate-200 text-sm leading-relaxed">
                        {result.summary}
                    </p>
                </div>
            </div>
        </div>

        {/* Footer Action */}
        <div className="mt-10 flex justify-center">
            <Button 
                onClick={onConfirm} 
                variant="special"
                className="!w-auto !px-10 !py-4 !text-lg !font-black !tracking-widest shadow-[0_0_20px_rgba(168,85,247,0.5)] hover:scale-105 transition-transform"
            >
                THỨC TỈNH SỨC MẠNH
            </Button>
        </div>

      </div>
    </div>
  );
};

export default AwakeningModal;
