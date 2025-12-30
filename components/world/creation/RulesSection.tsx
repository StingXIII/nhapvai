import React from 'react';
import Icon from '../../common/Icon';
import Button from '../../common/Button';
import Accordion from '../../common/Accordion';
import { StyledInput } from './constants';

interface RulesSectionProps {
    coreRules: string[];
    onRuleChange: (index: number, value: string) => void;
    onAddRule: () => void;
    onRemoveRule: (index: number) => void;
}

const RulesSection: React.FC<RulesSectionProps> = ({
    coreRules,
    onRuleChange,
    onAddRule,
    onRemoveRule
}) => {
    return (
        <Accordion 
            title="Luật Lệ Cốt Lõi Của Thế Giới (Bất biến khi vào game)" 
            icon={<Icon name="rules" />} 
            titleClassName="text-yellow-400" 
            borderColorClass="border-yellow-500"
        >
            <div className="max-h-96 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                <p className="text-xs text-slate-400 mb-2 italic">
                    Xác định các quy luật vật lý, xã hội hoặc hệ thống sức mạnh không thể thay đổi. AI sẽ coi đây là "Chân lý" của thế giới.
                </p>
                
                {coreRules.map((rule, index) => (
                    <div key={index} className="flex items-center space-x-2 animate-fade-in">
                        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded bg-slate-900 border border-yellow-900/30 text-yellow-500 font-mono text-xs font-bold">
                            {index + 1}
                        </div>
                        <StyledInput 
                            value={rule} 
                            onChange={e => onRuleChange(index, e.target.value)} 
                            placeholder={`VD: Kẻ mạnh có quyền sinh sát, Linh khí đang dần cạn kiệt...`} 
                        />
                        <button 
                            onClick={() => onRemoveRule(index)} 
                            className="p-2 text-red-400 hover:bg-red-500/20 rounded-full transition flex-shrink-0"
                            title="Xóa luật này"
                        >
                            <Icon name="trash" className="w-5 h-5"/>
                        </button>
                    </div>
                ))}
                
                {coreRules.length === 0 && (
                    <div className="text-center py-6 bg-slate-900/20 rounded border border-dashed border-slate-700">
                        <p className="text-slate-500 text-sm italic">Chưa có luật lệ cốt lõi nào được định nghĩa.</p>
                    </div>
                )}

                <Button onClick={onAddRule} variant="warning" className="!w-full !text-base !py-2.5 mt-2">
                    <Icon name="plus" className="w-5 h-5 mr-2"/>
                    Thêm Luật Lệ Mới
                </Button>
            </div>
        </Accordion>
    );
};

export default RulesSection;