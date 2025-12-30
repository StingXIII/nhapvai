
import React from 'react';
import { useWorldCreation } from '../hooks/useWorldCreation';
import { WorldConfig, FandomFile } from '../types';
import { saveWorldConfigToFile, loadWorldConfigFromFile } from '../services/fileService';
import { getSettings, saveSettings } from '../services/settingsService';
import * as aiService from '../services/aiService';

// Common Components
import Icon from './common/Icon';
import Button from './common/Button';
import ApiKeyModal from './common/ApiKeyModal';
import NotificationModal from './common/NotificationModal';
import FandomFileLoadModal from './FandomFileLoadModal';

// Creation Sections
import StoryIdeaSection from './world/creation/StoryIdeaSection';
import ContextSection from './world/creation/ContextSection';
import DifficultySection from './world/creation/DifficultySection';
import RulesSection from './world/creation/RulesSection';
import EntitySection from './world/creation/EntitySection';
import CharacterSection from './world/creation/CharacterSection';
import CultivationSetupSection from './world/creation/CultivationSetupSection';

interface WorldCreationScreenProps {
    onBack: () => void;
    onStartGame: (config: WorldConfig) => void;
    initialConfig?: WorldConfig | null;
}

const WorldCreationScreen: React.FC<WorldCreationScreenProps> = ({ 
    onBack, 
    onStartGame, 
    initialConfig 
}) => {
    const {
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
    } = useWorldCreation({ initialConfig, onStartGame });

    // UI Handlers (Glue logic)
    const handleAdultContentClick = () => {
        if (isSafetyFilterEnabled) {
            setNotificationContent({ 
                title: 'Yêu cầu Cài đặt', 
                messages: ['Để cho phép nội dung 18+, bạn cần tắt "Bật lọc an toàn Gemini API" trong mục Cài Đặt trước.'] 
            });
            setIsNotificationOpen(true);
        }
    };

    const handleApiKeySave = (key: string) => {
        const settings = getSettings();
        const newKeys = [...settings.apiKeyConfig.keys.filter(Boolean), key];
        saveSettings({ ...settings, apiKeyConfig: { keys: newKeys } });
        setIsApiKeyModalOpen(false);
        if (retryAiTask) {
            retryAiTask();
            setRetryAiTask(null);
        }
    };

    const handleFileLoad = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const loadedConfig = await loadWorldConfigFromFile(file);
                setConfig(loadedConfig);
            } catch (error) {
                setNotificationContent({ title: 'Lỗi', messages: ['Không thể đọc tệp cấu hình.'] });
                setIsNotificationOpen(true);
            }
        }
    };

    const handleConfirmFanficSelection = (selectedFiles: FandomFile[]) => {
        const knowledge = selectedFiles.map(f => ({ name: f.name, content: f.content }));
        handleSimpleChange('backgroundKnowledge', [...(config.backgroundKnowledge || []), ...knowledge]);
        setIsFanficSelectModalOpen(false);
    };

    return (
        <>
            <ApiKeyModal 
                isOpen={isApiKeyModalOpen} 
                onSave={handleApiKeySave} 
                onCancel={() => setIsApiKeyModalOpen(false)} 
            />
            <NotificationModal
                isOpen={isNotificationOpen}
                onClose={() => setIsNotificationOpen(false)}
                title={notificationContent.title}
                messages={notificationContent.messages}
            />
            <FandomFileLoadModal 
                isOpen={isFanficSelectModalOpen}
                onClose={() => setIsFanficSelectModalOpen(false)}
                onConfirm={handleConfirmFanficSelection}
                mode="multiple"
                title="Chọn Nguyên Tác"
            />
            <FandomFileLoadModal 
                isOpen={isKnowledgeSelectModalOpen}
                onClose={() => setIsKnowledgeSelectModalOpen(false)}
                onConfirm={(files) => handleSimpleChange('backgroundKnowledge', files.map(f => ({ name: f.name, content: f.content })))}
                mode="multiple"
                title="Kho Kiến Thức Nền"
            />

            <input type="file" ref={fileInputRef} onChange={handleFileLoad} className="hidden" accept=".json" />
            <input type="file" ref={fanficFileInputRef} className="hidden" accept=".txt" multiple />
            <input 
                type="file" 
                ref={knowledgeFileInputRef} 
                className="hidden" 
                accept=".txt,.json" 
                multiple 
                onChange={handleKnowledgeFileLoad}
            />

            <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 animate-fade-in">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-black text-slate-100 tracking-tighter uppercase italic">
                        Kiến Tạo Thế Giới
                    </h1>
                    <Button onClick={onBack} variant="secondary" className="!w-auto">
                        <Icon name="back" className="w-5 h-5 mr-2" /> Quay lại
                    </Button>
                </div>

                <StoryIdeaSection 
                    storyIdea={storyIdea} setStoryIdea={setStoryIdea}
                    fanfictionIdea={fanfictionIdea} setFanfictionIdea={setFanfictionIdea}
                    loadingStates={loadingStates}
                    onGenerateWorld={handleGenerateWorldFromIdea}
                    onGenerateFanfiction={handleGenerateFanfictionFromIdea}
                    onLoadFanficFile={() => fanficFileInputRef.current?.click()}
                    onOpenFanficLibrary={() => setIsFanficSelectModalOpen(true)}
                />

                <div className="flex flex-col lg:flex-row lg:gap-8 mt-12">
                    <div className="flex flex-col lg:w-1/2 space-y-8">
                        <ContextSection 
                            storyContext={config.storyContext}
                            isCustomGenre={isCustomGenre}
                            loadingStates={loadingStates}
                            onNestedChange={handleNestedChange}
                            onGenerateSetting={() => runAiAssist('setting', () => aiService.generateSetting(config), res => handleNestedChange('storyContext', 'setting', res))}
                        />

                        <CultivationSetupSection 
                            cultivationSystem={config.cultivationSystem}
                            onNestedChange={handleNestedChange}
                            onSetup={handleSetupCultivationSystem}
                        />

                        {/* NEW: Combat Mode Selection */}
                        <div className="bg-slate-800/60 backdrop-blur-sm rounded-lg border-l-4 border-red-500 p-4 shadow-lg">
                            <h3 className="text-xl font-bold text-left text-red-400 mb-4 flex items-center">
                                <Icon name="difficulty" className="w-6 h-6 mr-3"/>
                                Hệ Thống Chiến Đấu
                            </h3>
                            <div className="space-y-3">
                                <label className="flex items-start p-3 bg-slate-900/50 rounded-lg border-2 border-transparent has-[:checked]:border-red-400/50 has-[:checked]:bg-red-900/20 transition-all cursor-pointer">
                                    <input 
                                        type="radio"
                                        name="combatMode"
                                        value="mechanical"
                                        checked={config.combatMode === 'mechanical'}
                                        onChange={() => handleSimpleChange('combatMode', 'mechanical')}
                                        className="mt-1 h-4 w-4 text-red-600 bg-slate-700 border-slate-500 focus:ring-red-500"
                                    />
                                    <div className="ml-3 text-sm">
                                        <p className="font-bold text-slate-100">Chiến đấu Cơ chế (Đánh thật đó)</p>
                                        <p className="text-slate-400 text-xs mt-1">Kích hoạt client combat. Mọi hành động tấn công sẽ mở giao diện chiến đấu cơ học, do người chơi toàn quyền điều khiển.</p>
                                    </div>
                                </label>
                                <label className="flex items-start p-3 bg-slate-900/50 rounded-lg border-2 border-transparent has-[:checked]:border-red-400/50 has-[:checked]:bg-red-900/20 transition-all cursor-pointer">
                                    <input 
                                        type="radio"
                                        name="combatMode"
                                        value="narrative"
                                        checked={config.combatMode === 'narrative'}
                                        onChange={() => handleSimpleChange('combatMode', 'narrative')}
                                        className="mt-1 h-4 w-4 text-red-600 bg-slate-700 border-slate-500 focus:ring-red-500"
                                    />
                                    <div className="ml-3 text-sm">
                                        <p className="font-bold text-slate-100">Chiến đấu Tường thuật (Đánh bằng mõm)</p>
                                        <p className="text-slate-400 text-xs mt-1">AI sẽ dẫn dắt và mô tả toàn bộ diễn biến trận đấu. Client combat sẽ bị vô hiệu hóa, phù hợp cho trải nghiệm tập trung vào cốt truyện.</p>
                                    </div>
                                </label>
                            </div>
                        </div>


                        <DifficultySection 
                            config={config}
                            isSafetyFilterEnabled={isSafetyFilterEnabled}
                            knowledgeFileInputRef={knowledgeFileInputRef}
                            onSimpleChange={handleSimpleChange}
                            onAdultContentClick={handleAdultContentClick}
                            onRemoveKnowledgeFile={(idx) => handleSimpleChange('backgroundKnowledge', config.backgroundKnowledge.filter((_, i) => i !== idx))}
                            setIsKnowledgeSelectModalOpen={setIsKnowledgeSelectModalOpen}
                        />

                        <RulesSection 
                            coreRules={config.coreRules}
                            onRuleChange={handleCoreRuleChange}
                            onAddRule={addCoreRule}
                            onRemoveRule={removeCoreRule}
                        />

                        <EntitySection 
                            entities={config.initialEntities}
                            filteredEntities={filteredEntities}
                            loadingStates={loadingStates}
                            entitySearchTerm={entitySearchTerm}
                            setEntitySearchTerm={setEntitySearchTerm}
                            entityTypeFilter={entityTypeFilter}
                            setEntityTypeFilter={setEntityTypeFilter}
                            parsedMajorRealms={parsedMajorRealms}
                            parsedMinorRealms={parsedMinorRealms}
                            isCultivationSystemReady={isCultivationSystemReady}
                            onEntityChange={handleEntityChange}
                            onAddEntity={addEntity}
                            onRemoveEntity={removeEntity}
                            onRunAiAssist={runAiAssist}
                            generateName={aiService.generateEntityName}
                            generatePersonality={aiService.generateEntityPersonality}
                            generateDescription={aiService.generateEntityDescription}
                            worldConfig={config}
                        />
                    </div>

                    <div className="flex flex-col lg:w-1/2 space-y-8 mt-8 lg:mt-0">
                        <CharacterSection 
                            character={config.character}
                            loadingStates={loadingStates}
                            parsedMajorRealms={parsedMajorRealms}
                            parsedMinorRealms={parsedMinorRealms}
                            isCultivationSystemReady={isCultivationSystemReady}
                            onNestedChange={handleNestedChange}
                            onSkillChange={handleSkillChange}
                            onAddSkill={addSkill}
                            onRemoveSkill={removeSkill}
                            onGenerateBio={() => runAiAssist('bio', () => aiService.generateCharacterBio(config), res => handleNestedChange('character', 'bio', res))}
                            onGenerateSkills={() => runAiAssist('skills', () => aiService.generateCharacterSkills(config), res => handleNestedChange('character', 'skills', res))}
                            onGenerateSingleSkill={(idx) => runAiAssist(`skill_${idx}`, () => aiService.generateSingleSkill(config, config.character.skills[idx].name), res => handleSkillChange(idx, 'description', res.description))}
                            onGenerateMotivation={() => runAiAssist('motivation', () => aiService.generateCharacterMotivation(config), res => handleNestedChange('character', 'motivation', res))}
                        />
                    </div>
                </div>

                <div className="mt-12 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900/50 p-6 rounded-xl border border-slate-700 shadow-2xl">
                    <div className="flex gap-4">
                        <Button onClick={() => saveWorldConfigToFile(config)} variant="secondary" className="!w-auto !text-sm">
                            <Icon name="save" className="w-4 h-4 mr-2" /> Lưu Thiết Lập
                        </Button>
                        <Button onClick={() => fileInputRef.current?.click()} variant="special" className="!w-auto !text-sm">
                            <Icon name="upload" className="w-4 h-4 mr-2" /> Tải Thiết Lập
                        </Button>
                    </div>
                    <Button onClick={handleCreateWorld} variant="primary" className="!w-full sm:!w-auto !text-xl !px-12 !py-4 shadow-[0_0_30px_rgba(219,39,119,0.3)]">
                        Khởi Tạo Thế Giới
                    </Button>
                </div>
            </div>
            <style>{`.animate-fade-in { animation: fadeIn 0.5s ease-out; } @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </>
    );
};

export default WorldCreationScreen;
