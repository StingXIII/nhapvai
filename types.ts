
export interface CharacterStat {
  name: string;
  value: number;
  maxValue: number;
  isPercentage: boolean;
  description?: string;
  hasLimit?: boolean;
}

export interface CharacterMilestone {
  name: string;
  value: string;
  description: string;
  category: string;
}

export type CoreEntityType = 'NPC' | 'Vật phẩm' | 'Địa điểm' | 'Phe phái/Thế lực' | 'Hệ thống sức mạnh / Lore';

export interface InitialEntity {
  name: string;
  type: CoreEntityType;
  personality?: string;
  description: string;
  tags?: string[];
  customCategory?: string;
  locationId?: string;
  details?: {
    subType?: string;
    rarity?: string;
    stats?: string;
    effects?: string;
  };
  initialRealm?: string;
}

export type NsfwDescriptionStyle = 'Hoa Mỹ' | 'Trần Tục' | 'Gợi Cảm' | 'Mạnh Bạo (BDSM)';
export type ViolenceLevel = 'Nhẹ Nhàng' | 'Thực Tế' | 'Cực Đoan';
export type StoryTone = 'Tích Cực' | 'Trung Tính' | 'Đen Tối' | 'Dâm Dục' | 'Hoang Dâm' | 'Dâm Loạn';

export interface CharacterConfig {
  name: string;
  personality: string;
  customPersonality?: string;
  gender: string;
  bio: string;
  skills: {
    name:string;
    description: string;
  }[];
  stats: CharacterStat[];
  milestones: CharacterMilestone[];
  milestoneResults?: string[];
  motivation: string;
  initialRealm?: string;
}

export interface TemporaryRule {
  text: string;
  enabled: boolean;
}

export interface StyleGuideVector {
  pronoun_rules: string;
  exclusion_list: string[];
}

export interface CultivationSystemConfig {
  majorRealms: string;
  minorRealms: string;
}

export interface WorldConfig {
  storyContext: {
    worldName: string;
    genre: string;
    setting: string;
  };
  character: CharacterConfig;
  difficulty: string;
  aiResponseLength?: string;
  backgroundKnowledge?: { name: string; content: string }[];
  allowAdultContent: boolean;
  sexualContentStyle?: NsfwDescriptionStyle;
  violenceLevel?: ViolenceLevel;
  storyTone?: StoryTone;
  enableStatsSystem: boolean;
  enableMilestoneSystem: boolean;
  coreRules: string[];
  initialEntities: InitialEntity[];
  temporaryRules: TemporaryRule[];
  cultivationSystem?: CultivationSystemConfig;
  isCultivationEnabled?: boolean;
  playerRace?: string;
  raceCultivationSystems?: { raceName: string; realmSystem: string }[];
  currencyName?: string;
  nsfwMode?: boolean;
  nsfwDescriptionStyle?: string;
  theme?: string;
  combatMode?: 'narrative' | 'mechanical'; // New combat mode setting
}

export enum HarmCategory {
  HARM_CATEGORY_HARASSMENT = 'HARM_CATEGORY_HARASSMENT',
  HARM_CATEGORY_HATE_SPEECH = 'HARM_CATEGORY_HATE_SPEECH',
  HARM_CATEGORY_SEXUALLY_EXPLICIT = 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
  HARM_CATEGORY_DANGEROUS_CONTENT = 'HARM_CATEGORY_DANGEROUS_CONTENT',
}

export enum HarmBlockThreshold {
  BLOCK_NONE = 'BLOCK_NONE',
  BLOCK_ONLY_HIGH = 'BLOCK_ONLY_HIGH',
  BLOCK_MEDIUM_AND_ABOVE = 'BLOCK_MEDIUM_AND_ABOVE',
  BLOCK_LOW_AND_ABOVE = 'BLOCK_LOW_AND_ABOVE',
}

export type SafetySetting = {
  category: HarmCategory;
  threshold: HarmBlockThreshold;
};

export interface SafetySettingsConfig {
    enabled: boolean;
    settings: SafetySetting[];
}

