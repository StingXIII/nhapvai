
import React from 'react';
import Button from './Button';
import Icon from './Icon';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmLabel = 'Xác Nhận', 
  cancelLabel = 'Hủy Bỏ',
  variant = 'danger'
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const iconName = variant === 'danger' ? 'trash' : (variant === 'warning' ? 'warning' : 'info');
  const iconColor = variant === 'danger' ? 'text-red-400' : (variant === 'warning' ? 'text-amber-400' : 'text-blue-400');
  const confirmBtnVariant = variant === 'danger' ? 'warning' : (variant === 'warning' ? 'special' : 'primary'); // Map variant to Button variant

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <div 
        className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl p-6 w-full max-w-md relative animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start mb-4">
            <div className={`flex-shrink-0 mr-3 ${iconColor}`}>
                <Icon name={iconName} className="w-8 h-8" />
            </div>
            <div>
                <h2 className={`text-xl font-bold ${iconColor}`}>{title}</h2>
                <div className="text-slate-300 mt-2 text-sm whitespace-pre-wrap leading-relaxed">
                    {message}
                </div>
            </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button 
            onClick={onClose} 
            className="px-4 py-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-700 transition text-sm font-medium"
          >
            {cancelLabel}
          </button>
          <Button
            onClick={handleConfirm}
            variant={confirmBtnVariant} // Use mapped variant
            className="!w-auto !py-2 !px-5 !text-sm"
          >
            {confirmLabel}
          </Button>
        </div>
        <style>{`
          @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in-up {
            animation: fade-in-up 0.2s ease-out forwards;
          }
        `}</style>
      </div>
    </div>
  );
};

export default ConfirmationModal;
