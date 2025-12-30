import React from 'react';
import Icon from '../../common/Icon';
import Button from '../../common/Button';
import Accordion from '../../common/Accordion';
import AiAssistButton from '../../common/AiAssistButton';
import RealmSelector from '../../RealmSelector';
import { StyledInput, StyledTextArea, StyledSelect, FormRow, LoadingStates } from './constants';
import { InitialEntity } from '../../../types';
import { ENTITY_TYPE_OPTIONS } from '../../../constants';

interface EntitySectionProps {
    entities: InitialEntity[];
    filteredEntities: { entity: InitialEntity; originalIndex: number }[];
    loadingStates: LoadingStates;
    entitySearchTerm: string;
    setEntitySearchTerm: (val: string) => void;
    entityTypeFilter: string;
    setEntityTypeFilter: (val: string) => void;
    parsedMajorRealms: string[];
    parsedMinorRealms: string[];
    isCultivationSystemReady: boolean;
    onEntityChange: (index: number, field: any, value: string) => void;
    onAddEntity: () => void;
    onRemoveEntity: (index: number) => void;
    onRunAiAssist: (field: string, action: () => Promise<any>, setter: (res: any) => void) => void;
    // AI Actions from worldGenService
    generateName: (config: any, entity: InitialEntity) => Promise<string>;
    generatePersonality: (config: any, entity: InitialEntity) => Promise<string>;
    generateDescription: (config: any, entity: InitialEntity) => Promise<string>;
    worldConfig: any;
}

const EntitySection: React.FC<EntitySectionProps> = ({
    filteredEntities,
    loadingStates,
    entitySearchTerm,
    setEntitySearchTerm,
    entityTypeFilter,
    setEntityTypeFilter,
    parsedMajorRealms,
    parsedMinorRealms,
    isCultivationSystemReady,
    onEntityChange,
    onAddEntity,
    onRemoveEntity,
    onRunAiAssist,
    generateName,
    generatePersonality,
    generateDescription,
    worldConfig
}) => {
    return (
        <Accordion 
            title="Kiến Tạo Thực Thể Ban Đầu (Tùy chọn)" 
            icon={<Icon name="entity" />} 
            titleClassName="text-green-400" 
            borderColorClass="border-green-500"
        >
            {/* Thanh công cụ tìm kiếm và lọc */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <StyledInput
                    placeholder="Tìm kiếm theo tên thực thể..."
                    value={entitySearchTerm}
                    onChange={(e) => setEntitySearchTerm(e.target.value)}
                    className="!bg-slate-900/40"
                />
                <StyledSelect
                    value={entityTypeFilter}
                    onChange={(e) => setEntityTypeFilter(e.target.value)}
                    className="!bg-slate-900/40"
                >
                    <option value="Tất cả">Tất cả các loại</option>
                    {ENTITY_TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </StyledSelect>
            </div>

            {/* Danh sách thực thể */}
            <div className="max-h-[600px] overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                {filteredEntities.length > 0 ? (
                    filteredEntities.map(({ entity, originalIndex }) => (
                        <div key={originalIndex} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 animate-fade-in relative group">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-sm font-medium text-green-300">Tên Thực Thể:</label>
                                        <AiAssistButton 
                                            isLoading={loadingStates[`entity_name_${originalIndex}`]} 
                                            onClick={() => onRunAiAssist(
                                                `entity_name_${originalIndex}`, 
                                                () => generateName(worldConfig, entity), 
                                                res => onEntityChange(originalIndex, 'name', res)
                                            )} 
                                        />
                                    </div>
                                    <StyledInput 
                                        value={entity.name} 
                                        onChange={e => onEntityChange(originalIndex, 'name', e.target.value)}
                                        placeholder="VD: Lão Ma Đầu, Thanh Cổ Kiếm..."
                                    />
                                </div>
                                <FormRow label="Loại Thực Thể:" labelClassName="text-green-300">
                                    <StyledSelect 
                                        value={entity.customCategory || entity.type}
                                        onChange={e => onEntityChange(originalIndex, 'type_select', e.target.value)}
                                    >
                                        {ENTITY_TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </StyledSelect>
                                </FormRow>
                            </div>

                            {entity.type === 'NPC' && (
                                <div className="mt-4 space-y-4 animate-fade-in">
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-sm font-medium text-green-300">Tính Cách (NPC):</label>
                                            <AiAssistButton 
                                                isLoading={loadingStates[`entity_personality_${originalIndex}`]} 
                                                onClick={() => onRunAiAssist(
                                                    `entity_personality_${originalIndex}`, 
                                                    () => generatePersonality(worldConfig, entity), 
                                                    res => onEntityChange(originalIndex, 'personality', res)
                                                )} 
                                            />
                                        </div>
                                        <StyledTextArea 
                                            value={entity.personality} 
                                            onChange={e => onEntityChange(originalIndex, 'personality', e.target.value)}
                                            rows={2}
                                            placeholder="VD: Lạnh lùng, đa nghi, luôn toan tính lợi ích..."
                                        />
                                    </div>
                                    
                                    <RealmSelector
                                        label="Cảnh giới (Tùy chọn):"
                                        value={entity.initialRealm || ''}
                                        onChange={(val) => onEntityChange(originalIndex, 'initialRealm', val)}
                                        majorOptions={parsedMajorRealms}
                                        minorOptions={parsedMinorRealms}
                                        isSystemReady={isCultivationSystemReady}
                                        labelClassName="text-green-300"
                                    />
                                </div>
                            )}

                            <div className="mt-4">
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-sm font-medium text-green-300">Mô Tả Thực Thể:</label>
                                    <AiAssistButton 
                                        isLoading={loadingStates[`entity_description_${originalIndex}`]} 
                                        onClick={() => onRunAiAssist(
                                            `entity_description_${originalIndex}`, 
                                            () => generateDescription(worldConfig, entity), 
                                            res => onEntityChange(originalIndex, 'description', res)
                                        )} 
                                    />
                                </div>
                                <StyledTextArea 
                                    value={entity.description} 
                                    onChange={e => onEntityChange(originalIndex, 'description', e.target.value)}
                                    rows={3}
                                    placeholder="Mô tả ngoại hình, lịch sử hoặc tính chất đặc biệt..."
                                />
                            </div>
                            
                            <div className="flex justify-end mt-3 pt-3 border-t border-slate-800">
                                <button 
                                    onClick={() => onRemoveEntity(originalIndex)} 
                                    className="flex items-center text-xs font-bold text-red-400 hover:text-red-300 transition uppercase tracking-wider"
                                >
                                    <Icon name="trash" className="w-4 h-4 mr-1.5"/>
                                    Loại bỏ thực thể
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-10 bg-slate-900/20 rounded-lg border border-dashed border-slate-700">
                        <p className="text-slate-500 italic">Không tìm thấy thực thể nào phù hợp với tìm kiếm.</p>
                    </div>
                )}
                
                <Button onClick={onAddEntity} variant="success" className="!w-full !text-base !py-3">
                    <Icon name="plus" className="w-5 h-5 mr-2"/>
                    Thêm Thực Thể Mới
                </Button>
            </div>
        </Accordion>
    );
};

export default EntitySection;