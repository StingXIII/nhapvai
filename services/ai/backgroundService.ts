
import { generateJson, setDebugContext, printRequestStats } from '../core/geminiClient';
import { GameState, GraphNode, GraphEdge, EncounteredNPC } from '../../types';
import { getPiggybackAnalysisPrompt } from '../../prompts/analysisPrompts';
import * as dbService from '../dbService';

// Cấu hình Flash cho tác vụ nền - Tiết kiệm tối đa
const backgroundConfig = {
    maxOutputTokens: 2048,
    thinkingBudget: 0, 
};

/**
 * Chạy phân tích nền (Asynchronous Piggyback).
 * Tăng delay lên 4 giây để đảm bảo API chính đã hoàn tất và Quota có thời gian "thở".
 */
export async function runPiggybackAnalysis(gameState: GameState, lastNarration: string, previousContextSummary: string) {
    if (!gameState.worldId) return;

    setTimeout(async () => {
        try {
            setDebugContext('Background Worker (Graph + EQ)');
            
            const { prompt, schema } = getPiggybackAnalysisPrompt(lastNarration, previousContextSummary);
            
            // Gọi Gemini Flash với retry 0 để tránh lãng phí quota nếu đang nghẽn
            const analysisResult = await generateJson<{
                nodes: GraphNode[],
                edges: GraphEdge[],
                eqUpdates: { npcName: string, emotion: string, value: number }[]
            }>(prompt, schema, undefined, 'gemini-2.5-flash', backgroundConfig, 0);

            if (!analysisResult) return;

            const worldId = gameState.worldId!;

            if (analysisResult.nodes && analysisResult.nodes.length > 0) {
                const nodesWithWorldId = analysisResult.nodes.map(n => ({ ...n, worldId }));
                await dbService.addGraphNodes(nodesWithWorldId);
            }

            if (analysisResult.edges && analysisResult.edges.length > 0) {
                const edgesWithWorldId = analysisResult.edges.map(e => ({ ...e, worldId }));
                await dbService.addGraphEdges(edgesWithWorldId);
            }

            console.groupCollapsed(`🧠 [BACKGROUND AI] Phân tích EQ & Graph (World ID: ${worldId})`);
            console.log(`[Nodes Found]: ${analysisResult.nodes?.length || 0}`);
            console.log(`[Edges Found]: ${analysisResult.edges?.length || 0}`);
            console.groupEnd();

            printRequestStats('Background Worker Completed');

        } catch (error) {
            console.warn('[Background Worker] Bỏ qua phân tích do giới hạn Quota hoặc lỗi mạng.');
        }
    }, 4000); // Đợi 4 giây sau khi narration hiện xong mới bắt đầu
}

export async function fetchGraphContext(worldId: number, entityNames: string[]): Promise<string> {
    if (!entityNames || entityNames.length === 0) return "";

    try {
        let graphContext = "";
        for (const name of entityNames) {
            const edgesSource = await dbService.getGraphEdgesBySource(worldId, name);
            const edgesTarget = await dbService.getGraphEdgesByTarget(worldId, name);
            const relevantEdges = [...edgesSource, ...edgesTarget];
            
            if (relevantEdges.length > 0) {
                graphContext += `Quan hệ của "${name}":\n`;
                relevantEdges.slice(0, 5).forEach(edge => {
                    graphContext += `- [${edge.source}] ${edge.relation} [${edge.target}] (${edge.description || ''})\n`;
                });
                graphContext += "\n";
            }
        }
        return graphContext;
    } catch (e) {
        return "";
    }
}
