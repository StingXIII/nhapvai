
// hooks/useCombatEngine.ts
import { useState, useEffect, useRef, useCallback, useMemo, ReactNode } from 'react';
import { 
    GameState, 
    Combatant, 
    CombatEndPayload, 
    OfflineCombatEffect, 
    CombatActionType,
    GameItem,
    PlayerStats
} from '../types';
import { CombatLogEntry, CombatOutcome } from '../types/combat';
import { 
    GAUGE_MAX, 
    TICK_MS, 
    GAUGE_SPEED_FACTOR, 
    AI_ATTACK_POWER, 
    BASE_ATTACK_POWER, 
    TURN_STEP_DELAY 
} from '../constants/combat';
import { DEFAULT_PLAYER_STATS } from '../constants/character';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const useCombatEngine = (
    knowledgeBase: GameState,
    onCombatEnd: (result: CombatEndPayload) => Promise<void>,
    triggerVfx: (targetId: string, text: ReactNode, type: any) => void
) => {
    const [combatants, setCombatants] = useState<Combatant[]>([]);
    const [messages, setMessages] = useState<CombatLogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [outcome, setOutcome] = useState<CombatOutcome>(null);
    const [actingId, setActingId] = useState<string | null>(null);
    const [isPlayerTurn, setIsPlayerTurn] = useState(false);
    const [isTimePaused, setIsTimePaused] = useState(false);
    const [combatInventory, setCombatInventory] = useState<GameItem[]>([]);

    const combatantsRef = useRef<Combatant[]>([]);
    const isLoopPausedRef = useRef(false);

    useEffect(() => {
        isLoopPausedRef.current = isTimePaused || isLoading || !!outcome;
    }, [isTimePaused, isLoading, outcome]);

    const addLog = useCallback((text: string, type: CombatLogEntry['type'] = 'system') => {
        setMessages(prev => [...prev, { id: `log-${Date.now()}-${Math.random()}`, text, type }]);
    }, []);

    const { playerParty, opponents } = useMemo(() => {
        const oIdSet = new Set(knowledgeBase.pendingCombat?.opponentIds || []);
        const party: Combatant[] = [];
        const opps: Combatant[] = [];
        combatants.forEach(c => {
            if (oIdSet.has(c.id)) opps.push(c);
            else party.push(c);
        });
        return { playerParty: party, opponents: opps };
    }, [combatants, knowledgeBase.pendingCombat]);

    // Initialize Engine
    useEffect(() => {
        if (knowledgeBase.pendingCombat && knowledgeBase.playerStats) {
            setCombatInventory(JSON.parse(JSON.stringify(knowledgeBase.inventory)));
            
            const p = knowledgeBase.playerStats;
            const player: Combatant = {
                id: 'player',
                entityType: 'player',
                name: knowledgeBase.character.name,
                stats: p,
                currentHp: p.sinhLuc,
                maxHp: p.maxSinhLuc,
                currentMp: p.linhLuc || 0,
                maxMp: p.maxLinhLuc || 0,
                attack: p.sucTanCong,
                defense: p.sucPhongNhu,
                speed: p.tocDo,
                currentStatusEffects: p.activeStatusEffects || [],
                actionGauge: 0,
                turnTaken: false,
            };

            const allies = (knowledgeBase.combatCompanionIds || []).map(id => {
                const data = [...knowledgeBase.encounteredNPCs, ...knowledgeBase.companions, ...knowledgeBase.wives, ...knowledgeBase.slaves].find(a => a.id === id);
                if (!data) return null;
                return {
                    ...data,
                    currentHp: data.stats?.sinhLuc || 100,
                    maxHp: data.stats?.maxSinhLuc || 100,
                    currentMp: data.stats?.linhLuc || 0,
                    maxMp: data.stats?.maxLinhLuc || 0,
                    attack: data.stats?.sucTanCong || 10,
                    defense: data.stats?.sucPhongNhu || 5,
                    speed: data.stats?.tocDo || 10,
                    currentStatusEffects: data.stats?.activeStatusEffects || [],
                    actionGauge: 0,
                    turnTaken: false
                } as Combatant;
            }).filter((c): c is Combatant => !!c);

            // --- OPONENTS RETRIEVAL WITH GHOST FALLBACK ---
            const opponentIds = knowledgeBase.pendingCombat.opponentIds || [];
            let opps = opponentIds.map(id => {
                // FIX: Cast to any in find callback to avoid property existence errors on InitialEntity union
                const data: any = [
                    ...knowledgeBase.encounteredNPCs, 
                    ...knowledgeBase.discoveredYeuThu, 
                    ...knowledgeBase.discoveredEntities,
                    ...knowledgeBase.worldConfig.initialEntities
                ].find((n: any) => n.id === id || n.name === id);
                
                if (!data) return null;
                
                // DATA INTEGRITY: Đảm bảo máu không được là 0 ngay lúc khởi tạo combat
                // FIX: data is cast to any so stats property access is allowed
                const maxHp = data.stats?.maxSinhLuc || 100;
                const currentHp = (data.stats?.sinhLuc && data.stats.sinhLuc > 0) ? data.stats.sinhLuc : maxHp;

                return {
                    ...data,
                    // FIX: access id via casted data
                    id: data.id || id,
                    currentHp,
                    maxHp,
                    // FIX: access mp/stats via casted data
                    currentMp: data.stats?.linhLuc || 0,
                    maxMp: data.stats?.maxLinhLuc || 0,
                    attack: data.stats?.sucTanCong || 10,
                    defense: data.stats?.sucPhongNhu || 5,
                    speed: data.stats?.tocDo || 10,
                    currentStatusEffects: data.stats?.activeStatusEffects || [],
                    actionGauge: 0,
                    turnTaken: false
                } as Combatant;
            }).filter((c): c is Combatant => !!c);

            // CƠ CHẾ PHỤC HỒI (GHOST FALLBACK): Nếu danh sách kẻ địch trống (do AI sai lệch ID)
            if (opps.length === 0 && opponentIds.length > 0) {
                console.warn("[CombatEngine] Không tìm thấy dữ liệu cho kẻ địch. Triệu hồi Hình Chiếu Ma Chướng.");
                const ghostId = opponentIds[0];
                const ghostStats: PlayerStats = {
                    ...DEFAULT_PLAYER_STATS,
                    sinhLuc: p.maxSinhLuc,
                    maxSinhLuc: p.maxSinhLuc,
                    sucTanCong: p.sucTanCong,
                    sucPhongNhu: p.sucPhongNhu,
                    tocDo: p.tocDo,
                    realm: p.realm
                };
                
                const ghost: Combatant = {
                    id: ghostId,
                    name: `[Hình Chiếu] ${ghostId}`,
                    entityType: 'npc',
                    currentHp: ghostStats.sinhLuc,
                    maxHp: ghostStats.maxSinhLuc,
                    currentMp: 50,
                    maxMp: 50,
                    attack: ghostStats.sucTanCong,
                    defense: ghostStats.sucPhongNhu,
                    speed: ghostStats.tocDo,
                    stats: ghostStats,
                    currentStatusEffects: [],
                    actionGauge: 0,
                    turnTaken: false,
                    description: "Một bóng ma ngưng tụ từ sát ý của đối thủ.",
                    personality: "Vô tình",
                    thoughtsOnPlayer: "Hủy diệt",
                    // FIX: Add missing 'affinity' and 'memoryFlags' properties to satisfy the EncounteredNPC type.
                    affinity: -100,
                    memoryFlags: {},
                };
                opps = [ghost];
                // Cập nhật lại ID trong pending để engine nhận diện được phe đối lập
                knowledgeBase.pendingCombat.opponentIds = [ghostId];
            }

            const all = [player, ...allies, ...opps];
            setCombatants(all);
            combatantsRef.current = all;
            addLog("Cuộc chiến bắt đầu!", "info");
            
            // Thông báo nếu cơ chế Ghost Fallback được kích hoạt
            if (opps.length > 0 && opps[0].name.startsWith('[Hình Chiếu]')) {
                addLog("Cảnh báo: Thực thể đối thủ bị nhiễu loạn, Thiên Đạo triệu hồi Hình Chiếu thay thế!", "system");
            }
            
            setIsLoading(false);
        }
    }, [knowledgeBase]);

    const applyEffect = async (effect: OfflineCombatEffect, source: Combatant, target: Combatant, actionName: string) => {
        let updated = [...combatantsRef.current];
        const sStats = source.stats;
        const tStats = target.stats;
        if (!sStats || !tStats) return;

        const logType = source.id === 'player' ? 'player' : (knowledgeBase.pendingCombat?.opponentIds.includes(source.id) ? 'enemy' : 'ally');

        setActingId(source.id);
        await delay(TURN_STEP_DELAY);

        if (effect.type === 'DAMAGE_HP') {
            const dmg = Math.max(1, Math.floor((effect.basePower || 10) + (sStats.sucTanCong || 10) - (tStats.sucPhongNhu || 5)));
            const tIdx = updated.findIndex(c => c.id === target.id);
            if (tIdx > -1) {
                updated[tIdx] = { ...updated[tIdx], currentHp: Math.max(0, updated[tIdx].currentHp - dmg) };
                triggerVfx(target.id, `-${dmg}`, 'damage');
                addLog(`${source.name} dùng [${actionName}] gây ${dmg} sát thương lên ${target.name}.`, logType);
            }
        } else if (effect.type === 'HEAL_HP') {
            const heal = effect.value || 30;
            const tIdx = updated.findIndex(c => c.id === target.id);
            if (tIdx > -1) {
                updated[tIdx] = { ...updated[tIdx], currentHp: Math.min(updated[tIdx].maxHp, updated[tIdx].currentHp + heal) };
                triggerVfx(target.id, `+${heal}`, 'heal');
                addLog(`${source.name} dùng [${actionName}] hồi ${heal} HP cho ${target.name}.`, logType);
            }
        }

        setCombatants(updated);
        combatantsRef.current = updated;
        await delay(TURN_STEP_DELAY);
        setActingId(null);
    };

    const runAiTurn = async (actor: Combatant) => {
        const isEnemy = knowledgeBase.pendingCombat?.opponentIds.includes(actor.id);
        const targets = combatantsRef.current.filter(c => 
            c.currentHp > 0 && (isEnemy ? !knowledgeBase.pendingCombat?.opponentIds.includes(c.id) : knowledgeBase.pendingCombat?.opponentIds.includes(c.id))
        );

        if (targets.length === 0) return;
        const target = targets[Math.floor(Math.random() * targets.length)];

        await applyEffect({ type: 'DAMAGE_HP', basePower: AI_ATTACK_POWER, target: 'single_enemy' }, actor, target, "Tấn Công");
    };

    const handleTurn = async (actorId: string, currentBatch: Combatant[]) => {
        const actor = currentBatch.find(c => c.id === actorId);
        if (!actor) return;

        const batchWithActorReset = currentBatch.map(c => c.id === actorId ? { ...c, actionGauge: 0 } : c);
        setCombatants(batchWithActorReset);
        combatantsRef.current = batchWithActorReset;

        if (actorId === 'player') {
            setIsPlayerTurn(true);
        } else {
            setIsPlayerTurn(false);
            await runAiTurn(actor);
            setIsTimePaused(false);
        }
    };

    // Game Loop
    useEffect(() => {
        if (isLoading || !!outcome) return;

        const interval = setInterval(() => {
            if (isLoopPausedRef.current) return;

            const living = combatantsRef.current.filter(c => c.currentHp > 0);
            const playerSide = living.filter(c => c.id === 'player' || !knowledgeBase.pendingCombat?.opponentIds.includes(c.id));
            const enemySide = living.filter(c => knowledgeBase.pendingCombat?.opponentIds.includes(c.id));

            if (playerSide.length === 0) { setOutcome('defeat'); return; }
            if (enemySide.length === 0) { setOutcome('victory'); return; }

            const nextBatch = combatantsRef.current.map(c => {
                if (c.currentHp <= 0) return { ...c, actionGauge: 0 };
                return { ...c, actionGauge: Math.min(GAUGE_MAX, c.actionGauge + (c.speed * GAUGE_SPEED_FACTOR)) };
            });

            const ready = nextBatch.find(c => c.currentHp > 0 && c.actionGauge >= GAUGE_MAX);
            if (ready) {
                setIsTimePaused(true);
                handleTurn(ready.id, nextBatch);
            } else {
                setCombatants(nextBatch);
                combatantsRef.current = nextBatch;
            }
        }, TICK_MS);

        return () => clearInterval(interval);
    }, [isLoading, outcome, knowledgeBase.pendingCombat]);

    const handlePlayerAction = async (type: CombatActionType, targetId?: string) => {
        if (!isPlayerTurn || !!actingId) return;

        const livingOpponents = combatantsRef.current.filter(c => c.currentHp > 0 && knowledgeBase.pendingCombat?.opponentIds.includes(c.id));
        const target = livingOpponents.find(t => t.id === targetId) || livingOpponents[0];

        if (!target && type !== 'flee') return;

        if (type === 'attack') {
            const player = combatantsRef.current.find(c => c.id === 'player')!;
            await applyEffect({ type: 'DAMAGE_HP', basePower: BASE_ATTACK_POWER, target: 'single_enemy' }, player, target!, "Tấn Công");
        } else if (type === 'flee') {
            addLog("Bạn tìm đường tháo lui...", "player");
            await delay(800);
            if (Math.random() > 0.4) setOutcome('escaped');
            else addLog("Bỏ chạy thất bại!", "system");
        }

        setIsPlayerTurn(false);
        setIsTimePaused(false);
    };

    return {
        combatants,
        playerParty,
        opponents,
        messages,
        isLoading,
        outcome,
        actingId,
        isPlayerTurn,
        isTimePaused,
        handlePlayerAction,
        combatInventory
    };
};
