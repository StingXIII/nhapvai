import React from 'react';
import Icon from '../../common/Icon';
import Button from '../../common/Button';
import { FormRow, StyledSelect } from './constants';
import { WorldConfig } from '../../../types';
import { 
    DIFFICULTY_OPTIONS, 
    AI_RESPONSE_LENGTH_OPTIONS, 
    SEXUAL_CONTENT_STYLE_OPTIONS, 
    VIOLENCE_LEVEL_OPTIONS, 
    STORY_TONE_OPTIONS 
} from '../../../constants';
import { NSFW_TRANSLATIONS } from '../../../constants/nsfw';

interface DifficultySectionProps {
    config: WorldConfig;
    isSafetyFilterEnabled: boolean;
    knowledgeFileInputRef: React.RefObject<HTMLInputElement | null>;
    onSimpleChange: <T extends keyof WorldConfig>(key: T, value: WorldConfig[T]) => void;
    onAdultContentClick: () => void;
    onRemoveKnowledgeFile: (index: number) => void;
    setIsKnowledgeSelectModalOpen: (open: boolean) => void;
}

const DifficultySection: React.FC<DifficultySectionProps> = ({
    config,
    isSafetyFilterEnabled,
    knowledgeFileInputRef,
    onSimpleChange,
    onAdultContentClick,
    onRemoveKnowledgeFile,
    setIsKnowledgeSelectModalOpen
}) => {
    // Truy xuất hướng dẫn Độ khó
    const getDifficultyGuidance = (val: string) => {
        if (val.includes('Dễ')) return NSFW_TRANSLATIONS.difficultyGuidanceEasy;
        if (val.includes('Thường')) return NSFW_TRANSLATIONS.difficultyGuidanceNormal;
        if (val.includes('Khó')) return NSFW_TRANSLATIONS.difficultyGuidanceHard;
        if (val.includes('Ác Mộng')) return NSFW_TRANSLATIONS.difficultyGuidanceNightmare;
        return '';
    };

    // Truy xuất hướng dẫn phong cách NSFW
    const getNsfwStyleGuidance = (val: string) => {
        switch(val) {
            case 'Hoa Mỹ': return NSFW_TRANSLATIONS.nsfwGuidanceHoaMy;
            case 'Trần Tục': return NSFW_TRANSLATIONS.nsfwGuidanceTranTuc;
            case 'Gợi Cảm': return NSFW_TRANSLATIONS.nsfwGuidanceGoiCam;
            case 'Mạnh Bạo (BDSM)': return NSFW_TRANSLATIONS.nsfwGuidanceManhBaoBDSM;
            default: return '';
        }
    };

    // Truy xuất hướng dẫn mức độ bạo lực
    const getViolenceGuidance = (val: string) => {
        switch(val) {
            case 'Nhẹ Nhàng': return NSFW_TRANSLATIONS.violenceLevelGuidanceNheNhang;
            case 'Thực Tế': return NSFW_TRANSLATIONS.violenceLevelGuidanceThucTe;
            case 'Cực Đoan': return NSFW_TRANSLATIONS.violenceLevelGuidanceCucDoan;
            default: return '';
        }
    };

    // Truy xuất hướng dẫn tông màu truyện
    const getToneGuidance = (val: string) => {
        switch(val) {
            case 'Tích Cực': return NSFW_TRANSLATIONS.storyToneGuidanceTichCuc;
            case 'Trung Tính': return NSFW_TRANSLATIONS.storyToneGuidanceTrungTinh;
            case 'Đen Tối': return NSFW_TRANSLATIONS.storyToneGuidanceDenToi;
            case 'Dâm Dục': return NSFW_TRANSLATIONS.storyToneGuidanceDamDuc;
            case 'Hoang Dâm': return NSFW_TRANSLATIONS.storyToneGuidanceHoangDam;
            case 'Dâm Loạn': return NSFW_TRANSLATIONS.storyToneGuidanceDamLoan;
            default: return '';
        }
    };

    // Thành phần hiển thị gợi ý nhỏ gọn
    const GuidanceBox: React.FC<{ text: string }> = ({ text }) => {
        if (!text) return null;
        // Trích xuất câu đầu tiên để không chiếm quá nhiều diện tích UI
        const previewText = text.split('\n')[0].replace(/\*\*/g, '').replace('LƯU Ý QUAN TRỌNG: ', '');
        return (
            <div className="mt-2 p-2 bg-slate-900/60 border-l-2 border-slate-600 text-[10px] text-slate-400 italic animate-fade-in leading-relaxed">
                {previewText}
            </div>
        );
    };

    return (
        <div className="bg-slate-800/60 backdrop-blur-sm rounded-lg border-l-4 border-lime-500 p-4 shadow-lg">
            <h3 className="text-xl font-bold text-left text-lime-400 mb-4 flex items-center">
                <Icon name="difficulty" className="w-6 h-6 mr-3"/>
                Thử Thách & Văn Phong
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col">
                    <FormRow label="Chọn Độ Khó" labelClassName="text-lime-300">
                        <StyledSelect 
                            value={config.difficulty} 
                            onChange={e => onSimpleChange('difficulty', e.target.value)}
                        >
                            {DIFFICULTY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </StyledSelect>
                        <GuidanceBox text={getDifficultyGuidance(config.difficulty)} />
                    </FormRow>
                </div>
                
                <FormRow label="Độ Dài Phản Hồi AI" labelClassName="text-lime-300">
                    <StyledSelect 
                        value={config.aiResponseLength || AI_RESPONSE_LENGTH_OPTIONS[0]} 
                        onChange={e => onSimpleChange('aiResponseLength', e.target.value)}
                    >
                        {AI_RESPONSE_LENGTH_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </StyledSelect>
                    <div className="mt-2 text-[10px] text-slate-500 italic">
                        * Ảnh hưởng đến độ chi tiết của các cảnh diễn họa.
                    </div>
                </FormRow>
            </div>

            <div className="mt-4 border-t border-slate-700 pt-4">
                <FormRow label="Kiến thức nền AI" labelClassName="text-lime-300" tooltip="Tải lên tệp nguyên tác (.txt) hoặc dataset (.json) để AI hiểu sâu về thế giới của bạn.">
                    <div className="flex flex-wrap gap-2 mt-1">
                        <Button onClick={() => setIsKnowledgeSelectModalOpen(true)} variant="secondary" className="!w-auto !text-[11px] !py-1.5 !px-3">
                            <Icon name="save" className="w-4 h-4 mr-1.5" /> Chọn từ Kho
                        </Button>
                        <Button onClick={() => knowledgeFileInputRef.current?.click()} variant="secondary" className="!w-auto !text-[11px] !py-1.5 !px-3">
                            <Icon name="upload" className="w-4 h-4 mr-1.5" /> Tải từ máy
                        </Button>
                    </div>
                    
                    {config.backgroundKnowledge && config.backgroundKnowledge.length > 0 && (
                        <div className="mt-3 space-y-2">
                            <ul className="space-y-1 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                                {config.backgroundKnowledge.map((file, index) => (
                                    <li key={index} className="flex items-center justify-between bg-slate-900/50 p-2 rounded-md border border-slate-700/50 text-[10px]">
                                        <div className="flex items-center gap-2 truncate">
                                            {file.name.endsWith('.json') ? <Icon name="key" className="w-3 h-3 text-yellow-500" /> : <Icon name="news" className="w-3 h-3 text-slate-400" />}
                                            <span className="text-slate-300 truncate">{file.name}</span>
                                        </div>
                                        <button onClick={() => onRemoveKnowledgeFile(index)} className="text-red-400 hover:text-red-300">
                                            <Icon name="trash" className="w-3.5 h-3.5"/>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </FormRow>
            </div>
            
            {/* Giao thức 18+ */}
            <div className="flex items-center space-x-3 mt-6 border-t border-slate-700 pt-4">
                <div className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="adult-content-toggle" 
                        checked={config.allowAdultContent}
                        onChange={e => onSimpleChange('allowAdultContent', e.target.checked)}
                        onClick={onAdultContentClick}
                        disabled={isSafetyFilterEnabled}
                        className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600 shadow-[0_0_10px_rgba(219,39,119,0.3)]"></div>
                </div>
                <label htmlFor="adult-content-toggle" className={`text-base font-black uppercase italic tracking-tighter cursor-pointer select-none transition-colors ${isSafetyFilterEnabled ? 'text-slate-500' : 'text-pink-400 hover:text-pink-300'}`}>
                    Kích hoạt Giao thức Người Lớn (18+)
                </label>
            </div>

            {config.allowAdultContent && !isSafetyFilterEnabled && (
                <div className="mt-4 space-y-4 border-t border-slate-700 pt-4 animate-fade-in bg-pink-900/5 p-4 rounded-xl border border-pink-500/10">
                    <div>
                        <FormRow label="Phong Cách Miêu Tả Tình Dục" labelClassName="text-pink-300 font-bold">
                            <StyledSelect 
                                value={config.sexualContentStyle} 
                                onChange={e => onSimpleChange('sexualContentStyle', e.target.value as any)}
                                className="!border-pink-900/30 !bg-slate-900/80"
                            >
                                {SEXUAL_CONTENT_STYLE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </StyledSelect>
                            <GuidanceBox text={getNsfwStyleGuidance(config.sexualContentStyle || '')} />
                        </FormRow>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <FormRow label="Mức Độ Bạo Lực" labelClassName="text-pink-300 font-bold">
                                <StyledSelect 
                                    value={config.violenceLevel} 
                                    onChange={e => onSimpleChange('violenceLevel', e.target.value as any)}
                                    className="!border-pink-900/30 !bg-slate-900/80"
                                >
                                    {VIOLENCE_LEVEL_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </StyledSelect>
                                <GuidanceBox text={getViolenceGuidance(config.violenceLevel || '')} />
                            </FormRow>
                        </div>
                        <div>
                            <FormRow label="Tông Màu Truyện" labelClassName="text-pink-300 font-bold">
                                <StyledSelect 
                                    value={config.storyTone} 
                                    onChange={e => onSimpleChange('storyTone', e.target.value as any)}
                                    className="!border-pink-900/30 !bg-slate-900/80"
                                >
                                    {STORY_TONE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </StyledSelect>
                                <GuidanceBox text={getToneGuidance(config.storyTone || '')} />
                            </FormRow>
                        </div>
                    </div>
                    <p className="text-[9px] text-pink-400/50 text-center font-medium uppercase tracking-[0.2em] mt-2">
                        Giao thức này yêu cầu Gemini API tắt bộ lọc an toàn.
                    </p>
                </div>  
            )}
        </div>
    );
};

export default DifficultySection;