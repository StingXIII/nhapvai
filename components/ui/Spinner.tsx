import React from 'react';

const Spinner: React.FC<{ text?: string }> = ({ text }) => {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="w-8 h-8 border-4 border-fuchsia-500 border-t-transparent rounded-full animate-spin"></div>
      {text && <p className="mt-2 text-slate-300 text-sm">{text}</p>}
    </div>
  );
};

export default Spinner;