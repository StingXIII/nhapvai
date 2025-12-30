
import { WorldConfig, HarmCategory, HarmBlockThreshold, SafetySettingsConfig, SafetySetting, RagSettings, AiPerformanceSettings, CharacterStat, CharacterMilestone, CoreEntityType, ProficiencyTier } from './types';
import { EMPTY_GENERIC_MILESTONES } from './constants/genreMilestones';
import { GENRES } from './constants/genres'; 
import { NSFW_DESCRIPTION_STYLES, VIOLENCE_LEVELS, STORY_TONES, DEFAULT_NSFW_DESCRIPTION_STYLE, DEFAULT_VIOLENCE_LEVEL, DEFAULT_STORY_TONE } from './constants/nsfw';

export const GENDER_OPTIONS = ['Nam', 'Nữ', 'Khác'];
export const PERSONALITY_OPTIONS = [
    'Tuỳ chỉnh',
    'Dũng Cảm, Bộc Trực',
    'Thận Trọng, Đa Nghi',
    'Lạnh Lùng, Ít Nói',
    'Hài Hước, Thích Ttrêu Chọc',
    'Nhân Hậu, Vị Tha',
    'Trầm Tĩnh, Thích Quan Sát',
    'Nhút Nhát, Hay Lo Sợ',
    'Tò Mò, Thích Khám Phá',
    'Trung Thành, Đáng Tin Cậy',
    'Lãng Mạn, Mơ Mộng',
    'Thực Dụng, Coi Trọng Lợi Ích',
    'Chính Trực, Ghét Sự Giả Dối',
    'Hoài Nghi, Luôn Đặt Câu Hỏi',
    'Lạc Quan, Luôn Nhìn Về Phía Trước',
    'Lý Trí, Giỏi Phân Tích',
    'Nghệ Sĩ, Tâm Hồn Bay Bổng',
];

export const DIFFICULTY_OPTIONS = [
    'Dễ - Dành cho người mới',
    'Thường - Cân bằng, phù hợp đa số',
    'Khó - Thử thách cao, cần tính toán',
    'Ác Mộng - Cực kỳ khó',
];

export const SEXUAL_CONTENT_STYLE_OPTIONS = NSFW_DESCRIPTION_STYLES;
export const VIOLENCE_LEVEL_OPTIONS = VIOLENCE_LEVELS;
export const STORY_TONE_OPTIONS = STORY_TONES;
export const AI_RESPONSE_LENGTH_OPTIONS = ['Mặc định', 'Ngắn', 'Trung bình', 'Chi tiết, dài'];

export const ENTITY_TYPE_OPTIONS = [
    'NPC', 
    'Địa điểm', 
    'Phe phái/Thế lực', 
    'Vật phẩm',
];

export const CORE_ENTITY_TYPES: CoreEntityType[] = [
    'NPC', 
    'Vật phẩm',
    'Địa điểm', 
    'Phe phái/Thế lực',
    'Hệ thống sức mạnh / Lore',
];


export const DEFAULT_STATS: CharacterStat[] = [
  { name: 'Sinh Lực', value: 100, maxValue: 100, isPercentage: true, description: 'Đại diện cho sức sống. Bị trừ khi bị thương. Về 0 sẽ chết/gục.', hasLimit: true },
  { name: 'Thể Lực', value: 100, maxValue: 100, isPercentage: true, description: 'Đại diện cho sức bền. Bị trừ khi vận động mạnh. Hồi phục khi nghỉ.', hasLimit: true },
];

export const MILESTONE_CATEGORY_OPTIONS = ['Tu Luyện', 'Thân Thể'];

export const DEFAULT_MILESTONES: CharacterMilestone[] = EMPTY_GENERIC_MILESTONES;

export const SUB_REALM_NAMES = [
    "1 Tầng", 
    "2 Tầng", 
    "3 Tầng", 
    "4 Tầng", 
    "5 Tầng",
    "6 Tầng", 
    "7 Tầng", 
    "8 Tầng", 
    "9 Tầng", 
    "Viên Mãn"
];

export const DEFAULT_WORLD_CONFIG: WorldConfig = {
  storyContext: {
    worldName: '',
    genre: GENRES[1].name,
    setting: '',
  },
  character: {
    name: '',
    personality: PERSONALITY_OPTIONS[0],
    customPersonality: '',
    gender: GENDER_OPTIONS[0],
    bio: '',
    skills: [],
    stats: DEFAULT_STATS,
    milestones: DEFAULT_MILESTONES,
    motivation: '',
  },
  difficulty: DIFFICULTY_OPTIONS[1],
  aiResponseLength: AI_RESPONSE_LENGTH_OPTIONS[0],
  backgroundKnowledge: [],
  allowAdultContent: false,
  sexualContentStyle: DEFAULT_NSFW_DESCRIPTION_STYLE,
  violenceLevel: DEFAULT_VIOLENCE_LEVEL,
  storyTone: DEFAULT_STORY_TONE,
  enableStatsSystem: true, 
  enableMilestoneSystem: true,
  coreRules: [],
  initialEntities: [],
  temporaryRules: [],
  cultivationSystem: {
      majorRealms: 'Luyện Khí - Trúc Cơ - Kim Đan - Nguyên Anh - Hóa Thần - Luyện Hư - Hợp Thể - Đại Thừa - Độ Kiếp',
      minorRealms: '1 Tầng - 9 Tầng'
  },
  combatMode: 'mechanical', // Set default combat mode
};


