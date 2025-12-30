
import React, { useState, useCallback, useEffect } from 'react';
import HomeScreen from './components/HomeScreen';
import WorldCreationScreen from './components/WorldCreationScreen';
import SettingsScreen from './components/SettingsScreen';
import GameplayScreen from './components/GameplayScreen';
import FandomGenesisScreen from './components/FandomGenesisScreen';
import DebugScreen from './components/DebugScreen';
import { WorldConfig, GameState, InitialEntity, NpcDossier, EncounteredNPC, PlayerStats, GameItem, EncounteredFaction } from './types';
import { DEFAULT_STATS, SUB_REALM_NAMES } from './constants';
import { DEFAULT_PLAYER_STATS } from './constants/character';
import { getSeason, generateWeather } from './utils/timeUtils';
import { resolveGenreArchetype } from './utils/genreUtils';
import { calculateRealmBaseStats, calculateEffectiveStats } from './utils/statsCalculationUtils';
import { parseRealmString } from './utils/textProcessing';
import * as firebaseService from './services/firebaseService';
import * as gameService from './services/gameService';
import { getSettings, saveSettings } from './services/settingsService';

type Screen = 'home' | 'create' | 'settings' | 'gameplay' | 'fandomGenesis' | 'debug';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [editingConfig, setEditingConfig] = useState<WorldConfig | null>(null);
  const [isCloudSyncing, setIsCloudSyncing] = useState(true);

  // Sync từ Cloud khi khởi động
  useEffect(() => {
    const initCloud = async () => {
        setIsCloudSyncing(true);
        try {
            const { settings, lastSave } = await firebaseService.loadAllFromCloud();
            
            if (settings) {
                // Hợp nhất với local settings
                const localSettings = getSettings();
                saveSettings({ ...localSettings, ...settings });
                console.log("✅ Đã tải cấu hình từ Cloud.");
            }
            
            if (lastSave) {
                // Lưu vào IndexedDB cục bộ để user có thể bấm "Tải game"
                await gameService.saveGame(lastSave, 'auto');
                console.log("✅ Đã đồng bộ bản lưu từ Cloud về máy.");
            }
        } catch (e) {
            console.error("Không thể kết nối Firebase:", e);
        } finally {
            setIsCloudSyncing(false);
        }
    };
    initCloud();
  }, []);

  const handleStartNew = useCallback(() => {
    setEditingConfig(null);
    setCurrentScreen('create');
  }, []);

  const handleLoadGame = useCallback((config: WorldConfig) => {
    setEditingConfig(config);
    setCurrentScreen('create');
  }, []);
  
  const handleStartGame = useCallback((config: WorldConfig) => {
    const worldConfigWithLore = { ...config };
    if (worldConfigWithLore.storyContext.setting) {
        const powerSystemEntity: InitialEntity = {
            name: 'Tổng quan Hệ thống Sức mạnh',
            type: 'Hệ thống sức mạnh / Lore',
            description: worldConfigWithLore.storyContext.setting,
            personality: ''
        };
        const existing = (worldConfigWithLore.initialEntities || []).find(e => e.name === powerSystemEntity.name && e.type === powerSystemEntity.type);
        if (!existing) {
            worldConfigWithLore.initialEntities = [...(worldConfigWithLore.initialEntities || []), powerSystemEntity];
        }
    }
    
    const archetype = resolveGenreArchetype(config.storyContext.genre);
    const initialTime = { year: 1, month: 1, day: 1, hour: 8, minute: 0 };
    const initialSeason = getSeason(initialTime.month, archetype);
    const initialWeather = generateWeather(initialSeason, archetype);

    let playerStats: PlayerStats;
    let majorRealms: string[] = ['Luyện Khí', 'Trúc Cơ', 'Kim Đan', 'Nguyên Anh', 'Hóa Thần'];
    let minorRealms: string[] = SUB_REALM_NAMES;

    if (config.enableStatsSystem) {
        if (config.cultivationSystem) {
             majorRealms = parseRealmString(config.cultivationSystem.majorRealms);
             minorRealms = parseRealmString(config.cultivationSystem.minorRealms);
        }

        if (majorRealms.length > 0 && minorRealms.length > 0) {
            const defaultRealm = `${majorRealms[0]} ${minorRealms[0]}`.trim();
            if (!config.character.initialRealm) {
                config.character.initialRealm = defaultRealm;
            }
            (worldConfigWithLore.initialEntities || []).forEach(entity => {
                if (entity.type === 'NPC' && !entity.initialRealm) {
                    entity.initialRealm = defaultRealm;
                }
            });
        }

        if (config.character.initialRealm) {
             const baseStats = calculateRealmBaseStats(config.character.initialRealm, majorRealms, minorRealms);
             playerStats = {
                 ...DEFAULT_PLAYER_STATS,
                 ...baseStats,
                 realm: config.character.initialRealm,
                 sinhLuc: baseStats.baseMaxSinhLuc || 100,
                 maxSinhLuc: baseStats.baseMaxSinhLuc || 100,
                 linhLuc: baseStats.baseMaxLinhLuc || 50,
                 maxLinhLuc: baseStats.baseMaxLinhLuc || 50,
                 sucTanCong: baseStats.baseSucTanCong || 10,
                 kinhNghiem: 0,
                 maxKinhNghiem: baseStats.baseMaxKinhNghiem || 1000,
                 tocDo: baseStats.baseTocDo || 10,
             };
             playerStats = calculateEffectiveStats(playerStats, {} as any, []);
        } else {
             playerStats = { ...DEFAULT_PLAYER_STATS };
        }
    } else {
        playerStats = { ...DEFAULT_PLAYER_STATS };
    }

    const initialNpcs: EncounteredNPC[] = [];
    const initialInventory: GameItem[] = [];
    const initialFactions: EncounteredFaction[] = [];
    const initialDiscoveredEntities: InitialEntity[] = [];

    (worldConfigWithLore.initialEntities || []).forEach((entity, index) => {
        let type = entity.type;

        if (type === 'NPC') {
            let npcStats = undefined;
            if (config.enableStatsSystem) {
                const npcRealm = entity.initialRealm || playerStats.realm || majorRealms[0];
                const baseStats = calculateRealmBaseStats(npcRealm, majorRealms, minorRealms);
                npcStats = {
                    ...DEFAULT_PLAYER_STATS,
                    ...baseStats,
                    realm: npcRealm,
                    sinhLuc: baseStats.baseMaxSinhLuc || 100,
                    maxSinhLuc: baseStats.baseMaxSinhLuc || 100,
                    linhLuc: baseStats.baseMaxLinhLuc || 50,
                    maxLinhLuc: baseStats.baseMaxLinhLuc || 50,
                    sucTanCong: baseStats.baseSucTanCong || 10,
                    tocDo: baseStats.baseTocDo || 10,
                };
            }

            initialNpcs.push({
                id: `npc_${Date.now()}_${index}`,
                name: entity.name,
                description: entity.description,
                personality: entity.personality || 'Chưa rõ',
                thoughtsOnPlayer: 'Chưa có tương tác',
                tags: entity.tags || [],
                customCategory: entity.customCategory || 'Nhân Vật',
                locationId: entity.locationId,
                memoryFlags: {},
                physicalState: '',
                realm: entity.initialRealm || playerStats.realm || majorRealms[0],
                stats: npcStats,
                affinity: 0,
            });
        } 
        else if (type === 'Vật phẩm') {
            initialInventory.push({
                id: `item_${Date.now()}_${index}`,
                name: entity.name,
                description: entity.description,
                quantity: 1,
                tags: entity.tags || [],
                customCategory: entity.customCategory || 'Vật phẩm',
            });
        }
        else if (type === 'Phe phái/Thế lực') {
            initialFactions.push({
                name: entity.name,
                description: entity.description,
                tags: entity.tags || [],
                customCategory: entity.customCategory || 'Thế Lực',
            });
        }
        else {
            initialDiscoveredEntities.push(entity);
        }
    });

    setGameState({ 
      worldId: Date.now(),
      worldConfig: worldConfigWithLore, 
      character: {
        ...config.character,
        stats: config.enableStatsSystem ? (config.character.stats && config.character.stats.length > 0 ? config.character.stats : DEFAULT_STATS) : [],
        milestones: config.enableMilestoneSystem ? (config.character.milestones && config.character.milestones.length > 0 ? config.character.milestones : []) : [],
      }, 
      history: [], 
      memories: [], 
      summaries: [], 
      playerStatus: [], 
      inventory: initialInventory,
      encounteredNPCs: initialNpcs,
      encounteredFactions: initialFactions,
      discoveredEntities: initialDiscoveredEntities,
      companions: [],
      quests: [],
      suggestions: [],
      worldTime: initialTime,
      reputation: { score: 0, tier: 'Vô Danh' },
      reputationTiers: [],
      season: initialSeason,
      weather: initialWeather,
      npcDossiers: {},
      customCategories: [],
      playerStats: playerStats,
      wives: [],
      slaves: [],
      prisoners: [],
      discoveredYeuThu: [],
      discoveredNPCs: initialNpcs,
      combatCompanionIds: [],
      playerSkills: [],
      realmProgressionList: majorRealms,
    });
    setCurrentScreen('gameplay');
  }, []);

  const handleLoadSavedGame = useCallback((state: GameState) => {
    const statsEnabled = state.worldConfig.enableStatsSystem === true;
    const milestonesEnabled = state.worldConfig.enableMilestoneSystem === true;
    
    const worldConfigWithLore = { ...state.worldConfig };
    if (worldConfigWithLore.storyContext.setting) {
        const powerSystemEntity: InitialEntity = {
            name: 'Tổng quan Hệ thống Sức mạnh',
            type: 'Hệ thống sức mạnh / Lore',
            description: worldConfigWithLore.storyContext.setting,
            personality: ''
        };
        const allEntities = [...(worldConfigWithLore.initialEntities || []), ...(state.discoveredEntities || [])];
        const existing = allEntities.find(e => e.name === powerSystemEntity.name && e.type === powerSystemEntity.type);
        if (!existing) {
            worldConfigWithLore.initialEntities = [...(worldConfigWithLore.initialEntities || []), powerSystemEntity];
        }
    }

    const completeState: GameState = {
      worldId: state.worldId || (state as any).saveId || Date.now(),
      memories: [],
      summaries: [],
      playerStatus: [],
      inventory: [],
      encounteredNPCs: [],
      encounteredFactions: [],
      discoveredEntities: [],
      companions: [],
      quests: [],
      suggestions: [],
      worldTime: { year: 1, month: 1, day: 1, hour: 8, minute: 0 },
      reputation: { score: 0, tier: 'Vô Danh' },
      reputationTiers: [],
      season: '',
      weather: '',
      npcDossiers: {},
      customCategories: [],
      ...state,
      worldConfig: {
        ...worldConfigWithLore,
        enableMilestoneSystem: state.worldConfig.enableMilestoneSystem ?? (state.character.milestones && state.character.milestones.length > 0)
      },
      character: {
        ...(state.character || state.worldConfig.character),
        stats: statsEnabled ? (state.character.stats && state.character.stats.length > 0 ? state.character.stats : DEFAULT_STATS) : [],
        milestones: milestonesEnabled ? (state.character.milestones || []) : [],
      },
    };
    
    completeState.encounteredNPCs = (completeState.encounteredNPCs || []).map(npc => ({ ...npc, affinity: npc.affinity ?? 0 }));
    completeState.wives = (completeState.wives || []).map(w => ({ ...w, affinity: w.affinity ?? 0, obedience: (w as any).obedience ?? 0, willpower: (w as any).willpower ?? 100 }));
    completeState.slaves = (completeState.slaves || []).map(s => ({ ...s, affinity: s.affinity ?? 0, obedience: (s as any).obedience ?? 50, willpower: (s as any).willpower ?? 50 }));
    completeState.prisoners = (completeState.prisoners || []).map(p => ({ ...p, affinity: p.affinity ?? -50 }));
    completeState.companions = (completeState.companions || []).map(c => ({ ...c, affinity: c.affinity ?? 0 }));

    completeState.worldTime = { minute: 0, ...completeState.worldTime };

    if (completeState.npcDossiers) {
        const firstDossierKey = Object.keys(completeState.npcDossiers)[0];
        if (firstDossierKey && Array.isArray(completeState.npcDossiers[firstDossierKey])) {
            const oldDossiers = completeState.npcDossiers as unknown as Record<string, number[]>;
            const newDossiers: Record<string, NpcDossier> = {};
            for (const npcName in oldDossiers) {
                newDossiers[npcName] = { fresh: oldDossiers[npcName], archived: [] };
            }
            completeState.npcDossiers = newDossiers;
        }
    }

    if (!completeState.season || !completeState.weather) {
        const archetype = resolveGenreArchetype(completeState.worldConfig.storyContext.genre);
        completeState.season = getSeason(completeState.worldTime.month, archetype);
        completeState.weather = generateWeather(completeState.season, archetype);
    }

    setGameState(completeState);
    setCurrentScreen('gameplay');
  }, []);

  const handleNavigateToSettings = useCallback(() => {
    setCurrentScreen('settings');
  }, []);
  
  const handleNavigateToFandomGenesis = useCallback(() => {
    setCurrentScreen('fandomGenesis');
  }, []);

  const handleNavigateToDebug = useCallback(() => {
    setCurrentScreen('debug');
  }, []);

  const handleBackToHome = useCallback(() => {
    setGameState(null);
    setEditingConfig(null);
    setCurrentScreen('home');
  }, []);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'create':
        return <WorldCreationScreen onBack={handleBackToHome} initialConfig={editingConfig} onStartGame={handleStartGame} />;
      case 'settings':
        return <SettingsScreen onBack={handleBackToHome} />;
      case 'fandomGenesis':
        return <FandomGenesisScreen onBack={handleBackToHome} />;
      case 'debug':
        return <DebugScreen onBack={handleBackToHome} />;
      case 'gameplay':
        if (gameState) {
          return <GameplayScreen initialGameState={gameState} onBack={handleBackToHome} />;
        }
        setCurrentScreen('home');
        return null;
      case 'home':
      default:
        return (
          <HomeScreen
            onStartNew={handleStartNew}
            onLoadGame={handleLoadGame}
            onLoadSavedGame={handleLoadSavedGame}
            onNavigateToSettings={handleNavigateToSettings}
            onNavigateToFandomGenesis={handleNavigateToFandomGenesis}
            onNavigateToDebug={handleNavigateToDebug}
          />
        );
    }
  };

  return (
    <main className="bg-gradient-to-br from-slate-900 to-slate-800 min-h-screen text-slate-100 font-sans">
      {isCloudSyncing && (
          <div className="fixed top-4 right-4 z-[100] flex items-center gap-2 bg-blue-600/80 px-4 py-2 rounded-full border border-blue-400 animate-pulse text-xs">
              <span className="w-2 h-2 bg-white rounded-full animate-ping"></span>
              Đang đồng bộ Cloud...
          </div>
      )}
      {renderScreen()}
    </main>
  );
};

export default App;
