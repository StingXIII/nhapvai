import React, { useState, useEffect, useRef } from 'react';

interface BlackFlashGameProps {
  onComplete: (success: boolean) => void;
  multiplier: number;
  combo: number;
}

const BlackFlashGame: React.FC<BlackFlashGameProps> = ({ onComplete, multiplier, combo }) => {
  const [scale, setScale] = useState(2.5); // Start large
  const [gameState, setGameState] = useState<'playing' | 'success' | 'failed'>('playing');
  const reqRef = useRef<number>();
  const startTimeRef = useRef<number | null>(null);
  
  // Configuration
  const TARGET_SCALE = 1.0;
  const TOLERANCE = 0.15; // +/- 0.15 scale diff is accepted
  const BASE_SHRINK_DURATION = 800; // ms
  const shrinkDuration = BASE_SHRINK_DURATION * Math.pow(0.9, combo); // Decrease duration by 10% per combo point

  useEffect(() => {
    const animate = (time: number) => {
      if (!startTimeRef.current) startTimeRef.current = time;
      const progress = (time - startTimeRef.current) / shrinkDuration;
      
      // Linear shrink for simplicity, visualised as scale
      // Start at 2.5, aim for 1.0
      const newScale = 2.5 - (1.5 * progress);

      if (newScale <= 0.2) {
        // Missed (too small)
        handleFinish(false);
        return;
      }

      setScale(newScale);
      reqRef.current = requestAnimationFrame(animate);
    };

    reqRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(reqRef.current!);
  }, [shrinkDuration]);

  const handleFinish = (success: boolean) => {
    if (gameState !== 'playing') return;
    cancelAnimationFrame(reqRef.current!);
    setGameState(success ? 'success' : 'failed');
    
    // Delay slightly to show result before closing
    setTimeout(() => {
      onComplete(success);
    }, 800);
  };

  const handleClick = () => {
    if (gameState !== 'playing') return;

    const diff = Math.abs(scale - TARGET_SCALE);
    if (diff <= TOLERANCE) {
      handleFinish(true);
    } else {
      handleFinish(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 cursor-crosshair overflow-hidden"
      onMouseDown={handleClick}
      onTouchStart={handleClick}
    >
      {/* Text Effects */}
      <div className="absolute top-1/4 text-center pointer-events-none">
        <h2 className={`text-5xl font-black tracking-widest uppercase italic transition-all duration-200 ${
            gameState === 'playing' ? 'text-gray-600 opacity-50' : 
            gameState === 'success' ? 'text-red-500 scale-150 text-shadow-neon' : 'text-gray-700'
        }`}>
            {gameState === 'success' ? 'HẮC THIỂM' : gameState === 'failed' ? 'TRƯỢT' : 'BLACK FLASH'}
        </h2>
        {gameState === 'success' && <p className="text-red-300 mt-2 font-bold text-xl animate-pulse">SÁT THƯƠNG X{multiplier}!</p>}
      </div>

      {/* Game Container */}
      <div className="relative w-64 h-64 flex items-center justify-center">
        
        {/* Static Target Ring */}
        <div className={`absolute w-full h-full rounded-full border-4 ${
            gameState === 'success' ? 'border-red-500 shadow-[0_0_30px_red]' : 'border-white/30'
        }`}></div>

        {/* Target Core */}
        <div className={`absolute w-2 h-2 rounded-full ${
            gameState === 'success' ? 'bg-black shadow-[0_0_20px_red]' : 'bg-white'
        }`}></div>

        {/* Shrinking Ring */}
        <div 
            className={`absolute w-full h-full rounded-full border-4 transition-colors duration-75 ${
                gameState === 'success' ? 'border-black bg-red-600 mix-blend-screen' : 
                gameState === 'failed' ? 'border-gray-600 opacity-20' : 'border-red-600 shadow-[0_0_15px_red]'
            }`}
            style={{ 
                transform: `scale(${scale})`,
                opacity: gameState === 'playing' ? 1 : 0.8
            }}
        ></div>
        
        {/* Distorted Sparks (Visual Flair) */}
        {gameState === 'success' && (
            <>
                <div className="absolute inset-0 bg-red-500/20 animate-ping rounded-full"></div>
                <div className="absolute w-[150%] h-[2px] bg-black rotate-45"></div>
                <div className="absolute w-[150%] h-[2px] bg-black -rotate-45"></div>
            </>
        )}

      </div>
      
      <p className="absolute bottom-10 text-gray-400 text-sm animate-pulse pointer-events-none">
        Nhấn khi vòng đỏ chạm vòng trắng!
      </p>
    </div>
  );
};

export default BlackFlashGame;