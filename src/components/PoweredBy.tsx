import React from 'react';

export const PoweredBy: React.FC = () => {
  return (
    <div className="fixed bottom-6 right-4 flex items-center gap-1 opacity-40 hover:opacity-90 transition-opacity">
      <span className="text-xs text-gray-400">Powered by</span>
      <img 
        src="https://i.imghippo.com/files/cri5480ziQ.png" 
        alt="Company Logo" 
        className="h-4 w-auto"
      />
    </div>
  );
};
