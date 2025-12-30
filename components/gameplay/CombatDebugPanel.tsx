
import React from 'react';

const CombatDebugPanel: React.FC = () => {
  return (
    <div className="fixed bottom-4 left-4 bg-black/80 p-2 rounded text-xs text-white z-50 pointer-events-none">
      Debug: Combat Active
    </div>
  );
};

export default CombatDebugPanel;
