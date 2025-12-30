import React from 'react';
import { PlayerStats } from '../../types';

interface StatsDisplayProps {
  stats: PlayerStats;
  title?: string;
}

interface StatBarProps {
  label: string;
  value: number;
  maxValue: number;
  colorClass: string;
}

const StatBar: React.FC<StatBarProps> = ({ label, value, maxValue, colorClass }) => {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
  
  const displayValue = Math.round(value ?? 0);
  const displayMaxValue = Math.round(maxValue ?? 0);

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1 text-xs font-semibold">
        <span className="text-slate-300">{label}</span>
        <span className="text-slate-400">{displayValue} / {displayMaxValue}</span>
      </div>
      <div className="w-full bg-slate-700 rounded-full h-5 relative overflow-hidden border border-slate-600">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${colorClass}`} 
          style={{ width: `${percentage}%` }}
        ></div>
        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white text-shadow-sm">
           {displayValue} / {displayMaxValue}
        </div>
      </div>
    </div>
  );
};

const AttributeDisplay: React.FC<{ label: string; value: number; icon: React.ReactNode }> = ({ label, value, icon }) => (
    <div className="flex flex-col items-center justify-center bg-slate-900/50 p-2 rounded-lg border border-slate-700">
        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold">
            {icon}
            <span>{label}</span>
        </div>
        <span className="font-bold text-lg text-white mt-1">{Math.round(value ?? 0)}</span>
    </div>
);


const StatsDisplay: React.FC<StatsDisplayProps> = ({ stats, title }) => {
  return (
    <div className="space-y-4">
      {title && <h3 className="text-lg font-semibold text-pink-300 border-b border-pink-500/30 pb-1 mb-4">{title}</h3>}
      
      <div className="bg-slate-900/50 p-3 rounded-md border border-slate-700">
        <p className="text-sm text-center">
          <strong className="text-slate-400 mr-2">Cảnh giới:</strong>
          <span className="font-bold text-lg text-yellow-400">{stats.realm || 'Phàm Nhân'}</span>
        </p>
      </div>

      <div className="space-y-4">
        <StatBar label="Sinh Lực" value={stats.sinhLuc} maxValue={stats.maxSinhLuc} colorClass="bg-gradient-to-r from-red-600 to-red-500" />
        <StatBar label="Linh Lực" value={stats.linhLuc || 0} maxValue={stats.maxLinhLuc || 0} colorClass="bg-gradient-to-r from-blue-600 to-blue-500" />
        <StatBar label="Kinh Nghiệm" value={stats.kinhNghiem} maxValue={stats.maxKinhNghiem} colorClass="bg-gradient-to-r from-yellow-500 to-amber-400" />
      </div>

      <div className="grid grid-cols-3 gap-3 pt-2">
         <AttributeDisplay label="Tấn Công" value={stats.sucTanCong} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>} />
         <AttributeDisplay label="Phòng Ngự" value={stats.sucPhongNhu} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 2a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>} />
         <AttributeDisplay label="Tốc Độ" value={stats.tocDo} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>} />
      </div>
       <style>{`
        .text-shadow-sm {
            text-shadow: 1px 1px 2px rgba(0,0,0,0.7);
        }
      `}</style>
    </div>
  );
};

export default StatsDisplay;
