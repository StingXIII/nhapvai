import React, { useState, useEffect, useRef } from 'react';
import { GameState, AwakeningResult, GameMessage } from '../../types';
import { analyzePlayerArchetype } from '../../services/ai/archetypeService';

export const useArchetypeSystem = (
    gameState: GameState,
    setGameState: React.Dispatch<React.SetStateAction<GameState>>,
    addMessageAndUpdateState: (msgs: GameMessage[], kb: GameState) => void
) => {
    const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
    const [awakeningResult, setAwakeningResult] = useState<AwakeningResult | null>(null);
    const [isAwakeningModalOpen, setIsAwakeningModalOpen] = useState(false);
    const analysisTriggeredRef = useRef(false);

    // Trigger at turn 50
    useEffect(() => {
        const turn = gameState.playerStats.turn;
        const hasAwakened = gameState.archetype?.awakened;
        
        // Chỉ kích hoạt khi đạt đúng lượt 50 (hoặc hơn một chút nếu bị skip), chưa thức tỉnh, và chưa chạy analysis
        if (turn >= 50 && !hasAwakened && !isAnalysisLoading && !awakeningResult && !analysisTriggeredRef.current) {
            const logs = gameState.rawActionLog || [];
            // Đảm bảo có đủ dữ liệu để phân tích (ít nhất 10 hành động)
            if (logs.length > 10) {
                analysisTriggeredRef.current = true;
                performAnalysis(logs);
            }
        }
    }, [gameState.playerStats.turn, gameState.archetype, gameState.rawActionLog]);

    const performAnalysis = async (logs: string[]) => {
        setIsAnalysisLoading(true);
        try {
            const result = await analyzePlayerArchetype(logs);
            setAwakeningResult(result);
            setIsAwakeningModalOpen(true);
        } catch (error) {
            console.error("Failed to analyze archetype", error);
            // Reset trigger if failed so it can try again later or we handle error gracefully
            analysisTriggeredRef.current = false;
        } finally {
            setIsAnalysisLoading(false);
        }
    };

    const handleConfirmAwakening = () => {
        if (!awakeningResult) return;

        // Clone state deeply enough for stats
        const newGameState = JSON.parse(JSON.stringify(gameState));
        
        // 1. Apply Stats
        if (!newGameState.playerStats.coreAttributes) {
            newGameState.playerStats.coreAttributes = { str: 0, agi: 0, int: 0 };
        }
        newGameState.playerStats.coreAttributes.str += awakeningResult.stats.str;
        newGameState.playerStats.coreAttributes.agi += awakeningResult.stats.agi;
        newGameState.playerStats.coreAttributes.int += awakeningResult.stats.int;

        // 2. Set Archetype Data
        newGameState.archetype = {
            title: awakeningResult.title,
            description: awakeningResult.description,
            awakened: true
        };

        // 3. Add System Message
        const msg: GameMessage = {
            id: `awakening-${Date.now()}`,
            type: 'system',
            content: `*** THIÊN ĐẠO CHỨNG GIÁM ***\nChúc mừng! Bạn đã thức tỉnh căn cơ: [${awakeningResult.title}].\nChỉ số tiềm năng đã được cộng thêm: STR +${awakeningResult.stats.str}, AGI +${awakeningResult.stats.agi}, INT +${awakeningResult.stats.int}.`,
            timestamp: Date.now(),
            turnNumber: newGameState.playerStats.turn
        };

        addMessageAndUpdateState([msg], newGameState);
        setIsAwakeningModalOpen(false);
    };

    return {
        isAnalysisLoading,
        isAwakeningModalOpen,
        awakeningResult,
        handleConfirmAwakening
    };
};