export interface ApiKeyStorage {
  keys: string[];
}

export interface RagSettings {
  summaryFrequency: number;
  topK: number;
  summarizeBeforeRag: boolean;
}

export interface OfflineCombatAiConfig {
  aiLogicMode: 'simple' | 'advanced';
  simpleEnemyTargetPriority: 'lowestHp' | 'lowestHpPercent' | 'highestAtk' | 'random' | 'player';
  simpleAllyTactic: 'balanced' | 'defensive' | 'aggressive';
  advancedEnemyTargetPriority: 'lowestHp' | 'lowestHpPercent' | 'highestAtk' | 'random' | 'player';
  advancedAllyTargetPriority: 'lowestHp' | 'lowestHpPercent' | 'highestAtk' | 'random' | 'player' | 'followPlayer';
  advancedAllySupportPriority: 'balanced' | 'defensive' | 'aggressive';
}

export interface AiPerformanceSettings {
  maxOutputTokens: number;
  thinkingBudget: number;
  jsonBuffer: number;
  selectedModel?: string;
  offlineCombatAiConfig?: OfflineCombatAiConfig;
  defaultCombatMode?: 'narrative' | 'mechanical'; // Global default combat mode
}

export interface AppSettings {
  apiKeyConfig: ApiKeyStorage;
  safetySettings: SafetySettingsConfig;
  ragSettings: RagSettings;
  aiPerformanceSettings: AiPerformanceSettings;
}

export interface GameTurn {
  type: 'narration' | 'action';
  content: string;
  metadata?: {
    isSummaryTurn?: boolean;
    addedMemoryCount?: number;
  }
}

export interface StatusEffect {
  id?: string;
  name: string;
  description: string;
  type: 'buff' | 'debuff' | 'neutral';
  durationTurns?: number;
  statModifiers?: Partial<PlayerStats>;
  specialEffects?: string[];
  source?: string;
  icon?: string;
}

export interface OfflineCombatEffect {
  type: 'DAMAGE_HP' | 'HEAL_HP' | 'HEAL_MP' | 'REVIVE' | 'DRAIN_HP' | 'APPLY_STATUS' | 'CURE_STATUS';
  value?: number;
  basePower?: number;
  target: 'single_enemy' | 'all_enemies' | 'self' | 'single_ally' | 'lowest_hp_ally' | 'all_allies' | 'single_dead_ally';
  element?: string;
  percentage?: number;
  status?: string;
  duration?: number;
  statuses?: string[];
}

export interface GameItem {
  id?: string;
  name: string;
  description: string;
  quantity: number;
  tags?: string[];
  customCategory?: string;
  details?: {
    subType?: string;
    rarity?: string;
    stats?: string;
    effects?: string;
  };
  effect?: OfflineCombatEffect;
  category?: string;
  rarity?: string;
  itemRealm?: string;
  value?: number;
  equipmentDetails?: { 
      type?: string; 
      slot?: string; 
      statBonuses?: Record<string, number>;
      uniqueEffects?: string[];
  };
  [key: string]: any;
}

export type OfflineCombatItem = GameItem & { effect: OfflineCombatEffect };

export interface Companion {
    id: string;
    name: string;
    description: string;
    personality?: string;
    tags?: string[];
    customCategory?: string;
    entityType?: 'wife' | 'slave' | 'npc' | 'companion' | 'prisoner' | 'yeuThu';
    stats?: PlayerStats;
    realm?: string;
    race?: string;
    species?: string;
    affinity: number;
}

export type QuestType = 'MAIN' | 'SIDE' | 'CHARACTER';

export interface SubTask {
    id: string;
    desc: string;
    isCompleted: boolean;
}

export interface Quest {
    name: string;
    description: string;
    status: 'đang tiến hành' | 'hoàn thành' | 'thất bại';
    tags?: string[];
    customCategory?: string;
    type?: QuestType;
    currentObjective?: string;
    logs?: string[];
    subTasks?: SubTask[];
    parentQuestId?: string;
}

