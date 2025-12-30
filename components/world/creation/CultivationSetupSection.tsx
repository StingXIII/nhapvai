
import React from 'react';
import Icon from '../../common/Icon';
import Button from '../../common/Button';
import Accordion from '../../common/Accordion';
import { FormRow, StyledTextArea, StyledInput } from './constants';
import { WorldConfig } from '../../../types';

interface CultivationSetupSectionProps {
    cultivationSystem: WorldConfig['cultivationSystem'];
    onNestedChange: (parent: 'cultivationSystem', child: string, value: any) => void;
    onSetup: () => void;
}

const CultivationSetupSection: React.FC<CultivationSetupSectionProps> = ({
    cultivationSystem,
    onNestedChange,
    onSetup
}) => {
    return (
        <Accordion 
            title="Hệ thống Tu Luyện (Tùy Chỉnh)" 
            icon={<Icon name="magic" />} 
            titleClassName="text-indigo-400" 
            borderColorClass="border-indigo-500"
        >
            <p className="text-xs text-slate-400 mb-4 italic">
                Định nghĩa hệ thống cấp bậc sức mạnh. Hệ thống sẽ tự động tính toán chỉ số dựa trên các cảnh giới này để cân bằng game.
            </p>
            
            <div className="space-y-4">
                <FormRow 
                    label="Danh sách Đại Cảnh Giới (Thấp -> Cao):" 
                    labelClassName="text-indigo-300" 
                    tooltip="Các cấp bậc chính, phân cách bằng dấu gạch ngang (-). VD: Luyện Khí - Trúc Cơ - Kim Đan"
                >
                    <StyledTextArea
                        rows={2}
                        value={cultivationSystem?.majorRealms || ''}
                        onChange={e => onNestedChange('cultivationSystem', 'majorRealms', e.target.value)}
                        placeholder="VD: Luyện Khí - Trúc Cơ - Kim Đan - Nguyên Anh - Hóa Thần"
                    />
                </FormRow>

                <FormRow 
                    label="Danh sách Tiểu Cảnh Giới:" 
                    labelClassName="text-indigo-300" 
                    tooltip="Các cấp nhỏ trong mỗi đại cảnh giới. Hỗ trợ cú pháp dải số. VD: 'Sơ kỳ - Hậu kỳ', 'Tầng 1 - Tầng 9', 'Nhất Trọng - Cửu Trọng'."
                >
                    <StyledInput
                        value={cultivationSystem?.minorRealms || ''}
                        onChange={e => onNestedChange('cultivationSystem', 'minorRealms', e.target.value)}
                        placeholder="VD: Sơ kỳ - Trung kỳ - Hậu kỳ - Đỉnh phong"
                    />
                </FormRow>

                <div className="bg-indigo-900/20 p-3 rounded border border-indigo-500/30">
                    <p className="text-[10px] text-indigo-300 leading-relaxed">
                        <span className="font-bold text-yellow-500">Mẹo:</span> Sử dụng cú pháp <code className="bg-slate-900 px-1 rounded text-pink-400">[Đơn vị] 1 - [Đơn vị] 9</code> (VD: Tầng 1 - Tầng 9) để hệ thống tự động tạo danh sách dài.
                    </p>
                </div>
                
                <Button 
                    onClick={onSetup} 
                    variant="success" 
                    className="!w-full !text-base !py-2.5 mt-2 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                >
                    <Icon name="checkCircle" className="w-5 h-5 mr-2"/>
                    Thiết lập & Cập nhật Căn cơ
                </Button>
            </div>
        </Accordion>
    );
};

export default CultivationSetupSection;
