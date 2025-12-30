import React from 'react';
import Icon from '../../common/Icon';
import Button from '../../common/Button';
import AiAssistButton from '../../common/AiAssistButton';
import RealmSelector from '../../RealmSelector';
import { StyledInput, StyledTextArea, StyledSelect, FormRow, LoadingStates } from './constants';
import { WorldConfig } from '../../../types';
import { GENDER_OPTIONS, PERSONALITY_OPTIONS } from '../../../constants';

interface CharacterSectionProps {
    character: WorldConfig['character'];
    loadingStates: LoadingStates;
    parsedMajorRealms: string[];
    parsedMinorRealms: string[];
    isCultivationSystemReady: boolean;
    onNestedChange: (parent: 'character', child: string, value: any) => void;
    onSkillChange: (index: number, key: 'name' | 'description', value: string) => void;
    onAddSkill: () => void;
    onRemoveSkill: (index: number) => void;
    onGenerateBio: () => void;
    onGenerateSkills: () => void;
    onGenerateSingleSkill: (index: number) => void;
    onGenerateMotivation: () => void;
}

const CharacterSection: React.FC<CharacterSectionProps> = ({
    character,
    loadingStates,
    parsedMajorRealms,
    parsedMinorRealms,
    isCultivationSystemReady,
    onNestedChange,
    onSkillChange,
    onAddSkill,
    onRemoveSkill,
    onGenerateBio,
    onGenerateSkills,
    onGenerateSingleSkill,
    onGenerateMotivation
}) => {
    return (
        <div className="bg-slate-800/60 backdrop-blur-sm rounded-lg border-l-4 border-pink-500 p-4 shadow-lg h-full">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-left text-pink-400 flex items-center">
                    <Icon name="user" className="w-6 h-6 mr-3"/>
                    Nhân Vật Chính
                </h3>
            </div>

            <FormRow label="Danh xưng (Tên nhân vật):" labelClassName="text-pink-300">
                <StyledInput 
                    value={character.name} 
                    onChange={e => onNestedChange('character', 'name', e.target.value)} 
                    placeholder="VD: Trần Dạ, Luna Nguyễn, K-7..."
                />
            </FormRow>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormRow label="Giới tính" labelClassName="text-pink-300">
                    <StyledSelect 
                        value={character.gender} 
                        onChange={e => onNestedChange('character', 'gender', e.target.value)}
                    >
                        {GENDER_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </StyledSelect>
                </FormRow>
                <FormRow label="Tính cách" labelClassName="text-pink-300">
                    <StyledSelect 
                        value={character.personality} 
                        onChange={e => onNestedChange('character', 'personality', e.target.value)}
                    >
                        {PERSONALITY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </StyledSelect>
                </FormRow>
            </div>

            {character.personality === 'Tuỳ chỉnh' && (
                <FormRow label="Mô tả tính cách tùy chỉnh" labelClassName="text-pink-300">
                    <StyledTextArea 
                        value={character.customPersonality} 
                        onChange={e => onNestedChange('character', 'customPersonality', e.target.value)} 
                        rows={2} 
                        placeholder="VD: Một người cộc cằn nhưng trọng tình nghĩa..."
                    />
                </FormRow>
            )}

            <div className="my-4">
                <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-pink-300">Sơ Lược Tiểu Sử/Ngoại hình:</label>
                    <AiAssistButton isLoading={loadingStates['bio']} onClick={onGenerateBio} />
                </div>
                <StyledTextArea 
                    value={character.bio} 
                    onChange={e => onNestedChange('character', 'bio', e.target.value)} 
                    rows={3} 
                    placeholder="VD: Là đứa con cuối cùng của một gia tộc cổ xưa đã lụi tàn..."
                />
            </div>
            
            <RealmSelector
                label="Cảnh giới ban đầu (Tùy chọn):"
                value={character.initialRealm || ''}
                onChange={(val) => onNestedChange('character', 'initialRealm', val)}
                majorOptions={parsedMajorRealms}
                minorOptions={parsedMinorRealms}
                isSystemReady={isCultivationSystemReady}
                labelClassName="text-pink-300"
            />

            <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-pink-300">Kỹ Năng Khởi Đầu (Tùy chọn):</label>
                    <AiAssistButton isLoading={loadingStates['skills']} onClick={onGenerateSkills} />
                </div>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                    {character.skills.map((skill, index) => (
                        <div key={index} className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 animate-fade-in">
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-slate-400 uppercase">Kỹ năng {index + 1}</span>
                                    <AiAssistButton 
                                        isLoading={loadingStates[`skill_${index}`]} 
                                        onClick={() => onGenerateSingleSkill(index)} 
                                    />
                                </div>
                                <button 
                                    onClick={() => onRemoveSkill(index)} 
                                    className="p-1 text-red-400 hover:bg-red-500/20 rounded-full transition"
                                >
                                    <Icon name="trash" className="w-4 h-4"/>
                                </button>
                            </div>
                            <div className="space-y-2">
                                <StyledInput 
                                    value={skill.name} 
                                    onChange={e => onSkillChange(index, 'name', e.target.value)} 
                                    placeholder="Tên kỹ năng..."
                                    className="!py-1 !text-sm"
                                />
                                <StyledTextArea 
                                    value={skill.description} 
                                    onChange={e => onSkillChange(index, 'description', e.target.value)} 
                                    rows={2} 
                                    placeholder="Mô tả kỹ năng..."
                                    className="!py-1 !text-sm"
                                />
                            </div>
                        </div>
                    ))}
                    <Button onClick={onAddSkill} variant="special" className="!w-full !text-sm !py-2">
                        <Icon name="plus" className="w-4 h-4 mr-2"/>
                        Thêm Kỹ Năng
                    </Button>
                </div>
            </div>

            <div>
                <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-pink-300">Mục Tiêu/Động Lực:</label>
                    <AiAssistButton isLoading={loadingStates['motivation']} onClick={onGenerateMotivation} />
                </div>
                <StyledTextArea 
                    value={character.motivation} 
                    onChange={e => onNestedChange('character', 'motivation', e.target.value)} 
                    rows={2} 
                    placeholder="VD: Tìm lại di vật của gia đình và phục hưng tông môn..."
                />
            </div>
        </div>
    );
};

export default CharacterSection;