export const HARM_CATEGORIES: { [key in HarmCategory]: string } = {
  [HarmCategory.HARM_CATEGORY_HARASSMENT]: 'Quấy rối',
  [HarmCategory.HARM_CATEGORY_HATE_SPEECH]: 'Lời nói hận thù',
  [HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT]: 'Nội dung khiêu dâm',
  [HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT]: 'Nội dung nguy hiểm',
};

export const HARM_BLOCK_THRESHOLDS: { [key in HarmBlockThreshold]: string } = {
  [HarmBlockThreshold.BLOCK_NONE]: 'Tắt bộ lọc (Không chặn)',
  [HarmBlockThreshold.BLOCK_ONLY_HIGH]: 'Chỉ chặn mức cao',
  [HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE]: 'Chặn từ mức trung bình',
  [HarmBlockThreshold.BLOCK_LOW_AND_ABOVE]: 'Chặn cả mức thấp (nghiêm ngặt nhất)',
};

export const DEFAULT_SAFETY_SETTINGS: SafetySettingsConfig = {
    enabled: false,
    settings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ]
};

export const DEFAULT_RAG_SETTINGS: RagSettings = {
  summaryFrequency: 10,
  topK: 5,
  summarizeBeforeRag: true,
};

export const DEFAULT_AI_PERFORMANCE_SETTINGS: AiPerformanceSettings = {
  maxOutputTokens: 8192,
  thinkingBudget: 2500,
  jsonBuffer: 1024,
  selectedModel: 'gemini-2.5-flash',
  offlineCombatAiConfig: {
      aiLogicMode: 'simple',
      simpleEnemyTargetPriority: 'lowestHp',
      simpleAllyTactic: 'balanced',
      advancedEnemyTargetPriority: 'lowestHp',
      advancedAllyTargetPriority: 'lowestHp',
      advancedAllySupportPriority: 'balanced'
  },
  defaultCombatMode: 'mechanical', // Global default combat mode
};

export const VIETNAMESE = {
    combatLog: "Nhật Ký Chiến Đấu",
    turnProcessing: "Đang xử lý lượt...",
    aiActionSuggestions: "Gợi ý hành động:",
    enterCombatAction: "Nhập hành động chiến đấu...",
    sendInputButton: "Gửi",
    confirmPostCombatActions: "Xác nhận",
    combatBegins: "Trận chiến bắt đầu!",
    combatScreenTitle: "Chiến Trường",
    opponentsPanelTitle: "Kẻ Địch",
    playerPanelTitle: "Phe Ta",
    playerCombatStatsTab: "Chỉ Số",
    playerCombatSkillsTab: "Kỹ Năng",
    playerCombatItemsTab: "Vật Phẩm",
    noSkillsAvailable: "Không có kỹ năng.",
    noItemsAvailable: "Không có vật phẩm sử dụng được.",
    noOpponents: "Không có kẻ địch nào.",
    mortalRealmName: "Phàm Nhân",
    cultivationScreenTitle: "Tu Luyện & Đột Phá",
    exitCultivationButton: "Rời Tu Luyện",
    methodCultivationTab: "Tu Luyện Công Pháp",
    skillCultivationTab: "Luyện Tập Linh Kĩ",
    selectSkillToCultivate: "Chọn Linh Kĩ để luyện tập",
    noSkillsToCultivate: "Bạn chưa học Linh Kĩ nào.",
    selectCultivationMethod: "Chọn Hình Thức Tu Luyện",
    closedDoorCultivation: "Bế Quan Tu Luyện",
    dualCultivation: "Song Tu (Dual Cultivation)",
    noDualCultivationMethod: "Bạn chưa học công pháp Song Tu nào.",
    noDualCultivationPartnerAvailable: "Không có đạo lữ/nô lệ nào khả dụng.",
    selectDualCultivationPartner: "Chọn Đối Tượng Song Tu",
    cultivationDurationLabel: "Thời Gian Tu Luyện (Tương đối)",
    cultivatingMessage: "Đang tu luyện...",
    startCultivationButton: "Bắt Đầu Tu Luyện",
    cultivationResultTitle: "Kết Quả Tu Luyện",
    notEnoughMoney: "Không đủ tiền tệ để tu luyện.",
    errorCultivating: "Có lỗi xảy ra khi tu luyện.",
    bottleneckNotification: "Bình cảnh đã xuất hiện! Cần độ kiếp."
};

export const TU_CHAT_TIERS = ['Phế Vật', 'Bình Thường', 'Thiên Tài', 'Yêu Nghiệt'];
export const TU_CHAT_MULTIPLIERS: Record<string, number> = {
    'Phế Vật': 0.5,
    'Bình Thường': 1.0,
    'Thiên Tài': 1.5,
    'Yêu Nghiệt': 2.0
};
export const NPC_BASE_EXP_PERCENTAGE = 0.05;
export const NPC_BOTTLENECK_DURATION_TURNS = 10;

export const PROFICIENCY_DMG_HEAL_MULTIPLIERS: Record<ProficiencyTier, number> = {
    'Sơ Nhập': 1.0,
    'Tiểu Thành': 1.2,
    'Đại Thành': 1.5,
    'Viên Mãn': 1.8,
    'Hóa Cảnh': 2.2
};

export const PROFICIENCY_COST_COOLDOWN_MULTIPLIERS: Record<ProficiencyTier, number> = {
    'Sơ Nhập': 1.0,
    'Tiểu Thành': 0.9,
    'Đại Thành': 0.8,
    'Viên Mãn': 0.7,
    'Hóa Cảnh': 0.6
};
