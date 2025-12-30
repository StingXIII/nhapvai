
import React, { useState } from 'react';
import Button from './common/Button';
import Icon from './common/Icon';
import CombatScreen from './CombatScreen';
import CultivationScreen from './CultivationScreen';
import { GameState, PlayerStats, NPC, Skill, Item, CombatEndPayload, Wife } from '../types';
import { calculateRealmBaseStats, handleLevelUps } from '../utils/statsCalculationUtils';
import { DEFAULT_WORLD_CONFIG, VIETNAMESE, SUB_REALM_NAMES } from '../constants';
import * as GameTemplates from '../templates';

interface DebugScreenProps {
  onBack: () => void;
}

const DebugScreen: React.FC<DebugScreenProps> = ({ onBack }) => {
  const [debugCombatState, setDebugCombatState] = useState<GameState | null>(null);
  const [debugCultivationState, setDebugCultivationState] = useState<GameState | null>(null);
  const [isCultivationLoading, setIsCultivationLoading] = useState(false);

  // --- COMBAT DEBUG LOGIC ---
  const generateDebugCombatState = (): GameState => {
    const realm = 'Trúc Cơ Sơ kỳ';
    const realmList = ['Luyện Khí', 'Trúc Cơ', 'Kim Đan', 'Nguyên Anh', 'Hóa Thần'];
    const baseStats = calculateRealmBaseStats(realm, realmList);
    
    // Adjusted stats for turn-based combat, removing HP x3 for more standard battle length
    const debugStats: PlayerStats = {
        baseMaxSinhLuc: baseStats.baseMaxSinhLuc,
        baseMaxLinhLuc: baseStats.baseMaxLinhLuc,
        baseSucTanCong: baseStats.baseSucTanCong,
        baseMaxKinhNghiem: baseStats.baseMaxKinhNghiem,
        baseTocDo: baseStats.baseTocDo,
        maxSinhLuc: baseStats.baseMaxSinhLuc || 100, // No x3 multiplier
        sinhLuc: baseStats.baseMaxSinhLuc || 100,
        sucTanCong: baseStats.baseSucTanCong || 25, // Adjusted ATK
        sucPhongNhu: (baseStats.baseSucTanCong || 25) / 2, // Approximation
        tocDo: baseStats.baseTocDo || 10,
        linhLuc: baseStats.baseMaxLinhLuc || 50, // Adjusted MP
        maxLinhLuc: baseStats.baseMaxLinhLuc || 50,
        kinhNghiem: 0,
        maxKinhNghiem: baseStats.baseMaxKinhNghiem || 1000,
        currency: 9999,
        turn: 1,
        realm: realm,
        activeStatusEffects: [],
        blackFlashCombo: 0, // Not used in this engine, but keep for type safety
    };

    const createDebugNPC = (id: string, name: string, type: 'ally' | 'enemy'): NPC => ({
        id: id,
        name: name,
        description: `NPC giả lập phe ${type === 'ally' ? 'ta' : 'địch'}`,
        personality: type === 'ally' ? 'Trung thành' : 'Hung hăng',
        thoughtsOnPlayer: type === 'ally' ? 'Tin tưởng' : 'Thù địch',
        // FIX: Add missing property 'affinity'
        affinity: type === 'ally' ? 50 : -50,
        stats: { ...debugStats, sinhLuc: debugStats.maxSinhLuc, activeStatusEffects: [] },
        realm: realm,
        memoryFlags: {},
        customCategory: 'DebugNPC'
    });

    const allies: NPC[] = Array.from({ length: 2 }).map((_, i) => createDebugNPC(`debug_ally_${i}`, `Đồng Minh ${i + 1}`, 'ally'));
    const enemies: NPC[] = Array.from({ length: 3 }).map((_, i) => createDebugNPC(`debug_enemy_${i}`, `Kẻ Địch ${i + 1}`, 'enemy'));

    const debugSkills: Skill[] = [
        GameTemplates.COMBAT_MODE_SKILLS.find(s => s.id === 'fireball')!,
        GameTemplates.COMBAT_MODE_SKILLS.find(s => s.id === 'heal')!,
        { id: 'skill_3', name: 'Vạn Kiếm Quy Tông', description: 'Tấn công tất cả kẻ địch.', manaCost: 50, mpCost: 50, effect: { type: 'DAMAGE_HP', basePower: 50, target: 'all_enemies' }, proficiencyTier: 'Sơ Nhập' } // Adjusted basePower
    ].filter(Boolean) as Skill[];

    const debugInventory: Item[] = [
        GameTemplates.COMBAT_MODE_ITEMS.find(i => i.id === 'potion_small_heal')!,
        GameTemplates.COMBAT_MODE_ITEMS.find(i => i.id === 'potion_mana')!
    ].filter(Boolean).map(item => ({...item, quantity: 5})) as Item[]; // Adjusted quantity


    const allNPCs = [...allies, ...enemies];

    return {
        worldId: 9999,
        worldConfig: { ...DEFAULT_WORLD_CONFIG },
        character: { ...DEFAULT_WORLD_CONFIG.character, name: 'Nhà Phát Triển' },
        playerStats: debugStats,
        encounteredNPCs: allNPCs,
        discoveredNPCs: allNPCs, // CombatScreen uses this alias
        combatCompanionIds: allies.map(a => a.id),
        pendingCombat: {
            opponentIds: enemies.map(e => e.id),
            location: 'Võ đài Debug'
        },
        combatMode: 'offline',
        playerSkills: debugSkills,
        inventory: debugInventory,
        realmProgressionList: realmList,
        // Mock empty arrays for other required fields
        history: [], memories: [], summaries: [], playerStatus: [], encounteredFactions: [], discoveredEntities: [], companions: [], quests: [], suggestions: [], worldTime: {year: 1, month: 1, day: 1, hour: 0, minute: 0}, reputation: { score: 0, tier: 'Vô Danh' }, reputationTiers: [], season: '', weather: '', wives: [], slaves: [], prisoners: [], discoveredYeuThu: []
    };
  };

  const handleStartBattle = () => {
      const state = generateDebugCombatState();
      setDebugCombatState(state);
  };

  const handleCombatEnd = async (result: CombatEndPayload) => {
      console.log("Combat Result:", result);
      alert(`Trận đấu kết thúc: ${result.outcome}`);
      setDebugCombatState(null);
  };

  // --- CULTIVATION DEBUG LOGIC ---
  const generateDebugCultivationState = (): GameState => {
      const realmList = ['Luyện Khí', 'Trúc Cơ', 'Kim Đan', 'Nguyên Anh', 'Hóa Thần'];
      
      const debugStats: PlayerStats = {
          sinhLuc: 100, maxSinhLuc: 100,
          sucTanCong: 10, sucPhongNhu: 10,
          tocDo: 10,
          linhLuc: 50, maxLinhLuc: 50,
          kinhNghiem: 0,
          maxKinhNghiem: 100, // Thấp để dễ lên cấp
          currency: 99999999, // Đại gia để test mua đồ/tu luyện
          turn: 1,
          realm: 'Phàm Nhân',
          activeStatusEffects: [],
          blackFlashCombo: 0,
      };

      const debugSkills: Skill[] = [
          { id: 'method_1', name: 'Thôn Thiên Ma Công', description: 'Công pháp tu luyện thượng thừa, hấp thu linh khí cực nhanh.', skillType: 'CONG_PHAP_TU_LUYEN', congPhapDetails: { grade: 'Thiên Giai', type: 'BE_QUAN' }, manaCost: 0 },
          { id: 'skill_1', name: 'Hỏa Cầu Thuật', description: 'Bắn cầu lửa.', skillType: 'LINH_KI', proficiency: 0, maxProficiency: 100, proficiencyTier: 'Sơ Nhập', manaCost: 10, effect: { type: 'DAMAGE_HP', basePower: 30, target: 'single_enemy', element: 'fire' } },
          { id: 'dual_1', name: 'Âm Dương Hoà Hợp Phú', description: 'Công pháp song tu.', skillType: 'CONG_PHAP_TU_LUYEN', congPhapDetails: { grade: 'Địa Giai', type: 'SONG_TU' }, manaCost: 0 }
      ];

      const partner: Wife = {
          id: 'partner_1', name: 'Sư Tỷ Mẫu Mực', description: 'Một sư tỷ xinh đẹp.', personality: 'Dịu dàng',
          thoughtsOnPlayer: 'Yêu thương',
          stats: { ...debugStats, realm: 'Luyện Khí Viên Mãn', maxSinhLuc: 1000, sinhLuc: 1000 },
          realm: 'Luyện Khí Viên Mãn',
          affinity: 100,
          entityType: 'wife',
          // FIX: Add missing properties 'obedience' and 'willpower'
          obedience: 50,
          willpower: 100,
          memoryFlags: {},
          customCategory: 'Wife'
      };

      return {
          worldId: 8888,
          worldConfig: { 
              ...DEFAULT_WORLD_CONFIG, 
              enableStatsSystem: true,
              cultivationSystem: { majorRealms: realmList.join(' - '), minorRealms: SUB_REALM_NAMES.join(' - ') }
          },
          character: { ...DEFAULT_WORLD_CONFIG.character, name: 'Tester Đại Đế' },
          playerStats: debugStats,
          playerSkills: debugSkills,
          inventory: [],
          realmProgressionList: realmList,
          wives: [partner],
          // Empties
          encounteredNPCs: [], discoveredNPCs: [], combatCompanionIds: [], history: [], memories: [], summaries: [], playerStatus: [], encounteredFactions: [], discoveredEntities: [], companions: [], quests: [], suggestions: [], worldTime: {year: 1, month: 1, day: 1, hour: 0, minute: 0}, reputation: { score: 0, tier: 'Vô Danh' }, reputationTiers: [], season: '', weather: '', slaves: [], prisoners: [], discoveredYeuThu: []
      };
  };

  const handleStartCultivationDebug = () => {
      setDebugCultivationState(generateDebugCultivationState());
  };

  const handleDebugStartCultivationAction = async (type: 'skill' | 'method', duration: number): Promise<string[]> => {
      setIsCultivationLoading(true);
      await new Promise(r => setTimeout(r, 800)); // Fake delay

      if (!debugCultivationState) return [];

      let newState = { ...debugCultivationState };
      
      const expGain = duration * 500; 
      const cost = duration * 500;

      newState.playerStats.currency -= cost;
      
      let logMsg = "";
      if (type === 'skill') {
          logMsg = `[Debug] Luyện tập kỹ năng chăm chỉ trong ${duration} lượt. Tốn ${cost} linh thạch.`;
      } else {
          logMsg = `[Debug] Bế quan tu luyện ${duration} lượt. Hấp thu linh khí cuồn cuộn! Tốn ${cost} linh thạch.`;
          newState.playerStats.kinhNghiem += expGain;
      }

      const { updatedKb, systemMessages } = handleLevelUps(newState);
      setDebugCultivationState(updatedKb);
      setIsCultivationLoading(false);

      const logs = [logMsg, `[Hệ thống] Nhận ${expGain} EXP.`];
      systemMessages.forEach(msg => logs.push(`[Hệ thống] ${msg.content}`));
      
      return logs;
  };

  const handleDebugBreakthrough = async () => {
      setIsCultivationLoading(true);
      
      if (!debugCultivationState) return;

      // 1. Tạo Boss Lôi Kiếp cho Debug
      const pStats = debugCultivationState.playerStats;
      const bossStats: PlayerStats = {
          sinhLuc: Math.floor(pStats.maxSinhLuc * 1.5),
          maxSinhLuc: Math.floor(pStats.maxSinhLuc * 1.5),
          linhLuc: pStats.maxLinhLuc ? Math.floor(pStats.maxLinhLuc * 2) : 0,
          maxLinhLuc: pStats.maxLinhLuc ? Math.floor(pStats.maxLinhLuc * 2) : 0,
          sucTanCong: Math.floor(pStats.sucTanCong * 1.2),
          sucPhongNhu: Math.floor(pStats.sucPhongNhu * 1.2),
          tocDo: Math.floor(pStats.tocDo * 1.1),
          kinhNghiem: 0, maxKinhNghiem: 100, currency: 0, turn: 0, activeStatusEffects: [], blackFlashCombo: 0,
      };

      const bossId = `tribulation-boss-debug-${Date.now()}`;
      const boss: NPC = {
          id: bossId,
          name: `Lôi Kiếp Hóa Thân (Debug)`,
          description: `Thử thách độ kiếp dành cho Tester.`,
          personality: "Vô Tình",
          thoughtsOnPlayer: "Hủy Diệt",
          // FIX: Add missing property 'affinity'
          affinity: -100,
          tags: ["Thiên Đạo", "Lôi Kiếp"],
          customCategory: "Boss",
          realm: "Thiên Kiếp",
          tuChat: "Thần Phẩm",
          stats: bossStats,
          locationId: 'Debug Arena',
      };

      // 2. Cập nhật State để chuyển sang Combat
      setDebugCultivationState(prev => {
          if (!prev) return null;
          const newState = JSON.parse(JSON.stringify(prev));
          newState.discoveredNPCs = [...(newState.discoveredNPCs || []), boss];
          newState.pendingCombat = {
              opponentIds: [bossId],
              location: 'Lôi Trì Debug'
          };
          newState.pendingBreakthrough = {
              targetRealm: "Next Level",
              requirements: "Victory"
          };
          newState.combatMode = 'offline';
          return newState;
      });

      setIsCultivationLoading(false);
  };

  const handleCultivationCombatEnd = async (result: CombatEndPayload) => {
      if (!debugCultivationState) return;
      
      const newState = { ...debugCultivationState };
      newState.playerStats = { ...newState.playerStats, ...result.finalPlayerState } as PlayerStats;
      
      if (newState.pendingBreakthrough) {
          const opponentIdsToDelete = result.opponentIds;
          newState.discoveredNPCs = newState.discoveredNPCs.filter((n: NPC) => !opponentIdsToDelete.includes(n.id));
          
          if (result.outcome === 'victory') {
              const playerRealmBeforeBreakthrough = debugCultivationState.playerStats.realm;
              let progressionList = newState.realmProgressionList || [];
              
              const sortedRealms = [...progressionList].sort((a, b) => b.length - a.length);
              const matchedMainRealm = sortedRealms.find(r => playerRealmBeforeBreakthrough.startsWith(r));
              const mainRealmIndex = progressionList.indexOf(matchedMainRealm || '');

              if (mainRealmIndex !== -1 && mainRealmIndex < progressionList.length - 1) {
                  const nextMainRealmName = progressionList[mainRealmIndex + 1];
                  newState.playerStats.realm = `${nextMainRealmName} ${SUB_REALM_NAMES[0]}`;
                  newState.playerStats.kinhNghiem = 0;
                  
                  const newBaseStats = calculateRealmBaseStats(newState.playerStats.realm, newState.realmProgressionList);
                  newState.playerStats = { ...newState.playerStats, ...newBaseStats };
                  
                  newState.playerStats.sinhLuc = newState.playerStats.maxSinhLuc;
                  newState.playerStats.linhLuc = newState.playerStats.maxLinhLuc;

                  alert(`Độ kiếp thành công! Đột phá lên ${newState.playerStats.realm}!`);
              } else {
                   alert("Đã chiến thắng nhưng không tìm thấy cảnh giới tiếp theo!");
              }
          } else { 
              newState.playerStats.sinhLuc = 1;
              alert("Độ kiếp thất bại! Bạn bị thương nặng.");
          }
          
          newState.pendingBreakthrough = undefined;
          newState.pendingCombat = undefined;
      }
      
      setDebugCultivationState(newState);
  };

  if (debugCombatState) {
      return (
          <div className="fixed inset-0 z-50 bg-black">
              <CombatScreen 
                  knowledgeBase={debugCombatState}
                  onCombatEnd={handleCombatEnd}
                  setKnowledgeBase={(kb) => setDebugCombatState(kb as GameState)}
                  setCombatMode={() => {}}
              />
          </div>
      );
  }

  if (debugCultivationState) {
      if (debugCultivationState.pendingCombat) {
          return (
              <div className="fixed inset-0 z-50 bg-black">
                  <CombatScreen 
                      knowledgeBase={debugCultivationState}
                      onCombatEnd={handleCultivationCombatEnd}
                      setKnowledgeBase={(kb) => setDebugCultivationState(kb as GameState)}
                      setCombatMode={() => {}}
                  />
              </div>
          );
      }

      return (
          <div className="fixed inset-0 z-50 bg-black">
              <CultivationScreen 
                  knowledgeBase={debugCultivationState}
                  onStartCultivation={handleDebugStartCultivationAction}
                  onExit={() => setDebugCultivationState(null)}
                  isLoading={isCultivationLoading}
                  setCurrentScreen={() => {}} // No-op for debug
                  onStartBreakthrough={handleDebugBreakthrough}
              />
          </div>
      );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-900 text-slate-100 p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
          Debug Interface
        </h1>
        <Button onClick={onBack} variant="secondary" className="!w-auto !py-2 !px-4">
          <Icon name="back" className="w-5 h-5 mr-2" /> Quay lại
        </Button>
      </div>
      
      <div className="flex-grow flex flex-col items-center justify-start border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/30 p-8 space-y-6 overflow-y-auto">
        <div className="flex flex-col items-center">
            <Icon name="magic" className="w-16 h-16 text-slate-600 mb-4" />
            <p className="text-xl text-slate-500 font-semibold">Khu vực dành cho nhà phát triển</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl">
            {/* Combat Section */}
            <div className="p-4 bg-slate-800 rounded-lg border border-slate-700 hover:border-red-500/50 transition">
                <h3 className="font-bold text-lg text-red-400 mb-2 flex items-center">
                    <Icon name="warning" className="w-5 h-5 mr-2"/>
                    Combat Testing
                </h3>
                <p className="text-sm text-slate-400 mb-4 h-20">
                    Giả lập trận đấu 2 vs 3.
                    <br/>
                    Cấu hình: Cảnh giới Trúc Cơ Sơ kỳ, chỉ số cân bằng.
                </p>
                <Button onClick={handleStartBattle} variant="primary">
                    Battle 1.0 (Test Combat Client)
                </Button>
            </div>

            {/* Cultivation Section */}
            <div className="p-4 bg-slate-800 rounded-lg border border-slate-700 hover:border-cyan-500/50 transition">
                <h3 className="font-bold text-lg text-cyan-400 mb-2 flex items-center">
                    <Icon name="magic" className="w-5 h-5 mr-2"/>
                    Cultivation Sandbox
                </h3>
                <p className="text-sm text-slate-400 mb-4 h-20">
                    Môi trường test cơ chế tu luyện và đột phá.
                    <br/>
                    Cấu hình: Phàm Nhân, 99m Tiền, 100 HP/50 MP/10 ATK.
                </p>
                <Button onClick={handleStartCultivationDebug} variant="info">
                    Tu Luyện (God Mode)
                </Button>
            </div>
        </div>
        
        <p className="text-sm text-slate-600 mt-auto">Chức năng đang được xây dựng...</p>
      </div>
    </div>
  );
};

export default DebugScreen;