export interface EncounteredNPC {
    id: string;
    name: string;
    description: string;
    personality: string;
    thoughtsOnPlayer: string;
    tags?: string[];
    memoryFlags?: Record<string, boolean | string | number>;
    customCategory?: string;
    locationId?: string;
    physicalState?: string;
    emotionalState?: {
        current: string;
        value: number;
    };
    stats?: PlayerStats;
    realm?: string;
    race?: string;
    affinity: number;
    tuChat?: string;
    isBinhCanh?: boolean;
    binhCanhCounter?: number;
    skills?: Skill[];
    personalityTraits?: string[];
    relationshipToPlayer?: string;
    avatarUrl?: string;
    title?: string;
    [key: string]: any;
}

export interface EncounteredFaction {
    name: string;
    description: string;
    tags?: string[];
    customCategory?: string;
}

export interface WorldTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export interface TimePassed {
  years?: number;
  months?: number;
  days?: number;
  hours?: number;
  minutes?: number;
}

export interface Reputation {
  score: number;
  tier: string;
}

export interface NpcDossier {
  fresh: number[];
  archived: string[];
}

export interface PendingVectorItem {
  id: string | number;
  type: string;
  content: string;
}

export interface VectorUpdate {
  id: string;
  type: string;
  content: string;
}

export interface EntityVector {
  id: string;
  worldId: number;
  embedding: number[];
}

export interface TurnVector {
  turnId: number;
  worldId: number;
  turnIndex: number;
  content: string;
  embedding: number[];
}

export interface SummaryVector {
  summaryId: number;
  worldId: number;
  summaryIndex: number;
  content: string;
  embedding: number[];
}

export interface GraphNode {
    id: string;
    type: string;
    label: string;
    data?: any;
}

export interface GraphEdge {
    source: string;
    target: string;
    relation: string;
    weight?: number;
    description?: string;
}

export interface ActionSuggestion {
    description: string;
    successRate: number;
    risk: string;
    reward?: string;
}

export interface GameState {
  worldId?: number;
  worldConfig: WorldConfig;
  character: CharacterConfig;
  history: GameTurn[];
  memories: string[];
  summaries: string[];
  playerStatus: StatusEffect[];
  inventory: GameItem[];
  encounteredNPCs: EncounteredNPC[];
  encounteredFactions: EncounteredFaction[];
  discoveredEntities: InitialEntity[];
  companions: Companion[];
  quests: Quest[];
  suggestions?: ActionSuggestion[];
  worldTime: WorldTime;
  reputation: Reputation;
  reputationTiers: string[];
  season: string;
  weather: string;
  npcDossiers?: Record<string, NpcDossier>;
  currentLocationId?: string;
  customCategories?: string[];
  pendingVectorBuffer?: PendingVectorItem[];
  combatMode?: 'online' | 'offline';
  pendingCombat?: {
      opponentIds: string[];
      location: string;
      isDungeonBossFight?: boolean;
      surrenderedNpcIds?: string[];
  };
  combatCompanionIds: string[];
  playerStats: PlayerStats;
  wives: Wife[];
  slaves: Slave[];
  prisoners: Prisoner[];
  discoveredYeuThu: YeuThu[];
  discoveredNPCs: NPC[];
  realmProgressionList: string[];
  playerSkills: Skill[];
  currentRealmBaseStats?: PlayerStats;
  equippedItems?: Record<EquipmentSlotId, GameItem['id'] | null>;
  huntedState?: { isActive: boolean; reason: string; lastAttackTurn: number } | null;
  dungeonCrawlState?: any;
  playerAvatarData?: string;
  turnHistory?: TurnHistoryEntry[];
  postCombatState?: any;
  pendingBreakthrough?: any;
  rawActionLog?: string[];
  archetype?: {
      title: string;
      description: string;
      awakened: boolean;
  };
  pendingEntityLookups?: { name: string; context: string }[]; // Updated to include context
}

export interface SaveSlot extends GameState {
    worldName: string;
    saveId: number;
    saveDate: string;
    previewText: string;
    saveType: 'manual' | 'auto';
}

export interface FandomFile {
    id: number;
    name: string;
    content: string;
    date: string;
}

