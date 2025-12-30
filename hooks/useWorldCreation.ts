
// FIX: Added 'React' to the import to make types like React.ChangeEvent available.
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { 
    WorldConfig, 
    InitialEntity, 
    FandomFile, 
    CoreEntityType, 
    CharacterStat 
} from '../types';
import { 
    DEFAULT_WORLD_CONFIG, 
    GENDER_OPTIONS, 
    PERSONALITY_OPTIONS, 
    DEFAULT_STATS
} from '../constants';
import * as aiService from '../services/aiService';
import { getSettings } from '../services/settingsService';
import { GENRES } from '../constants/genres';
import { parseRealmString } from '../utils/textProcessing';
import { LoadingStates } from '../components/world/creation/constants';

interface UseWorldCreationProps {
    initialConfig?: WorldConfig | null;
    onStartGame: (config: WorldConfig) => void;
}

export const useWorldCreation = ({ initialConfig, onStartGame }: UseWorldCreationProps) => {
    const [config, setConfig] = useState<WorldConfig>(() => {
        if (initialConfig) {
            const sanitizedConfig = {
                ...DEFAULT_WORLD_CONFIG,
                ...initialConfig,
                character: {
                    ...DEFAULT_WORLD_CONFIG.character,
                    ...initialConfig.character,
                    skills: Array.isArray(initialConfig.character.skills) ? initialConfig.character.skills : [],
                    stats: (initialConfig.character.stats && initialConfig.character.stats.length > 0) ? initialConfig.character.stats : DEFAULT_STATS,
                },
                backgroundKnowledge: initialConfig.backgroundKnowledge || [],
                cultivationSystem: initialConfig.cultivationSystem || DEFAULT_WORLD_CONFIG.cultivationSystem
            };
            sanitizedConfig.backgroundKnowledge.sort((a, b) => {
                const aIsSummary = a.name.startsWith('tom_tat_');
                const bIsSummary = b.name.startsWith('tom_tat_');
                if (aIsSummary && !bIsSummary) return -1;
                if (!aIsSummary && bIsSummary) return 1;
                return a.name.localeCompare(b.name);
            });
            return sanitizedConfig;
        }
        // Phương án 2: Khi tạo game mới, đọc cài đặt mặc định
        const settings = getSettings();
        return {
            ...DEFAULT_WORLD_CONFIG,
            combatMode: settings.aiPerformanceSettings.defaultCombatMode || 'mechanical',
            character: { ...DEFAULT_WORLD_CONFIG.character, milestones: [] }
        };
    });

    const [loadingStates, setLoadingStates] = useState<LoadingStates>({});
    const [storyIdea, setStoryIdea] = useState('');
    const [fanfictionIdea, setFanfictionIdea] = useState('');
    
    const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
    const [retryAiTask, setRetryAiTask] = useState<(() => void) | null>(null);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [notificationContent, setNotificationContent] = useState({ title: '', messages: [''] });
    const [isFanficSelectModalOpen, setIsFanficSelectModalOpen] = useState(false);
    const [isKnowledgeSelectModalOpen, setIsKnowledgeSelectModalOpen] = useState(false);
    const [isCustomGenre, setIsCustomGenre] = useState(false);
    
    const [entitySearchTerm, setEntitySearchTerm] = useState('');
    const [entityTypeFilter, setEntityTypeFilter] = useState('Tất cả');

    const [parsedMajorRealms, setParsedMajorRealms] = useState<string[]>([]);
    const [parsedMinorRealms, setParsedMinorRealms] = useState<string[]>([]);
    const [isCultivationSystemReady, setIsCultivationSystemReady] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const fanficFileInputRef = useRef<HTMLInputElement>(null);
    const knowledgeFileInputRef = useRef<HTMLInputElement>(null);

    const isSafetyFilterEnabled = getSettings().safetySettings.enabled;

    const filteredEntities = useMemo(() => {
        return config.initialEntities
            .map((entity, originalIndex) => ({ entity, originalIndex }))
            .filter(({ entity }) => {
                const displayType = entity.customCategory || entity.type;
                const matchesFilter = entityTypeFilter === 'Tất cả' || displayType === entityTypeFilter;
                const matchesSearch = entity.name.toLowerCase().includes(entitySearchTerm.toLowerCase());
                return matchesFilter && matchesSearch;
            });
    }, [config.initialEntities, entityTypeFilter, entitySearchTerm]);

    useEffect(() => {
        const genreExists = GENRES.some(g => g.name === config.storyContext.genre);
        if (!genreExists && config.storyContext.genre !== 'Tùy chỉnh') {
            setIsCustomGenre(true);
        } else if (config.storyContext.genre === 'Tùy chỉnh') {
            setIsCustomGenre(true);
            handleNestedChange('storyContext', 'genre', '');
        } else {
            setIsCustomGenre(false);
        }
    }, [config.storyContext.genre]);

    const handleSimpleChange = useCallback(<T extends keyof WorldConfig>(key: T, value: WorldConfig[T]) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    }, []);

    const handleNestedChange = useCallback(<T extends keyof WorldConfig, U extends keyof WorldConfig[T]>(
        parentKey: T,
        childKey: U,
        value: WorldConfig[T][U]
    ) => {
        setConfig(prev => ({
            ...prev,
            [parentKey]: {
                ...(prev[parentKey] as object),
                [childKey]: value,
            },
        }));
    }, []);

    const handleSkillChange = useCallback((index: number, key: 'name' | 'description', value: string) => {
        const newSkills = [...config.character.skills];
        newSkills[index] = { ...newSkills[index], [key]: value };
        handleNestedChange('character', 'skills', newSkills);
    }, [config.character.skills, handleNestedChange]);

    const addSkill = useCallback(() => {
        const newSkills = [...config.character.skills, { name: '', description: '' }];
        handleNestedChange('character', 'skills', newSkills);
    }, [config.character.skills, handleNestedChange]);

    const removeSkill = useCallback((index: number) => {
        const newSkills = config.character.skills.filter((_, i) => i !== index);
        handleNestedChange('character', 'skills', newSkills);
    }, [config.character.skills, handleNestedChange]);

    const handleCoreRuleChange = useCallback((index: number, value: string) => {
        const newList = [...config.coreRules];
        newList[index] = value;
        handleSimpleChange('coreRules', newList);
    }, [config.coreRules, handleSimpleChange]);

    const addCoreRule = useCallback(() => {
        handleSimpleChange('coreRules', [...config.coreRules, '']);
    }, [config.coreRules, handleSimpleChange]);

    const removeCoreRule = useCallback((index: number) => {
        const newList = config.coreRules.filter((_, i) => i !== index);
        handleSimpleChange('coreRules', newList);
    }, [config.coreRules, handleSimpleChange]);

    const handleEntityChange = useCallback((index: number, field: keyof Omit<InitialEntity, 'type' | 'details'> | 'type_select', value: string) => {
        const newEntities = [...config.initialEntities];
        let updatedEntity = { ...newEntities[index] };

        if (field === 'type_select') {
            updatedEntity.customCategory = value;
            if (value === 'NPC') updatedEntity.type = 'NPC';
            else if (value === 'Vật phẩm' || value === 'Công pháp / Kỹ năng') updatedEntity.type = 'Vật phẩm';
            else if (value === 'Địa điểm') updatedEntity.type = 'Địa điểm';
            else if (value === 'Phe phái/Thế lực') updatedEntity.type = 'Phe phái/Thế lực';
            else {
                updatedEntity.type = 'Hệ thống sức mạnh / Lore';
            }
        } else {
            (updatedEntity as any)[field] = value;
        }
        
        newEntities[index] = updatedEntity;
        handleSimpleChange('initialEntities', newEntities);
    }, [config.initialEntities, handleSimpleChange]);

    const addEntity = useCallback(() => {
        const newType = 'NPC' as CoreEntityType;
        const newEntity: InitialEntity = {
            name: '',
            type: newType,
            customCategory: newType,
            personality: '',
            description: '',
        };
        handleSimpleChange('initialEntities', [...config.initialEntities, newEntity]);
    }, [config.initialEntities, handleSimpleChange]);

    const removeEntity = useCallback((index: number) => {
        const newList = config.initialEntities.filter((_, i) => i !== index);
        handleSimpleChange('initialEntities', newList);
    }, [config.initialEntities, handleSimpleChange]);

    const executeAiTask = async (task: () => Promise<void>) => {
        try {
            await task();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
            if (errorMessage.includes('Không tìm thấy API Key nào')) {
                setRetryAiTask(() => task);
                setIsApiKeyModalOpen(true);
            } else {
                setNotificationContent({ title: 'Lỗi AI', messages: [errorMessage] });
                setIsNotificationOpen(true);
            }
        }
    };

    const runAiAssist = (
        field: string, 
        action: () => Promise<any>,
        setter: (result: any) => void
    ) => {
        const task = async () => {
            setLoadingStates(prev => ({ ...prev, [field]: true }));
            try {
                const result = await action();
                setter(result);
            } finally {
                setLoadingStates(prev => ({ ...prev, [field]: false }));
            }
        };
        executeAiTask(task);
    };

    const processAndSetConfig = (newConfig: WorldConfig) => {
        const normalizedInitialEntities = (newConfig.initialEntities || []).map(entity => {
            let finalType: CoreEntityType = entity.type;
            if (!['NPC', 'Vật phẩm', 'Địa điểm', 'Phe phái/Thế lực', 'Hệ thống sức mạnh / Lore'].includes(finalType)) {
                finalType = 'NPC';
            }
            return {
                ...entity,
                type: finalType,
                customCategory: entity.customCategory || finalType
            };
        });
        const mergedConfig: WorldConfig = {
            ...config,
            ...newConfig,
            storyContext: newConfig.storyContext,
            character: {
                ...config.character,
                ...newConfig.character,
                stats: newConfig.enableStatsSystem ? (newConfig.character.stats || DEFAULT_STATS) : [],
                milestones: [],
            },
            initialEntities: normalizedInitialEntities,
            cultivationSystem: newConfig.cultivationSystem || config.cultivationSystem
        };
        setConfig(mergedConfig);
        setNotificationContent({ title: 'Hoàn thành!', messages: ["AI đã kiến tạo xong thế giới của bạn! Hãy kiểm tra và tinh chỉnh các chi tiết bên dưới."] });
        setIsNotificationOpen(true);
    };

    const handleGenerateWorldFromIdea = useCallback(async () => {
        if (!storyIdea.trim()) {
            setNotificationContent({ title: 'Thiếu thông tin', messages: ['Vui lòng nhập một ý tưởng để AI có thể bắt đầu kiến tạo.'] });
            setIsNotificationOpen(true);
            return;
        }
        executeAiTask(async () => {
            setLoadingStates(prev => ({...prev, worldIdea: true }));
            try {
                const newConfig = await aiService.generateWorldFromIdea(storyIdea, config.enableMilestoneSystem, config.backgroundKnowledge);
                processAndSetConfig(newConfig);
            } finally {
                setLoadingStates(prev => ({...prev, worldIdea: false }));
            }
        });
    }, [storyIdea, config]);

    const handleGenerateFanfictionFromIdea = useCallback(() => {
        if (!fanfictionIdea.trim()) {
            setNotificationContent({ title: 'Thiếu thông tin', messages: ['Vui lòng nhập ý tưởng đồng nhân.'] });
            setIsNotificationOpen(true);
            return;
        }
        executeAiTask(async () => {
            setLoadingStates(prev => ({...prev, worldFanfictionIdea: true }));
            try {
                const newConfig = await aiService.generateFanfictionWorld(fanfictionIdea, config.enableMilestoneSystem, config.backgroundKnowledge);
                processAndSetConfig(newConfig);
            } finally {
                setLoadingStates(prev => ({...prev, worldFanfictionIdea: false }));
            }
        });
    }, [fanfictionIdea, config]);

    const handleCreateWorld = () => {
        const missingFields: string[] = [];
        if (!config.storyContext.worldName.trim()) missingFields.push('Tên Thế Giới');
        if (!config.storyContext.genre.trim()) missingFields.push('Thể loại');
        if (!config.storyContext.setting.trim()) missingFields.push('Bối Cảnh');
        if (!config.character.name.trim()) missingFields.push('Tên nhân vật');
        if (!config.character.bio.trim()) missingFields.push('Tiểu sử');
        if (missingFields.length > 0) {
            setNotificationContent({
                title: 'Thông tin chưa đầy đủ',
                messages: ['Vui lòng điền đầy đủ các thông tin sau:', ...missingFields.map(f => `- ${f}`)]
            });
            setIsNotificationOpen(true);
            return;
        }
        onStartGame(config);
    };

    const handleSetupCultivationSystem = useCallback(() => {
        const majors = config.cultivationSystem?.majorRealms ? parseRealmString(config.cultivationSystem.majorRealms) : [];
        const minors = config.cultivationSystem?.minorRealms ? parseRealmString(config.cultivationSystem.minorRealms) : [];
        setParsedMajorRealms(majors);
        setParsedMinorRealms(minors);
        setIsCultivationSystemReady(true);

        if (majors.length > 0 && minors.length > 0) {
            const lowestMinorRealm = minors[0];

            setConfig(prevConfig => {
                const newConfig = { ...prevConfig };

                // Update Character's initial realm
                const charMajor = majors.find(m => newConfig.character.initialRealm?.startsWith(m));
                if (charMajor) {
                    newConfig.character.initialRealm = `${charMajor} ${lowestMinorRealm}`.trim();
                }

                // Update initial NPCs' realms
                newConfig.initialEntities = newConfig.initialEntities.map(entity => {
                    if (entity.type === 'NPC' && entity.initialRealm) {
                        const npcMajor = majors.find(m => entity.initialRealm!.startsWith(m));
                        if (npcMajor) {
                            return { ...entity, initialRealm: `${npcMajor} ${lowestMinorRealm}`.trim() };
                        }
                    }
                    return entity;
                });

                return newConfig;
            });
        }

        setNotificationContent({ 
            title: 'Thành công', 
            messages: [`Đã thiết lập hệ thống tu luyện!`, `Tìm thấy ${majors.length} đại cảnh giới và ${minors.length} tiểu cảnh giới.`] 
        });
        setIsNotificationOpen(true);
    }, [config.cultivationSystem, setConfig]);

    const handleKnowledgeFileLoad = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        setLoadingStates(prev => ({ ...prev, knowledgeFile: true }));
        
        try {
            const newKnowledgeFiles: { name: string, content: string }[] = [];
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                if (file.name.endsWith('.txt') || file.name.endsWith('.json')) {
                    const content = await file.text();
                    newKnowledgeFiles.push({ name: file.name, content });
                }
            }
            
            if (newKnowledgeFiles.length > 0) {
                const existingFiles = new Map((config.backgroundKnowledge || []).map(f => [f.name, f]));
                newKnowledgeFiles.forEach(f => existingFiles.set(f.name, f));
                const updatedKnowledge = Array.from(existingFiles.values());
                handleSimpleChange('backgroundKnowledge', updatedKnowledge);
                setNotificationContent({ 
                    title: 'Thành công!', 
                    messages: [`Đã tải lên và lưu ${newKnowledgeFiles.length} tệp kiến thức nền.`] 
                });
                setIsNotificationOpen(true);
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định.';
            setNotificationContent({ title: 'Lỗi Tải Tệp', messages: [errorMessage] });
            setIsNotificationOpen(true);
        } finally {
            setLoadingStates(prev => ({ ...prev, knowledgeFile: false }));
            if (event.target) {
                event.target.value = '';
            }
        }
    }, [config.backgroundKnowledge, handleSimpleChange]);

    return {
        config, setConfig,
        loadingStates,
        storyIdea, setStoryIdea,
        fanfictionIdea, setFanfictionIdea,
        isApiKeyModalOpen, setIsApiKeyModalOpen,
        isNotificationOpen, setIsNotificationOpen,
        notificationContent, setNotificationContent,
        isFanficSelectModalOpen, setIsFanficSelectModalOpen,
        isKnowledgeSelectModalOpen, setIsKnowledgeSelectModalOpen,
        isCustomGenre,
        entitySearchTerm, setEntitySearchTerm,
        entityTypeFilter, setEntityTypeFilter,
        parsedMajorRealms,
        parsedMinorRealms,
        isCultivationSystemReady,
        filteredEntities,
        isSafetyFilterEnabled,
        fileInputRef,
        fanficFileInputRef,
        knowledgeFileInputRef,
        handleSimpleChange,
        handleNestedChange,
        handleSkillChange,
        addSkill,
        removeSkill,
        handleCoreRuleChange,
        addCoreRule,
        removeCoreRule,
        handleEntityChange,
        addEntity,
        removeEntity,
        handleCreateWorld,
        handleSetupCultivationSystem,
        handleGenerateWorldFromIdea,
        handleGenerateFanfictionFromIdea,
        runAiAssist,
        executeAiTask,
        retryAiTask,
        setRetryAiTask,
        handleKnowledgeFileLoad
    };
};
