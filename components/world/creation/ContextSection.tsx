import React from 'react';
import Icon from '../../common/Icon';
import AiAssistButton from '../../common/AiAssistButton';
import { StyledInput, StyledTextArea, StyledSelect, FormRow, LoadingStates } from './constants';
import { WorldConfig } from '../../../types';
import { GENRES } from '../../../constants/genres';

interface ContextSectionProps {
    storyContext: WorldConfig['storyContext'];
    isCustomGenre: boolean;
    loadingStates: LoadingStates;
    onNestedChange: (parent: 'storyContext', child: string, value: any) => void;
    onGenerateSetting: () => void;
}

const ContextSection: React.FC<ContextSectionProps> = ({
    storyContext,
    isCustomGenre,
    loadingStates,
    onNestedChange,
    onGenerateSetting
}) => {
    return (
        <div className="bg-slate-800/60 backdrop-blur-sm rounded-lg border-l-4 border-sky-500 p-4 shadow-lg">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-left text-sky-400 flex items-center">
                    <Icon name="world" className="w-6 h-6 mr-3"/>
                    Bối Cảnh Truyện
                </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <FormRow label="Tên Thế Giới:" labelClassName="text-sky-300">
                    <StyledInput 
                        value={storyContext.worldName} 
                        onChange={e => onNestedChange('storyContext', 'worldName', e.target.value)} 
                        placeholder="VD: Lục Địa Gió, Tinh Hệ X..."
                    />
                </FormRow>
                
                <div>
                    <FormRow label="Thể loại:" labelClassName="text-sky-300">
                        <StyledSelect
                            value={isCustomGenre ? 'Tùy chỉnh' : storyContext.genre}
                            onChange={e => onNestedChange('storyContext', 'genre', e.target.value)}
                        >
                            {GENRES.map(genre => (
                                <option key={genre.name} value={genre.name}>{genre.name}</option>
                            ))}
                        </StyledSelect>
                    </FormRow>
                    {isCustomGenre && (
                        <StyledInput
                            value={storyContext.genre}
                            onChange={e => onNestedChange('storyContext', 'genre', e.target.value)}
                            placeholder="Nhập thể loại tùy chỉnh/hỗn hợp..."
                            className="mt-2 animate-fade-in"
                        />
                    )}
                </div>
            </div>

            <div>
                <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-sky-300">Thế Giới/Bối Cảnh Cụ Thể:</label>
                    <AiAssistButton 
                        isLoading={loadingStates['setting']} 
                        onClick={onGenerateSetting} 
                    >
                        Tạo Bối Cảnh
                    </AiAssistButton>
                </div>
                <StyledTextArea 
                    value={storyContext.setting} 
                    onChange={e => onNestedChange('storyContext', 'setting', e.target.value)} 
                    rows={4} 
                    placeholder="VD: Một vương quốc bay lơ lửng trên mây, nơi các hiệp sĩ cưỡi rồng bảo vệ những hòn đảo đá huyền bí..."
                />
            </div>
        </div>
    );
};

export default ContextSection;