export interface FandomDataset {
    metadata: {
        sourceName: string;
        createdAt: string;
        totalChunks: number;
        chunkSize: number;
        overlap: number;
        embeddingModel: string;
    };
    chunks: {
        id: string;
        text: string;
        embedding: number[];
    }[];
}

export interface EncyclopediaData {
    encounteredNPCs: EncounteredNPC[];
    encounteredFactions: EncounteredFaction[];
    discoveredEntities: InitialEntity[];
    inventory: GameItem[];
    companions: Companion[];
    quests: Quest[];
    skills: { name: string; description: string }[];
    initialEntities: InitialEntity[];
    customCategories?: string[];
}

export type KnowledgeBase = GameState;
export type NPC = EncounteredNPC;
export type Wife = EncounteredNPC & { entityType: 'wife'; obedience: number; willpower: number; };
export type Slave = EncounteredNPC & { entityType: 'slave'; obedience: number; willpower: number; value?: number; };
export type Prisoner = EncounteredNPC & { entityType: 'prisoner'; resistance: number; willpower: number; };
export type YeuThu = EncounteredNPC & { entityType: 'yeuThu'; species: string };
export type Item = GameItem;

export type PersonBase = {
    recoveryTurns?: number;
    isDying?: boolean;
}

export type EquipmentSlotId = 'mainWeapon' | 'offHandWeapon' | 'head' | 'body' | 'hands' | 'legs' | 'artifact' | 'pet' | 'accessory1' | 'accessory2';

export interface PlayerSpecialStatus {
    type: 'prisoner' | 'slave';
    ownerName: string;
    willpower: number;
    resistance: number;
    obedience: number;
    fear: number;
    trust: number;
}

export interface PlayerStats {
    baseMaxSinhLuc?: number;
    baseMaxLinhLuc?: number;
    baseSucTanCong?: number;
    baseMaxKinhNghiem?: number;
    baseTocDo?: number;
    sinhLuc: number;
    maxSinhLuc: number;
    linhLuc?: number;
    maxLinhLuc?: number;
    sucTanCong: number;
    sucPhongNhu: number;
    tocDo: number;
    activeStatusEffects?: StatusEffect[];
    blackFlashCombo?: number;
    realm?: string;
    exp?: number;
    nextRealmExp?: number;
    kinhNghiem: number;
    maxKinhNghiem: number;
    currency: number;
    hieuUngBinhCanh?: boolean;
    spiritualRoot?: string;
    specialPhysique?: string;
    turn: number;
    professions?: { type: string; level: number; exp: number; maxExp: number }[];
    thoNguyen?: number;
    maxThoNguyen?: number;
    playerSpecialStatus?: PlayerSpecialStatus | null;
    defeatCount?: number;
    tuChat?: string;
    isInCombat?: boolean;
    coreAttributes?: {
        str: number;
        agi: number;
        int: number;
    };
}

export interface AwakeningResult {
    title: string;
    description: string;
    stats: {
        str: number;
        agi: number;
        int: number;
    };
    summary: string;
}

export type ProficiencyTier = 'Sơ Nhập' | 'Tiểu Thành' | 'Đại Thành' | 'Viên Mãn' | 'Hóa Cảnh';

export interface RealmBaseStatDefinition {
    hpBase: number;
    hpInc: number;
    mpBase: number;
    mpInc: number;
    atkBase: number;
    atkInc: number;
    expBase: number;
    expInc: number;
    spdBase: number;
    spdInc: number;
}

export interface Skill {
    id: string;
    name: string;
    description: string;
    manaCost: number;
    mpCost?: number;
    cooldown?: number;
    effect?: OfflineCombatEffect;
    proficiencyTier?: ProficiencyTier;
    type?: string;
    proficiency?: number;
    maxProficiency?: number;
    skillType?: string;
    congPhapDetails?: {
        grade: string;
        type: string;
    };
    [key: string]: any;
}

export interface AiChoice {
    text: string;
}

export type CombatDisposition = 'kill' | 'capture' | 'release';
export type CombatDispositionMap = Record<string, CombatDisposition>;

