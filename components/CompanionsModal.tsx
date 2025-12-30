
import React, { useState } from 'react';
import { GameState, Companion, Wife, Slave } from '../types';
import Icon from './common/Icon';
import Modal from './ui/Modal';
import Button from './common/Button';

interface CompanionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
  onCompanionAction: (companion: any, action: string) => void;
  onFreePerson: (id: string, type: 'wife' | 'slave' | 'companion') => void;
}

const CompanionsModal: React.FC<CompanionsModalProps> = ({ 
    isOpen, onClose, gameState, onCompanionAction, onFreePerson 
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'harem' | 'slaves' | 'others'>('harem');
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);

  if (!isOpen) return null;

  const { wives = [], slaves = [], companions = [] } = gameState;

  // Lọc companions không phải là wife hay slave đã có trong danh sách riêng
  const otherCompanions = companions.filter(c => 
    !wives.some(w => w.id === c.id) && !slaves.some(s => s.id === c.id)
  );

  const renderList = (list: any[], type: 'wife' | 'slave' | 'companion') => {
    if (list.length === 0) {
        return <p className="text-slate-500 text-center py-10 italic">Danh sách trống.</p>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {list.map((char) => (
                <div key={char.id} className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <h3 className="font-bold text-lg text-pink-300">{char.name}</h3>
                            <p className="text-xs text-slate-400">{char.realm || char.species || 'Cảnh giới chưa rõ'}</p>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-xs font-semibold text-cyan-400">Thiện cảm: {char.affinity || 0}</span>
                            {type === 'slave' && <span className="text-xs text-red-400">Phục tùng: {char.obedience || 0}</span>}
                        </div>
                    </div>
                    
                    <p className="text-sm text-slate-300 line-clamp-2 mb-4 italic">"{char.description}"</p>
                    
                    <div className="mt-auto flex gap-2">
                        <Button 
                            onClick={() => onCompanionAction(char, "Trò chuyện")} 
                            variant="secondary" 
                            className="!py-1.5 !text-xs !w-auto !px-3"
                        >
                            <Icon name="news" className="w-3.5 h-3.5 mr-1" /> Tương tác
                        </Button>
                        <Button 
                            onClick={() => onFreePerson(char.id, type as any)} 
                            variant="warning" 
                            className="!py-1.5 !text-xs !w-auto !px-3"
                        >
                            <Icon name="trash" className="w-3.5 h-3.5 mr-1" /> Giải phóng
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quản Lý Đồng Hành & Hậu Cung">
        <div className="flex flex-col h-[70vh]">
            <div className="flex border-b border-slate-700 mb-6 flex-shrink-0">
                <button 
                    onClick={() => setActiveSubTab('harem')}
                    className={`flex-1 py-3 text-sm font-bold transition-colors ${activeSubTab === 'harem' ? 'text-pink-400 border-b-2 border-pink-500 bg-pink-500/10' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    Đạo Lữ ({wives.length})
                </button>
                <button 
                    onClick={() => setActiveSubTab('slaves')}
                    className={`flex-1 py-3 text-sm font-bold transition-colors ${activeSubTab === 'slaves' ? 'text-purple-400 border-b-2 border-purple-500 bg-purple-500/10' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    Nô Lệ ({slaves.length})
                </button>
                <button 
                    onClick={() => setActiveSubTab('others')}
                    className={`flex-1 py-3 text-sm font-bold transition-colors ${activeSubTab === 'others' ? 'text-cyan-400 border-b-2 border-cyan-500 bg-cyan-500/10' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    Bạn Đồng Hành ({otherCompanions.length})
                </button>
            </div>

            <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
                {activeSubTab === 'harem' && renderList(wives, 'wife')}
                {activeSubTab === 'slaves' && renderList(slaves, 'slave')}
                {activeSubTab === 'others' && renderList(otherCompanions, 'companion')}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-700 flex justify-end flex-shrink-0">
                <Button onClick={onClose} variant="secondary" className="!w-auto !py-2 !px-6">Đóng</Button>
            </div>
        </div>
    </Modal>
  );
};

export default CompanionsModal;
