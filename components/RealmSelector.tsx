
import React, { useMemo } from 'react';

interface RealmSelectorProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  majorOptions: string[];
  minorOptions: string[];
  isSystemReady: boolean;
  labelClassName?: string;
}

const RealmSelector: React.FC<RealmSelectorProps> = ({
  label,
  value,
  onChange,
  majorOptions,
  minorOptions,
  isSystemReady,
  labelClassName = "text-slate-300"
}) => {
  // Logic to parse the current value into Major and Minor
  const { selectedMajor, selectedMinor } = useMemo(() => {
    if (!value || !isSystemReady) return { selectedMajor: '', selectedMinor: '' };

    // Try to match the beginning of the string with a major realm
    // Sort by length desc to match longer names first (e.g. "Trúc Cơ Hoàn Mỹ" before "Trúc Cơ")
    const sortedMajors = [...majorOptions].sort((a, b) => b.length - a.length);
    const foundMajor = sortedMajors.find(m => value.startsWith(m));

    if (foundMajor) {
      const remainder = value.slice(foundMajor.length).trim();
      return { selectedMajor: foundMajor, selectedMinor: remainder };
    }

    // Default or unknown format
    return { selectedMajor: '', selectedMinor: '' };
  }, [value, majorOptions, isSystemReady]);

  const handleMajorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMajor = e.target.value;
    // When major changes, try to keep minor, or default to first available
    const minorToUse = selectedMinor || (minorOptions.length > 0 ? minorOptions[0] : '');
    onChange(`${newMajor} ${minorToUse}`.trim());
  };

  const handleMinorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMinor = e.target.value;
    const majorToUse = selectedMajor || (majorOptions.length > 0 ? majorOptions[0] : '');
    onChange(`${majorToUse} ${newMinor}`.trim());
  };

  if (!isSystemReady) {
    return (
      <div className="mb-4">
        {label && <label className={`block text-sm font-medium mb-1 ${labelClassName}`}>{label}</label>}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="VD: Trúc Cơ Thất Trọng..."
          className="w-full bg-slate-900/70 border border-slate-700 rounded-md px-3 py-2 text-slate-200 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition placeholder:text-slate-500"
        />
        <p className="text-xs text-yellow-500 mt-1 italic">
          * Bấm "Thiết lập Hệ thống & Cập nhật Danh sách" ở mục Tu Luyện để dùng tính năng chọn nhanh.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-4">
      {label && <label className={`block text-sm font-medium mb-1 ${labelClassName}`}>{label}</label>}
      <div className="grid grid-cols-2 gap-2">
        <select
          value={selectedMajor}
          onChange={handleMajorChange}
          className="w-full bg-slate-900/70 border border-slate-700 rounded-md px-3 py-2 text-slate-200 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition"
        >
          <option value="">-- Đại Cảnh Giới --</option>
          {majorOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        
        <select
          value={selectedMinor}
          onChange={handleMinorChange}
          className="w-full bg-slate-900/70 border border-slate-700 rounded-md px-3 py-2 text-slate-200 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition"
        >
          <option value="">-- Tiểu Cảnh Giới --</option>
          {minorOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </div>
    </div>
  );
};

export default RealmSelector;