export interface CombatEndPayload {
    outcome: 'victory' | 'defeat' | 'escaped' | 'surrendered';
    summary: string;
    finalPlayerState: Partial<PlayerStats>;
    dispositions: CombatDispositionMap;
    opponentIds: string[];
    finalInventory: GameItem[];
    finalAlliesStatus: { id: string, hp: number, mp: number }[];
    finalOpponentsStatus: { id: string, hp: number, mp: number }[];
}

export type GameMessage = { 
  id: string, 
  text?: string, 
  content?: string, 
  type: 'system' | 'player' | 'npc' | 'event_summary' | 'narration', 
  timestamp?: number, 
  turnNumber?: number,
  choices?: AiChoice[]
};

export enum GameScreen {
    Home = 'home',
    Create = 'create',
    Gameplay = 'gameplay',
    Combat = 'combat',
    Cultivation = 'cultivation',
    Settings = 'settings',
    FandomGenesis = 'fandomGenesis'
}

export interface OfflineCombatSkill extends Skill {
    mpCost: number;
    effect: OfflineCombatEffect;
}

export interface DefeatedEntity {
    id: string;
    name: string;
    entityType: 'npc' | 'yeuThu';
    realm?: string;
    stats?: { sinhLuc: number };
}

export type Combatant = (EncounteredNPC | YeuThu | { entityType: 'player', id: 'player', name: string, stats: PlayerStats }) & {
    currentHp: number;
    maxHp: number;
    currentMp: number;
    maxMp: number;
    attack: number;
    defense: number;
    speed: number;
    currentStatusEffects: StatusEffect[];
    actionGauge: number;
    turnTaken: boolean;
};

export type CombatActionType = 'attack' | 'skill' | 'item' | 'defend' | 'flee';

export interface CombatAction {
    type: CombatActionType;
    skillId?: string;
    itemId?: string;
    targetId?: string;
}

export interface TurnHistoryEntry {
    turnNumber: number;
    gameState: any;
    messages: GameMessage[];
}

export interface DynamicStateUpdateResponse {
    updatedInventory?: GameItem[];
    updatedPlayerStatus?: StatusEffect[];
    updatedCompanions?: Companion[];
    updatedQuests?: Quest[];
    updatedStats?: CharacterStat[];
}

export interface EncyclopediaEntriesUpdateResponse {
    updatedEncounteredNPCs?: EncounteredNPC[];
    updatedEncounteredFactions?: EncounteredFaction[];
}

export interface CharacterStateUpdateResponse {
    updatedCharacter?: Partial<CharacterConfig>;
    updatedSkills?: { name: string; description: string }[];
    newMemories?: string[];
    timePassed?: { hours?: number; minutes?: number };
    reputationChange?: { score: number; reason: string };
}

export interface StartingSkill {
    name?: string;
    description: string;
    skillType?: string;
    specialEffects?: string;
    manaCost?: number;
    baseDamage?: number;
    damageMultiplier?: number;
    baseHealing?: number;
    healingMultiplier?: number;
    cooldown?: number;
    congPhapDetails?: any;
    linhKiDetails?: any;
    professionDetails?: any;
    camThuatDetails?: any;
    thanThongDetails?: any;
}

export interface WorldSettings {
    theme?: string;
    [key: string]: any;
}

export interface UIState {
    activeTab?: string;
    [key: string]: any;
}

export type PlayerActionInputType = 'text' | 'choice';
export type ResponseLength = 'short' | 'medium' | 'long';

export interface AuctionSlave extends Slave {
    startingPrice: number;
}

export interface AuctionItem extends GameItem {
    startingPrice: number;
}

export interface AuctionState {
    items: (AuctionItem | AuctionSlave)[];
    [key: string]: any;
}

export interface AuctionCommentaryEntry {
    bidderName: string;
    amount: number;
    comment: string;
}

export interface FindLocationParams {
    searchQuery: string;
    currentRegion?: string;
}

export interface WorldLoreEntry {
    id: string;
    title: string;
    content: string;
}
