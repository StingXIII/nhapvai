import React, { useState, useEffect, useRef } from 'react';

interface CounterMinigameProps {
  onComplete: (score: number) => void;
}

const TOTAL_POINTS = 10;
const BASE_POINT_DURATION = 850; // How long each point is visible (ms)
const PREVIEW_DURATION = 300; // How long the preview animation lasts

const CounterMinigame: React.FC<CounterMinigameProps> = ({ onComplete }) => {
  const [points, setPoints] = useState<{ id: number; x: number; y: number }[]>([]);
  const [activePointId, setActivePointId] = useState<number | null>(null);
  const [previewPointId, setPreviewPointId] = useState<number | null>(null); // New state for preview
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0); // Combo for speed increase
  const [gameState, setGameState] = useState<'playing' | 'success' | 'failed'>('playing');
  const timerRef = useRef<number | null>(null);

  // Calculate speed based on combo
  const pointDuration = BASE_POINT_DURATION * Math.pow(0.9, combo);

  // Generate points on mount
  useEffect(() => {
    const newPoints = Array.from({ length: TOTAL_POINTS }, (_, i) => {
        const radius = 45; // Max radius in % to keep points fully inside circle
        const r = radius * Math.sqrt(Math.random()); // sqrt for uniform distribution within the circle
        const theta = Math.random() * 2 * Math.PI;

        const x = 50 + r * Math.cos(theta);
        const y = 50 + r * Math.sin(theta);
        
        return { id: i, x, y };
    });
    setPoints(newPoints);
  }, []);

  // Game loop effect (modified for preview)
  useEffect(() => {
    if (gameState !== 'playing' || points.length === 0) {
      return;
    }

    if (currentIndex >= TOTAL_POINTS) {
      const success = score > 0;
      setGameState(success ? 'success' : 'failed');
      setTimeout(() => onComplete(score), 1200); // Pass the score
      return;
    }

    // Stage 1: Show preview
    setPreviewPointId(points[currentIndex].id);
    const previewTimer = setTimeout(() => {
        setPreviewPointId(null);
        
        // Stage 2: Show active point and start miss timer
        setActivePointId(points[currentIndex].id);
        timerRef.current = window.setTimeout(() => {
            setActivePointId(null); // Point disappears
            setCombo(0); // Reset combo on miss
            setCurrentIndex(prev => prev + 1); // Move to next point
        }, pointDuration);

    }, PREVIEW_DURATION);

    return () => {
      clearTimeout(previewTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, points, score, gameState, onComplete, pointDuration]);

  const handlePointClick = (id: number) => {
    if (id === activePointId && gameState === 'playing') {
      if (timerRef.current) clearTimeout(timerRef.current);
      setScore(s => s + 1);
      setCombo(c => c + 1); // Increment combo on success
      setActivePointId(null); // Point disappears on click
      setCurrentIndex(p => p + 1); // Move to next point immediately
    }
  };

  const renderResult = () => {
    if (gameState === 'success') {
      return (
        <div className="text-center">
          <h2 className="text-5xl font-bold text-green-400">THÀNH CÔNG!</h2>
          <p className="text-xl text-white mt-2">Phản Sát Hộ Thể X{score} đã được kích hoạt!</p>
        </div>
      );
    }
    if (gameState === 'failed') {
      return (
        <div className="text-center">
          <h2 className="text-5xl font-bold text-red-500">THẤT BẠI!</h2>
          <p className="text-xl text-gray-400 mt-2">Bạn đã bỏ lỡ cơ hội.</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="text-center mb-4">
        <h2 className="text-3xl font-bold text-white">BẮT ĐIỂM SÁNG</h2>
        <p className="text-gray-300">Bắt càng nhiều điểm sáng, giảm sát thương càng nhiều!</p>
        <p className="text-xl font-mono text-amber-400 mt-2">Điểm: {score} / {TOTAL_POINTS} <span className="text-sm text-cyan-400">(Tốc độ: {100 + combo * 10}%)</span></p>
      </div>

      <div className="relative w-[90vw] h-[90vw] max-w-[850px] max-h-[850px] sm:w-[850px] sm:h-[850px] rounded-full bg-gray-800/50 border-2 border-gray-600 overflow-hidden cursor-crosshair">
        {gameState === 'playing' ? (
          <>
            {/* Preview Animations */}
            {points.map(point => (
              <div
                key={`preview-${point.id}`}
                className={`absolute w-12 h-12 rounded-full border-4 border-cyan-300 ${previewPointId === point.id ? 'animate-expand-fade' : 'opacity-0'}`}
                style={{ left: `${point.x}%`, top: `${point.y}%` }}
              />
            ))}
            {/* Clickable Points */}
            {points.map(point => (
              <div
                key={point.id}
                className={`absolute w-12 h-12 rounded-full bg-cyan-400 shadow-[0_0_15px_cyan] transition-opacity duration-150 ${activePointId === point.id ? 'opacity-100' : 'opacity-0'}`}
                style={{ left: `${point.x}%`, top: `${point.y}%`, transform: 'translate(-50%, -50%)' }}
                onClick={() => handlePointClick(point.id)}
              />
            ))}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center animate-in fade-in duration-500">
            {renderResult()}
          </div>
        )}
      </div>
    </div>
  );
};

export default CounterMinigame;