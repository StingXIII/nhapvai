import React, { useState, useEffect } from 'react';
import { DefeatedEntity, CombatDispositionMap, CombatDisposition } from '../../types';
import Modal from '../ui/Modal';
import Button from '../common/Button';

interface PostCombatDecisionModalProps {
    isOpen: boolean;
    onClose: () => void;
    defeatedEntities: DefeatedEntity[];
    onConfirm: (dispositions: CombatDispositionMap) => void;
    isLoading: boolean;
}

export const PostCombatDecisionModal: React.FC<PostCombatDecisionModalProps> = ({
    isOpen,
    onClose,
    defeatedEntities,
    onConfirm,
    isLoading,
}) => {
    const [dispositions, setDispositions] = useState<CombatDispositionMap>({});

    useEffect(() => {
        const initial: CombatDispositionMap = {};
        defeatedEntities.forEach((e) => {
            initial[e.id] = 'release';
        });
        setDispositions(initial);
    }, [defeatedEntities]);

    const handleSelect = (id: string, value: CombatDisposition) => {
        setDispositions((prev) => ({ ...prev, [id]: value }));
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Quyết Định Sau Trận Đấu">
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {defeatedEntities.length === 0 && (
                    <p className="text-slate-400 text-center py-8 italic">
                        Không có đối thủ nào bị đánh bại để xử lý.
                    </p>
                )}
                {defeatedEntities.map((entity) => (
                    <div key={entity.id} className="p-4 bg-slate-900/50 rounded-xl border border-slate-700 shadow-inner">
                        <div className="flex justify-between items-center mb-3">
                            <span className="font-bold text-slate-100">{entity.name}</span>
                            {entity.realm && (
                                <span className="text-[10px] text-yellow-500 font-mono bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">
                                    {entity.realm}
                                </span>
                            )}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={() => handleSelect(entity.id, 'kill')}
                                className={`py-2 text-xs font-black uppercase tracking-wider rounded-lg border transition-all ${
                                    dispositions[entity.id] === 'kill'
                                        ? 'bg-red-600 border-red-500 text-white shadow-[0_0_10px_rgba(220,38,38,0.5)]'
                                        : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
                                }`}
                            >
                                Kết Liễu
                            </button>
                            <button
                                onClick={() => handleSelect(entity.id, 'capture')}
                                className={`py-2 text-xs font-black uppercase tracking-wider rounded-lg border transition-all ${
                                    dispositions[entity.id] === 'capture'
                                        ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]'
                                        : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
                                }`}
                            >
                                Bắt Giữ
                            </button>
                            <button
                                onClick={() => handleSelect(entity.id, 'release')}
                                className={`py-2 text-xs font-black uppercase tracking-wider rounded-lg border transition-all ${
                                    dispositions[entity.id] === 'release'
                                        ? 'bg-green-600 border-green-500 text-white shadow-[0_0_10px_rgba(22,163,74,0.5)]'
                                        : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
                                }`}
                            >
                                Thả Đi
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-6 flex justify-end">
                <Button
                    onClick={() => onConfirm(dispositions)}
                    variant="primary"
                    className="!w-auto !px-10 !py-3 border-b-4 border-fuchsia-800 active:border-b-0 transition-all"
                    disabled={isLoading}
                >
                    {isLoading ? 'Đang Xử Lý...' : 'Xác Nhận'}
                </Button>
            </div>
        </Modal>
    );
};
