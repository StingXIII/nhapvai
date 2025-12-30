import React, { useState } from 'react';
import Modal from '../../ui/Modal';
import Button from '../../common/Button';
import { KnowledgeBase } from '../../../types';

interface CompanionSelectionForCombatModalProps {
  isOpen: boolean;
  onClose: () => void;
  knowledgeBase: KnowledgeBase;
  onSave: (selectedIds: string[]) => void;
  initialSelection: string[];
}

const CompanionSelectionForCombatModal: React.FC<CompanionSelectionForCombatModalProps> = ({
  isOpen,
  onClose,
  knowledgeBase,
  onSave,
  initialSelection
}) => {
  const [selected, setSelected] = useState<string[]>(initialSelection);

  // Lấy danh sách ID kẻ địch để loại trừ
  const opponentIds = knowledgeBase.pendingCombat?.opponentIds || [];

  const companions = [
      ...knowledgeBase.discoveredNPCs,
      ...knowledgeBase.wives,
      ...knowledgeBase.slaves,
      ...knowledgeBase.prisoners
  ].filter(c => !opponentIds.includes(c.id)); // FIX: Không cho phép chọn kẻ địch làm đồng hành

  const handleToggle = (id: string) => {
    if (selected.includes(id)) {
      setSelected(selected.filter(s => s !== id));
    } else {
      setSelected([...selected, id]);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Chọn Đồng Hành">
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {companions.length === 0 && <p className="text-slate-400">Không có đồng hành nào khả dụng (hoặc tất cả đang là kẻ địch).</p>}
        {companions.map(c => (
          <div key={c.id} className="flex items-center gap-2 p-2 bg-slate-700/50 rounded cursor-pointer" onClick={() => handleToggle(c.id)}>
            <input type="checkbox" checked={selected.includes(c.id)} readOnly className="h-4 w-4"/>
            <span className="text-slate-200">{c.name}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button onClick={onClose} variant="secondary">Hủy</Button>
        <Button onClick={() => { onSave(selected); onClose(); }} variant="primary">Lưu</Button>
      </div>
    </Modal>
  );
};

export default CompanionSelectionForCombatModal;